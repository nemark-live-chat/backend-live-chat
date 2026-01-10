const { getPool, sql } = require('../../infra/sql/pool');

/**
 * List conversations for a user with Unread Counts and Message Metadata
 * @param {number} userKey - User key
 * @param {number} limit - Pagination limit
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} List of conversations
 */
const listConversationsForUser = async (userKey, limit = 50, offset = 0) => {
  const pool = getPool();

  const result = await pool.request()
    .input('userKey', sql.BigInt, userKey)
    .input('limit', sql.Int, limit)
    .input('offset', sql.Int, offset)
    .query(`
      SELECT 
        c.ConversationId as id,
        c.VisitorId as visitorId,
        c.VisitorName as visitorName,
        c.Status as status,
        c.CreatedAt as createdAt,
        c.LastMessageAt as lastMessageAt,
        c.SourceUrl as domain,
        c.LastMessagePreview as lastMessagePreview,
        c.MessageCount as messageCount,
        -- Unread Count Calculation: max(0, VisitorMsgCount - LastReadCount)
        CASE 
          WHEN (c.VisitorMessageCount - ISNULL(r.LastReadVisitorCount, 0)) < 0 THEN 0
          ELSE (c.VisitorMessageCount - ISNULL(r.LastReadVisitorCount, 0))
        END as unreadCount,
        w.SiteKey as siteKey,
        w.Name as widgetName,
        ws.Name as workspaceName,
        ws.WorkspaceId as workspaceId
      FROM iam.WidgetConversations c
      INNER JOIN iam.Widgets w ON c.WidgetKey = w.WidgetKey
      INNER JOIN iam.Workspaces ws ON w.WorkspaceKey = ws.WorkspaceKey
      INNER JOIN iam.Memberships m ON m.WorkspaceKey = ws.WorkspaceKey
      -- Join Read State
      LEFT JOIN iam.WidgetConversationReads r 
        ON c.ConversationKey = r.ConversationKey AND r.UserKey = @userKey
      WHERE m.UserKey = @userKey AND m.Status = 1
      ORDER BY c.LastMessageAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

  return result.recordset;
};

/**
 * Get conversation by ID
 * @param {string} conversationId 
 */
const getConversationById = async (conversationId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('conversationId', sql.NVarChar, conversationId)
    .query(`
      SELECT 
        c.ConversationKey, c.ConversationId, c.VisitorId, c.VisitorMessageCount, c.WidgetKey
      FROM iam.WidgetConversations c
      WHERE c.ConversationId = @conversationId
    `);
  return result.recordset[0];
};

/**
 * Update conversation activity and counts
 * @param {number} conversationKey 
 * @param {object} updates - { seq, preview, mongoId, isVisitor }
 */
const updateConversationSummary = async (conversationKey, updates) => {
  const pool = getPool();
  const { seq, preview, mongoId, isVisitor } = updates;

  const request = pool.request()
    .input('conversationKey', sql.BigInt, conversationKey)
    .input('seq', sql.Int, seq)
    .input('preview', sql.NVarChar, preview)
    .input('mongoId', sql.NVarChar, mongoId);

  // Dynamic Visitors Count increment
  const visitorCountSql = isVisitor ? 'VisitorMessageCount = VisitorMessageCount + 1,' : '';

  await request.query(`
    UPDATE iam.WidgetConversations 
    SET 
      LastMessageAt = SYSUTCDATETIME(), 
      UpdatedAt = SYSUTCDATETIME(),
      MessageCount = MessageCount + 1,
      ${visitorCountSql}
      LastMessageSeq = @seq,
      LastMessagePreview = @preview,
      LastMessageMongoId = @mongoId
    WHERE ConversationKey = @conversationKey
  `);
};



/**
 * Find active conversation by visitor ID
 */
const findActiveByVisitor = async (widgetKey, visitorId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .query(`
      SELECT ConversationKey, ConversationId, VisitorName, Status, SourceUrl
      FROM iam.WidgetConversations
      WHERE WidgetKey = @widgetKey AND VisitorId = @visitorId AND Status = 1
    `);
  return result.recordset[0];
};

/**
 * Find active conversation by Visitor & SiteKey (with Widget info)
 */
const findActiveByVisitorAndSiteKey = async (siteKey, visitorId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('siteKey', sql.NVarChar, siteKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .query(`
      SELECT c.ConversationKey, c.ConversationId, c.VisitorName, c.Status,
             w.WidgetKey, w.SiteKey
      FROM iam.WidgetConversations c
      INNER JOIN iam.Widgets w ON c.WidgetKey = w.WidgetKey
      WHERE w.SiteKey = @siteKey AND c.VisitorId = @visitorId AND c.Status = 1
    `);
  return result.recordset[0];
};

/**
 * Create new conversation
 */
const createConversation = async ({ widgetKey, visitorId, visitorName, sourceUrl }) => {
  const pool = getPool();
  const result = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .input('visitorName', sql.NVarChar, visitorName)
    .input('sourceUrl', sql.NVarChar, sourceUrl)
    .query(`
      INSERT INTO iam.WidgetConversations (WidgetKey, VisitorId, VisitorName, Status, LastMessageAt, SourceUrl, MessageCount, VisitorMessageCount)
      OUTPUT inserted.ConversationKey, inserted.ConversationId
      VALUES (@widgetKey, @visitorId, @visitorName, 1, SYSUTCDATETIME(), @sourceUrl, 0, 0)
    `);
  return result.recordset[0];
};

/**
 * Update basic metadata (VisitorName, SourceUrl)
 */
const updateConversationMetadata = async (conversationKey, { visitorName, sourceUrl }) => {
  const pool = getPool();
  const request = pool.request()
    .input('conversationKey', sql.BigInt, conversationKey);

  let updates = ['UpdatedAt = SYSUTCDATETIME()'];

  if (visitorName) {
    updates.push('VisitorName = @visitorName');
    request.input('visitorName', sql.NVarChar, visitorName);
  }
  if (sourceUrl) {
    updates.push('SourceUrl = @sourceUrl');
    request.input('sourceUrl', sql.NVarChar, sourceUrl);
  }

  await request.query(`
    UPDATE iam.WidgetConversations 
    SET ${updates.join(', ')}
    WHERE ConversationKey = @conversationKey
  `);
};

module.exports = {
  listConversationsForUser,
  getConversationById,
  updateConversationSummary,
  findActiveByVisitor,
  createConversation,
  updateConversationMetadata,
  findActiveByVisitorAndSiteKey
};
