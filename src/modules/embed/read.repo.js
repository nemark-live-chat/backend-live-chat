const { getPool, sql } = require('../../infra/sql/pool');

/**
 * Upsert read state for a conversation and user
 * Marks the conversation as read up to the current visitor message count
 * @param {number} conversationKey 
 * @param {number} userKey 
 * @param {number} visitorMessageCount 
 */
const upsertReadState = async (conversationKey, userKey, visitorMessageCount) => {
    const pool = getPool();

    await pool.request()
        .input('conversationKey', sql.BigInt, conversationKey)
        .input('userKey', sql.BigInt, userKey)
        .input('count', sql.Int, visitorMessageCount)
        .query(`
      MERGE iam.WidgetConversationReads AS target
      USING (SELECT @conversationKey AS ConversationKey, @userKey AS UserKey) AS source
      ON (target.ConversationKey = source.ConversationKey AND target.UserKey = source.UserKey)
      WHEN MATCHED THEN
        UPDATE SET 
          LastReadVisitorCount = @count,
          LastReadAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (ConversationKey, UserKey, LastReadVisitorCount, LastReadAt)
        VALUES (@conversationKey, @userKey, @count, SYSUTCDATETIME());
    `);
};

module.exports = {
    upsertReadState
};
