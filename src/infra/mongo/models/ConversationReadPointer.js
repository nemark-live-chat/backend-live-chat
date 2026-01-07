/**
 * ConversationReadPointer Model
 * Tracks read/seen state per user per conversation
 * Replaces the deprecated isRead boolean on messages
 * 
 * Benefits:
 * - Efficient unread count calculation: LastMessageSeq - lastSeenSeq
 * - No need to update individual messages when marking as read
 * - Supports multiple readers (agents) per conversation
 */
const mongoose = require('mongoose');

const conversationReadPointerSchema = new mongoose.Schema({
    // SQL conversation key
    conversationKey: {
        type: Number,
        required: true,
        index: true
    },
    // SQL membership key (agent/user in workspace)
    // For visitors, use a special value like -1 or store visitorId
    membershipKey: {
        type: Number,
        required: true,
        index: true
    },
    // Optional: visitor ID for visitor-side tracking
    visitorId: {
        type: String,
        default: null,
        sparse: true
    },
    // Last message seq delivered to client (received by socket/API)
    lastDeliveredSeq: {
        type: Number,
        default: 0
    },
    // Last message seq actually seen/read by user
    lastSeenSeq: {
        type: Number,
        default: 0
    }
}, {
    collection: 'conversationreadpointers',
    timestamps: true // createdAt, updatedAt
});

// Unique compound index: one pointer per (conversation, member)
conversationReadPointerSchema.index(
    { conversationKey: 1, membershipKey: 1 },
    { unique: true }
);

// Index for visitor-based lookups
conversationReadPointerSchema.index(
    { conversationKey: 1, visitorId: 1 },
    { sparse: true }
);

/**
 * Update the delivered pointer (message received by client)
 * Only updates if new seq is greater than current
 */
conversationReadPointerSchema.statics.updateDelivered = async function (
    conversationKey,
    membershipKey,
    seq
) {
    return this.findOneAndUpdate(
        {
            conversationKey,
            membershipKey,
            $or: [
                { lastDeliveredSeq: { $lt: seq } },
                { lastDeliveredSeq: { $exists: false } }
            ]
        },
        {
            $set: { lastDeliveredSeq: seq },
            $setOnInsert: { conversationKey, membershipKey, lastSeenSeq: 0 }
        },
        { upsert: true, new: true }
    );
};

/**
 * Update the seen pointer (user marked as read)
 * Also updates delivered if seen is greater
 */
conversationReadPointerSchema.statics.updateSeen = async function (
    conversationKey,
    membershipKey,
    seq
) {
    return this.findOneAndUpdate(
        { conversationKey, membershipKey },
        {
            $set: { lastSeenSeq: seq },
            $max: { lastDeliveredSeq: seq }, // delivered >= seen
            $setOnInsert: { conversationKey, membershipKey }
        },
        { upsert: true, new: true }
    );
};

/**
 * Get read pointer for a user in a conversation
 */
conversationReadPointerSchema.statics.getPointer = async function (
    conversationKey,
    membershipKey
) {
    return this.findOne({ conversationKey, membershipKey }).lean();
};

/**
 * Get read pointers for multiple conversations (for inbox unread counts)
 * @param {number} membershipKey - The user's membership key
 * @param {number[]} conversationKeys - Array of conversation keys
 * @returns {Object} Map of conversationKey -> { lastDeliveredSeq, lastSeenSeq }
 */
conversationReadPointerSchema.statics.getPointersForConversations = async function (
    membershipKey,
    conversationKeys
) {
    const pointers = await this.find({
        membershipKey,
        conversationKey: { $in: conversationKeys }
    }).lean();

    const result = {};
    pointers.forEach(p => {
        result[p.conversationKey] = {
            lastDeliveredSeq: p.lastDeliveredSeq,
            lastSeenSeq: p.lastSeenSeq
        };
    });
    return result;
};

/**
 * Calculate unread count for a conversation
 * @param {number} conversationKey 
 * @param {number} membershipKey 
 * @param {number} lastMessageSeq - From SQL WidgetConversations.LastMessageSeq
 * @returns {number} Unread count (0 if no pointer exists, assumes all read)
 */
conversationReadPointerSchema.statics.calculateUnread = async function (
    conversationKey,
    membershipKey,
    lastMessageSeq
) {
    const pointer = await this.findOne({ conversationKey, membershipKey }).lean();
    if (!pointer) return lastMessageSeq; // No pointer = nothing read
    return Math.max(0, lastMessageSeq - pointer.lastSeenSeq);
};

const ConversationReadPointer = mongoose.model('ConversationReadPointer', conversationReadPointerSchema);

module.exports = ConversationReadPointer;
