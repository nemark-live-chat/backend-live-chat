const { getPool, sql } = require('../../infra/sql/pool');

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

const createMessage = async (widgetKey, data) => {
  const pool = getPool();
  const req = pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, data.visitorId)
    .input('content', sql.NVarChar, data.content);

  // 1. Find or Create Conversation
  // Minimal logic: reusing open conversation if exists
  const convResult = await req.query(`
    MERGE iam.WidgetConversations AS target
    USING (SELECT @widgetKey AS WidgetKey, @visitorId AS VisitorId) AS source
    ON target.WidgetKey = source.WidgetKey 
       AND target.VisitorId = source.VisitorId
       AND target.Status = 1 -- Open
    WHEN MATCHED THEN
        UPDATE SET UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (WidgetKey, VisitorId, Status)
        VALUES (source.WidgetKey, source.VisitorId, 1)
    OUTPUT inserted.ConversationKey, inserted.ConversationId;
  `);
  
  const conversation = convResult.recordset[0];

  // 2. Insert Message
  const msgResult = await pool.request()
    .input('conversationKey', sql.BigInt, conversation.ConversationKey)
    .input('senderType', sql.TinyInt, 1) // Visitor
    .input('content', sql.NVarChar, data.content)
    .query(`
      INSERT INTO iam.WidgetMessages (ConversationKey, SenderType, Content)
      OUTPUT inserted.MessageId, inserted.CreatedAt
      VALUES (@conversationKey, @senderType, @content)
    `);
    
  return {
    conversationId: conversation.ConversationId,
    messageId: msgResult.recordset[0].MessageId,
    createdAt: msgResult.recordset[0].CreatedAt
  };
};

module.exports = {
  getWidgetConfig,
  createMessage
};
