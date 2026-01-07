/**
 * Message MongoDB Service
 * Handles all message operations using MongoDB
 * Optimized for high-volume and real-time messaging
 * 
 * Key features:
 * - Atomic seq allocation for consistent ordering
 * - Deduplication via clientMsgId (idempotent creates)
 * - Keyset cursor pagination (no skip/offset)
 */
const ChatMessage = require('../../infra/mongo/models/ChatMessage');
const ConversationCounter = require('../../infra/mongo/models/ConversationCounter');

/**
 * Create a new message with atomic sequence allocation
 * Handles deduplication via clientMsgId unique constraint
 * 
 * @param {number} conversationKey - SQL conversation key
 * @param {string} conversationId - Conversation UUID
 * @param {string} text - Message content
 * @param {number} senderType - 1=visitor, 2=agent, 3=system
 * @param {string} senderId - Sender identifier
 * @param {string} clientMsgId - Client-side message ID for deduplication
 * @returns {object} Created message info with seq
 */
const createMessage = async (conversationKey, conversationId, text, senderType, senderId = null, clientMsgId = null) => {
    // 1. Check for duplicate if clientMsgId provided
    if (clientMsgId) {
        const existing = await ChatMessage.findByClientMsgId(conversationKey, clientMsgId);
        if (existing) {
            // Idempotent: return existing message
            return {
                messageId: existing.id,
                seq: existing.seq,
                content: existing.content,
                senderType: existing.senderType,
                senderId: existing.senderId,
                createdAt: existing.createdAt,
                clientMsgId: existing.clientMsgId,
                isDuplicate: true
            };
        }
    }

    // 2. Allocate atomic sequence number
    const seq = await ConversationCounter.allocateSeq(conversationKey);

    try {
        // 3. Create message with allocated seq
        const message = await ChatMessage.create({
            conversationKey,
            conversationId,
            seq,
            content: text,
            senderType,
            senderId,
            clientMsgId: clientMsgId || undefined
        });

        return {
            messageId: message._id.toString(),
            seq: message.seq,
            content: message.content,
            senderType: message.senderType,
            senderId: message.senderId,
            createdAt: message.createdAt,
            clientMsgId: message.clientMsgId,
            isDuplicate: false
        };
    } catch (err) {
        // 4. Handle duplicate key error from unique index
        // This can happen in race condition where two requests with same clientMsgId
        // pass the initial check but one fails at insert
        if (err.code === 11000 && clientMsgId) {
            const existing = await ChatMessage.findByClientMsgId(conversationKey, clientMsgId);
            if (existing) {
                return {
                    messageId: existing.id,
                    seq: existing.seq,
                    content: existing.content,
                    senderType: existing.senderType,
                    senderId: existing.senderId,
                    createdAt: existing.createdAt,
                    clientMsgId: existing.clientMsgId,
                    isDuplicate: true
                };
            }
        }
        throw err;
    }
};

/**
 * Get messages with keyset cursor pagination (PRIMARY METHOD)
 * Uses seq for stable ordering under concurrent writes
 * 
 * @param {number} conversationKey - SQL conversation key
 * @param {number} limit - Max messages to return
 * @param {number|null} cursorSeq - Get messages with seq < cursorSeq
 * @returns {object} { items: Message[], nextCursor: { seq: number } | null }
 */
const getMessagesBySeq = async (conversationKey, limit = 30, cursorSeq = null) => {
    return ChatMessage.getMessagesBySeq(conversationKey, limit, cursorSeq);
};

/**
 * LEGACY: Get messages with timestamp pagination
 * Kept for backward compatibility
 * 
 * @param {string} conversationId - Conversation UUID
 * @param {number} limit - Max messages to return
 * @param {string} before - Get messages before this timestamp (cursor)
 * @returns {array} Messages in chronological order
 */
const getMessages = async (conversationId, limit = 30, before = null) => {
    return ChatMessage.getMessages(conversationId, limit, before);
};

/**
 * Get the last message for a conversation (by seq)
 * @param {number} conversationKey - SQL conversation key
 * @returns {object|null} Last message info
 */
const getLastMessageByKey = async (conversationKey) => {
    return ChatMessage.getLastMessageByKey(conversationKey);
};

/**
 * LEGACY: Get the last message content for a conversation
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
        // Get last message for each conversation (by seq for accuracy)
        ChatMessage.aggregate([
            { $match: { conversationId: { $in: conversationIds } } },
            { $sort: { seq: -1 } },
            {
                $group: {
                    _id: '$conversationId',
                    lastMessage: { $first: '$content' },
                    lastMessageAt: { $first: '$createdAt' },
                    lastMessageSeq: { $first: '$seq' }
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
        result[id] = { lastMessage: null, messageCount: 0, lastMessageAt: null, lastMessageSeq: null };
    });

    lastMessages.forEach(item => {
        if (result[item._id]) {
            result[item._id].lastMessage = item.lastMessage;
            result[item._id].lastMessageAt = item.lastMessageAt;
            result[item._id].lastMessageSeq = item.lastMessageSeq;
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
 * @deprecated Use ConversationReadPointer instead
 * Mark messages as read (legacy boolean approach)
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

/**
 * Get current sequence number for a conversation (for debugging)
 * @param {number} conversationKey
 * @returns {number} Current seq
 */
const getCurrentSeq = async (conversationKey) => {
    return ConversationCounter.getCurrentSeq(conversationKey);
};

module.exports = {
    createMessage,
    getMessagesBySeq,
    getMessages,
    getLastMessageByKey,
    getLastMessage,
    getMessageCount,
    getConversationMessageInfo,
    markMessagesRead,
    getCurrentSeq
};
