const { getPool, sql } = require('../../infra/sql/pool');

/**
 * Get widget config by widgetId (UUID)
 */
const getWidgetConfig = async (widgetId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('widgetId', sql.UniqueIdentifier, widgetId)
    .query(`
      SELECT WidgetKey, Name, Status, AllowedDomains, Theme
      FROM iam.Widgets
      WHERE WidgetId = @widgetId
    `);
  return result.recordset[0];
};

/**
 * Get widget by SiteKey (public key)
 */
const getWidgetBySiteKey = async (siteKey) => {
  const pool = getPool();
  const result = await pool.request()
    .input('siteKey', sql.NVarChar, siteKey)
    .query(`
      SELECT WidgetKey, WidgetId, Name, Status, AllowedDomains, Theme, SiteKey
      FROM iam.Widgets
      WHERE SiteKey = @siteKey
    `);
  return result.recordset[0];
};

/**
 * Get or create conversation for a widget + visitor
 */
const getOrCreateConversation = async (widgetKey, visitorId) => {
  const pool = getPool();

  // First try to find existing open conversation
  const existingResult = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .query(`
      SELECT ConversationKey, ConversationId
      FROM iam.WidgetConversations
      WHERE WidgetKey = @widgetKey 
        AND VisitorId = @visitorId 
        AND Status = 1
    `);

  if (existingResult.recordset.length > 0) {
    return {
      conversationId: existingResult.recordset[0].ConversationId,
      created: false
    };
  }

  // Create new conversation
  const insertResult = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .query(`
      INSERT INTO iam.WidgetConversations (WidgetKey, VisitorId, Status)
      OUTPUT inserted.ConversationId
      VALUES (@widgetKey, @visitorId, 1)
    `);

  return {
    conversationId: insertResult.recordset[0].ConversationId,
    created: true
  };
};

/**
 * Get messages for a conversation
 */
const getMessages = async (conversationId, afterTimestamp = null) => {
  const pool = getPool();
  const request = pool.request()
    .input('conversationId', sql.NVarChar, conversationId);

  let query = `
    SELECT 
      MessageId as id,
      CASE SenderType WHEN 1 THEN 'visitor' ELSE 'agent' END as sender,
      Content as text,
      CreatedAt as createdAt
    FROM iam.WidgetMessages m
    INNER JOIN iam.WidgetConversations c ON m.ConversationKey = c.ConversationKey
    WHERE c.ConversationId = @conversationId
  `;

  if (afterTimestamp) {
    request.input('after', sql.DateTime2, new Date(afterTimestamp));
    query += ` AND m.CreatedAt > @after`;
  }

  query += ` ORDER BY m.CreatedAt ASC`;

  const result = await request.query(query);
  return result.recordset;
};

/**
 * Create message (supports both legacy and new approach)
 */
const createMessage = async (widgetKey, data) => {
  const pool = getPool();
  const { visitorId, content, conversationId, senderType = 1 } = data;

  let convKey;
  let convId;

  // If conversationId provided, use it directly
  if (conversationId) {
    const convResult = await pool.request()
      .input('conversationId', sql.NVarChar, conversationId)
      .query(`
        SELECT ConversationKey, ConversationId
        FROM iam.WidgetConversations
        WHERE ConversationId = @conversationId
      `);

    if (convResult.recordset.length === 0) {
      throw new Error('Conversation not found');
    }
    convKey = convResult.recordset[0].ConversationKey;
    convId = convResult.recordset[0].ConversationId;
  } else {
    // Legacy: MERGE to find or create conversation
    const req = pool.request()
      .input('widgetKey', sql.BigInt, widgetKey)
      .input('visitorId', sql.NVarChar, visitorId)
      .input('content', sql.NVarChar, content);

    const convResult = await req.query(`
      MERGE iam.WidgetConversations AS target
      USING (SELECT @widgetKey AS WidgetKey, @visitorId AS VisitorId) AS source
      ON target.WidgetKey = source.WidgetKey 
         AND target.VisitorId = source.VisitorId
         AND target.Status = 1
      WHEN MATCHED THEN
          UPDATE SET UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
          INSERT (WidgetKey, VisitorId, Status)
          VALUES (source.WidgetKey, source.VisitorId, 1)
      OUTPUT inserted.ConversationKey, inserted.ConversationId;
    `);

    convKey = convResult.recordset[0].ConversationKey;
    convId = convResult.recordset[0].ConversationId;
  }

  // Insert Message
  const msgResult = await pool.request()
    .input('conversationKey', sql.BigInt, convKey)
    .input('senderType', sql.TinyInt, senderType)
    .input('content', sql.NVarChar, content)
    .query(`
      INSERT INTO iam.WidgetMessages (ConversationKey, SenderType, Content)
      OUTPUT inserted.MessageId, inserted.CreatedAt
      VALUES (@conversationKey, @senderType, @content)
    `);

  return {
    conversationId: convId,
    messageId: msgResult.recordset[0].MessageId,
    createdAt: msgResult.recordset[0].CreatedAt
  };
};

/**
 * Send message using conversationId directly (for iframe widget)
 */
const sendMessage = async (conversationId, content, senderType = 1) => {
  const pool = getPool();

  // Get conversation key
  const convResult = await pool.request()
    .input('conversationId', sql.NVarChar, conversationId)
    .query(`
      SELECT ConversationKey
      FROM iam.WidgetConversations
      WHERE ConversationId = @conversationId
    `);

  if (convResult.recordset.length === 0) {
    throw new Error('Conversation not found');
  }

  const conversationKey = convResult.recordset[0].ConversationKey;

  const msgResult = await pool.request()
    .input('conversationKey', sql.BigInt, conversationKey)
    .input('senderType', sql.TinyInt, senderType)
    .input('content', sql.NVarChar, content)
    .query(`
      INSERT INTO iam.WidgetMessages (ConversationKey, SenderType, Content)
      OUTPUT inserted.MessageId, inserted.CreatedAt
      VALUES (@conversationKey, @senderType, @content)
    `);

  return {
    id: msgResult.recordset[0].MessageId,
    sender: senderType === 1 ? 'visitor' : 'agent',
    text: content,
    createdAt: msgResult.recordset[0].CreatedAt
  };
};

module.exports = {
  getWidgetConfig,
  getWidgetBySiteKey,
  getOrCreateConversation,
  getMessages,
  createMessage,
  sendMessage
};
