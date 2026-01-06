/**
 * Message MongoDB Service
 * Handles all message operations using MongoDB
 * Optimized for high-volume and real-time messaging
 */
const ChatMessage = require('../../infra/mongo/models/ChatMessage');

/**
 * Create a new message
 * @param {number} conversationKey - SQL conversation key
 * @param {string} conversationId - Conversation UUID
 * @param {string} text - Message content
 * @param {number} senderType - 1=visitor, 2=agent, 3=system
 * @param {string} senderId - Sender identifier
 * @param {string} clientMsgId - Client-side message ID for deduplication
 * @returns {object} Created message info
 */
const createMessage = async (conversationKey, conversationId, text, senderType, senderId = null, clientMsgId = null) => {
    const message = await ChatMessage.create({
        conversationKey,
        conversationId,
        content: text,
        senderType,
        senderId,
        clientMsgId
    });

    return {
        messageId: message._id.toString(),
        createdAt: message.createdAt
    };
};

/**
 * Get messages for a conversation with pagination
 * @param {string} conversationId - Conversation UUID
 * @param {number} limit - Max messages to return
 * @param {string} before - Get messages before this timestamp (cursor)
 * @returns {array} Messages in chronological order
 */
const getMessages = async (conversationId, limit = 30, before = null) => {
    return ChatMessage.getMessages(conversationId, limit, before);
};

/**
 * Get the last message for a conversation
 * @param {string} conversationId - Conversation UUID
 * @returns {string|null} Last message content
 */
const getLastMessage = async (conversationId) => {
    return ChatMessage.getLastMessage(conversationId);
};

/**
 * Get message count for a conversation
 * @param {string} conversationId - Conversation UUID
 * @returns {number} Message count
 */
const getMessageCount = async (conversationId) => {
    return ChatMessage.getMessageCount(conversationId);
};

/**
 * Get last messages and counts for multiple conversations
 * Optimized for listing conversations with previews
 * @param {array} conversationIds - Array of conversation UUIDs
 * @returns {object} Map of conversationId -> { lastMessage, messageCount }
 */
const getConversationMessageInfo = async (conversationIds) => {
    if (!conversationIds || conversationIds.length === 0) {
        return {};
    }

    // Use aggregation for efficient batch query
    const [lastMessages, counts] = await Promise.all([
        // Get last message for each conversation
        ChatMessage.aggregate([
            { $match: { conversationId: { $in: conversationIds } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$conversationId',
                    lastMessage: { $first: '$content' },
                    lastMessageAt: { $first: '$createdAt' }
                }
            }
        ]),
        // Get message counts
        ChatMessage.aggregate([
            { $match: { conversationId: { $in: conversationIds } } },
            {
                $group: {
                    _id: '$conversationId',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    // Build result map
    const result = {};

    conversationIds.forEach(id => {
        result[id] = { lastMessage: null, messageCount: 0, lastMessageAt: null };
    });

    lastMessages.forEach(item => {
        if (result[item._id]) {
            result[item._id].lastMessage = item.lastMessage;
            result[item._id].lastMessageAt = item.lastMessageAt;
        }
    });

    counts.forEach(item => {
        if (result[item._id]) {
            result[item._id].messageCount = item.count;
        }
    });

    return result;
};

/**
 * Mark messages as read
 * @param {string} conversationId - Conversation UUID
 * @param {Date} upToDate - Mark messages up to this date as read
 */
const markMessagesRead = async (conversationId, upToDate = new Date()) => {
    await ChatMessage.updateMany(
        {
            conversationId,
            createdAt: { $lte: upToDate },
            isRead: false
        },
        { $set: { isRead: true } }
    );
};

module.exports = {
    createMessage,
    getMessages,
    getLastMessage,
    getMessageCount,
    getConversationMessageInfo,
    markMessagesRead
};
