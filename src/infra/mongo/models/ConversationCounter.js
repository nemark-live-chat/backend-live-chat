/**
 * ConversationCounter Model
 * Atomic sequence number generator for chat messages
 * Ensures consistent ordering even under high concurrency
 */
const mongoose = require('mongoose');

const conversationCounterSchema = new mongoose.Schema({
    // SQL conversation key (links to iam.WidgetConversations)
    conversationKey: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    // Next sequence number to allocate
    nextSeq: {
        type: Number,
        default: 0
    }
}, {
    collection: 'conversationcounters',
    timestamps: false // No need for timestamps on counter
});

/**
 * Atomically allocate the next sequence number for a conversation
 * Uses findOneAndUpdate with $inc to ensure atomic increment
 * 
 * @param {number} conversationKey - The SQL conversation key
 * @returns {Promise<number>} The allocated sequence number
 */
conversationCounterSchema.statics.allocateSeq = async function (conversationKey) {
    const result = await this.findOneAndUpdate(
        { conversationKey },
        { $inc: { nextSeq: 1 } },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );
    return result.nextSeq;
};

/**
 * Get current sequence without incrementing (for debugging/monitoring)
 * @param {number} conversationKey - The SQL conversation key
 * @returns {Promise<number>} Current sequence number (0 if not exists)
 */
conversationCounterSchema.statics.getCurrentSeq = async function (conversationKey) {
    const result = await this.findOne({ conversationKey });
    return result ? result.nextSeq : 0;
};

/**
 * Batch allocate multiple sequences (for bulk import scenarios)
 * @param {number} conversationKey - The SQL conversation key
 * @param {number} count - Number of sequences to allocate
 * @returns {Promise<{start: number, end: number}>} Range of allocated sequences
 */
conversationCounterSchema.statics.allocateSeqBatch = async function (conversationKey, count) {
    const result = await this.findOneAndUpdate(
        { conversationKey },
        { $inc: { nextSeq: count } },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );
    return {
        start: result.nextSeq - count + 1,
        end: result.nextSeq
    };
};

const ConversationCounter = mongoose.model('ConversationCounter', conversationCounterSchema);

module.exports = ConversationCounter;
