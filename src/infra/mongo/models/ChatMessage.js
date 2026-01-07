/**
 * ChatMessage Model
 * MongoDB schema for chat messages
 * Optimized for high-volume message storage and retrieval
 * 
 * Key features:
 * - seq: Atomic sequence number for consistent ordering
 * - clientMsgId: Unique per conversation for deduplication
 * - Keyset cursor pagination via seq (no skip/offset)
 */
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    // Link to SQL conversation
    conversationId: {
        type: String,
        required: true,
        index: true
    },
    conversationKey: {
        type: Number,
        required: true,
        index: true
    },
    // Sequence number for ordering (atomic, never gaps when concurrent)
    // Optional for backward compatibility with messages created before this feature
    seq: {
        type: Number,
        required: false, // Not required for backward compatibility
        default: null,
        index: true
    },
    // Message content
    senderType: {
        type: Number,
        required: true,
        enum: [1, 2, 3], // 1=visitor, 2=agent, 3=system
    },
    senderId: {
        type: String,
        default: null
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    // Metadata
    clientMsgId: {
        type: String,
        unique: false, // Explicitly false here, index handles uniqueness
        required: false
    },
    // DEPRECATED: Use ConversationReadPointer instead
    // Kept for backward compatibility during migration
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'chatmessages'
});

// ============================================
// INDEXES
// ============================================

// Primary timeline index: for loading message history with cursor pagination
// Sort by seq DESC for "load older" pagination
chatMessageSchema.index({ conversationKey: 1, seq: -1 });

// Fallback index: for legacy queries using createdAt
chatMessageSchema.index({ conversationKey: 1, createdAt: -1, _id: -1 });

// Deduplication index: unique clientMsgId per conversation
// sparse: allows null clientMsgId values
chatMessageSchema.index(
    { conversationKey: 1, clientMsgId: 1 },
    { unique: true, sparse: true }
);

// Legacy index: for queries using conversationId (UUID)
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

// Virtual for sender type as string
chatMessageSchema.virtual('senderTypeString').get(function () {
    const types = { 1: 'visitor', 2: 'agent', 3: 'system' };
    return types[this.senderType] || 'unknown';
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get messages with keyset cursor pagination using seq
 * This is the PRIMARY method for loading message history
 * 
 * @param {number} conversationKey - SQL conversation key
 * @param {number} limit - Max messages to return (default 30)
 * @param {number|null} cursorSeq - Get messages with seq < cursorSeq (for "load older")
 * @returns {Object} { items: Message[], nextCursor: { seq: number } | null }
 */
chatMessageSchema.statics.getMessagesBySeq = async function (conversationKey, limit = 30, cursorSeq = null) {
    const query = { conversationKey };

    if (cursorSeq !== null && cursorSeq !== undefined) {
        query.seq = { $lt: cursorSeq };
    }

    const messages = await this.find(query)
        .sort({ seq: -1 }) // Newest first for pagination
        .limit(limit)
        .lean();

    // Determine next cursor (oldest message in this page)
    let nextCursor = null;
    if (messages.length > 0) {
        const oldestSeq = messages[messages.length - 1].seq;
        // Check if there are more messages
        const hasMore = await this.exists({
            conversationKey,
            seq: { $lt: oldestSeq }
        });
        if (hasMore) {
            nextCursor = { seq: oldestSeq };
        }
    }

    // Return in chronological order (oldest first)
    const items = messages.reverse().map(msg => ({
        id: msg._id.toString(),
        seq: msg.seq,
        sender: msg.senderType === 1 ? 'visitor' : msg.senderType === 2 ? 'agent' : 'system',
        senderType: msg.senderType,
        text: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
        clientMsgId: msg.clientMsgId
    }));

    return { items, nextCursor };
};

/**
 * LEGACY: Get messages with timestamp-based pagination
 * Kept for backward compatibility
 * 
 * @param {string} conversationId - Conversation UUID
 * @param {number} limit - Max messages
 * @param {string|null} before - ISO timestamp cursor
 * @returns {Array} Messages in chronological order
 */
chatMessageSchema.statics.getMessages = async function (conversationId, limit = 30, before = null) {
    const query = { conversationId };

    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }

    const messages = await this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    // Return in chronological order
    return messages.reverse().map(msg => ({
        id: msg._id.toString(),
        seq: msg.seq,
        sender: msg.senderType === 1 ? 'visitor' : msg.senderType === 2 ? 'agent' : 'system',
        text: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
        clientMsgId: msg.clientMsgId
    }));
};

/**
 * Get the last message for a conversation (by seq)
 * @param {number} conversationKey - SQL conversation key
 * @returns {Object|null} Last message or null
 */
chatMessageSchema.statics.getLastMessageByKey = async function (conversationKey) {
    const msg = await this.findOne({ conversationKey })
        .sort({ seq: -1 })
        .lean();

    if (!msg) return null;

    return {
        id: msg._id.toString(),
        seq: msg.seq,
        content: msg.content,
        senderType: msg.senderType,
        createdAt: msg.createdAt
    };
};

/**
 * LEGACY: Get last message by conversationId
 */
chatMessageSchema.statics.getLastMessage = async function (conversationId) {
    const msg = await this.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .lean();

    return msg ? msg.content : null;
};

/**
 * Count messages in a conversation
 */
chatMessageSchema.statics.getMessageCount = async function (conversationId) {
    return this.countDocuments({ conversationId });
};

/**
 * Find message by clientMsgId (for deduplication check)
 * @param {number} conversationKey
 * @param {string} clientMsgId
 * @returns {Object|null} Existing message or null
 */
chatMessageSchema.statics.findByClientMsgId = async function (conversationKey, clientMsgId) {
    if (!clientMsgId) return null;

    const msg = await this.findOne({ conversationKey, clientMsgId }).lean();
    if (!msg) return null;

    return {
        id: msg._id.toString(),
        seq: msg.seq,
        content: msg.content,
        senderType: msg.senderType,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
        clientMsgId: msg.clientMsgId
    };
};

// Ensure virtuals are included when converting to JSON
chatMessageSchema.set('toJSON', { virtuals: true });
chatMessageSchema.set('toObject', { virtuals: true });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
