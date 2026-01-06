/**
 * ChatMessage Model
 * MongoDB schema for chat messages
 * Optimized for high-volume message storage and retrieval
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
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'chatmessages'
});

// Compound index for efficient message history queries
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

// Index for getting latest message per conversation
chatMessageSchema.index({ conversationKey: 1, createdAt: -1 });

// Virtual for sender type as string
chatMessageSchema.virtual('senderTypeString').get(function () {
    const types = { 1: 'visitor', 2: 'agent', 3: 'system' };
    return types[this.senderType] || 'unknown';
});

// Static method to get messages with pagination
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
        sender: msg.senderType === 1 ? 'visitor' : msg.senderType === 2 ? 'agent' : 'system',
        text: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
        clientMsgId: msg.clientMsgId
    }));
};

// Static method to get last message for a conversation
chatMessageSchema.statics.getLastMessage = async function (conversationId) {
    const msg = await this.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .lean();

    return msg ? msg.content : null;
};

// Static method to count messages
chatMessageSchema.statics.getMessageCount = async function (conversationId) {
    return this.countDocuments({ conversationId });
};

// Ensure virtuals are included when converting to JSON
chatMessageSchema.set('toJSON', { virtuals: true });
chatMessageSchema.set('toObject', { virtuals: true });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
