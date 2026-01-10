const { getPool, sql } = require('../../infra/sql/pool');

/**
 * Insert message into SQL (for syncing with Mongo)
 * @param {object} params
 */
const createMessage = async ({ conversationKey, senderType, content }) => {
  const pool = getPool();
  const result = await pool.request()
    .input('conversationKey', sql.BigInt, conversationKey)
    .input('senderType', sql.TinyInt, senderType)
    .input('content', sql.NVarChar, content)
    .query(`
      INSERT INTO iam.WidgetMessages (ConversationKey, SenderType, Content)
      OUTPUT inserted.MessageKey, inserted.MessageId, inserted.CreatedAt
      VALUES (@conversationKey, @senderType, @content)
    `);
  return result.recordset[0];
};

/**
 * Get messages with seq pagination
 * @param {number} conversationKey 
 * @param {number} limit 
 * @param {number|null} beforeSeq 
 */
const listMessagesBySeq = async (conversationKey, limit = 50, beforeSeq = null) => {
  const pool = getPool();
  let query = `
    SELECT TOP (@limit)
      MessageId as id,
      MessageKey as seq,
      CASE SenderType WHEN 1 THEN 'visitor' ELSE 'agent' END as sender,
      SenderType as senderType,
      Content as text,
      CreatedAt as createdAt
    FROM iam.WidgetMessages
    WHERE ConversationKey = @conversationKey
  `;

  if (beforeSeq) {
    query += ` AND MessageKey < @beforeSeq`;
  }

  query += ` ORDER BY MessageKey DESC`;

  const request = pool.request()
    .input('conversationKey', sql.BigInt, conversationKey)
    .input('limit', sql.Int, limit);

  if (beforeSeq) {
    request.input('beforeSeq', sql.BigInt, beforeSeq);
  }

  const result = await request.query(query);

  // Return reversed (ASC) for UI
  return result.recordset.reverse();
};

module.exports = {
  createMessage,
  listMessagesBySeq
};
