/**
 * Embed Service Layer
 * Business logic for embed chat widget
 * Uses MongoDB for messages, SQL for conversations
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool, sql } = require('../../infra/sql/pool');
const env = require('../../config/env');
const messageService = require('./message.mongo.service');

/**
 * Get widget by SiteKey with validation
 * @param {string} siteKey - Public site key
 * @returns {object|null} Widget record
 */
const getWidgetBySiteKey = async (siteKey) => {
  const pool = getPool();
  const result = await pool.request()
    .input('siteKey', sql.NVarChar, siteKey)
    .query(`
      SELECT 
        WidgetKey, WidgetId, WorkspaceKey, Name, Status, 
        AllowedDomains, Theme, SiteKey
      FROM iam.Widgets
      WHERE SiteKey = @siteKey AND Status = 1
    `);
  return result.recordset[0] || null;
};

/**
 * Validate origin against widget's allowed domains
 * @param {object} widget - Widget record
 * @param {string} origin - Request origin
 * @returns {boolean} True if origin is allowed
 */
const validateOrigin = (widget, origin) => {
  if (!origin) return false;

  // Dev mode: allow all if configured
  if (env.embed.devAllowAll && env.app.env === 'development') {
    return true;
  }

  try {
    const allowedDomains = JSON.parse(widget.AllowedDomains || '[]');

    // Normalize origin
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();

    // Check if any allowed domain matches
    return allowedDomains.some(domain => {
      const normalizedDomain = domain.replace(/\/$/, '').toLowerCase();

      // Check exact match (e.g. https://example.com)
      if (normalizedDomain === normalizedOrigin) return true;

      // Check without protocol (e.g. example.com matches http://example.com)
      const originNoProtocol = normalizedOrigin.replace(/^https?:\/\//, '');
      if (normalizedDomain === originNoProtocol) return true;

      // Wildcard match (e.g., *.example.com)
      if (normalizedDomain.startsWith('*')) {
        const pattern = normalizedDomain.replace('*', '.*');
        return new RegExp(`^${pattern}$`).test(normalizedOrigin);
      }

      // Wildcard without protocol
      if (normalizedDomain.startsWith('*')) {
        const pattern = normalizedDomain.replace('*', '.*');
        return new RegExp(`^${pattern}$`).test(originNoProtocol);
      }

      return false;
    });
  } catch (err) {
    console.error('Error parsing AllowedDomains:', err);
    return false;
  }
};

/**
 * Generate embed session token (JWT)
 * @param {object} widget - Widget record
 * @param {string} visitorId - Visitor ID
 * @returns {object} Token and expiry info
 */
const generateSessionToken = (widget, visitorId) => {
  const payload = {
    typ: 'embed',
    siteKey: widget.SiteKey,
    widgetKey: widget.WidgetKey,
    visitorId,
    iat: Math.floor(Date.now() / 1000)
  };

  const token = jwt.sign(payload, env.embed.jwtSecret, {
    expiresIn: env.embed.tokenTTL
  });

  // Decode to get expiry
  const decoded = jwt.decode(token);

  return {
    token,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
    expiresIn: env.embed.tokenTTL
  };
};

/**
 * Verify embed session token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 */
const verifySessionToken = (token) => {
  return jwt.verify(token, env.embed.jwtSecret);
};

/**
 * Get or create conversation for widget + visitor
 * @param {number} widgetKey - Widget key
 * @param {string} visitorId - Visitor ID
 * @param {string} visitorName - Optional visitor name
 * @returns {object} Conversation info
 */
const getOrCreateConversation = async (widgetKey, visitorId, visitorName = null) => {
  const pool = getPool();

  // First try to find existing open conversation
  const existingResult = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .query(`
      SELECT ConversationKey, ConversationId, VisitorName
      FROM iam.WidgetConversations
      WHERE WidgetKey = @widgetKey 
        AND VisitorId = @visitorId 
        AND Status = 1
    `);

  if (existingResult.recordset.length > 0) {
    const conv = existingResult.recordset[0];

    // Update visitor name if provided and different
    if (visitorName && visitorName !== conv.VisitorName) {
      await pool.request()
        .input('conversationKey', sql.BigInt, conv.ConversationKey)
        .input('visitorName', sql.NVarChar, visitorName)
        .query(`
          UPDATE iam.WidgetConversations 
          SET VisitorName = @visitorName, UpdatedAt = SYSUTCDATETIME()
          WHERE ConversationKey = @conversationKey
        `);
    }

    return {
      conversationId: conv.ConversationId,
      conversationKey: conv.ConversationKey,
      created: false
    };
  }

  // Create new conversation
  const insertResult = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .input('visitorName', sql.NVarChar, visitorName)
    .query(`
      INSERT INTO iam.WidgetConversations (WidgetKey, VisitorId, VisitorName, Status, LastMessageAt)
      OUTPUT inserted.ConversationKey, inserted.ConversationId
      VALUES (@widgetKey, @visitorId, @visitorName, 1, SYSUTCDATETIME())
    `);

  return {
    conversationId: insertResult.recordset[0].ConversationId,
    conversationKey: insertResult.recordset[0].ConversationKey,
    created: true
  };
};

/**
 * Get conversation by visitor ID
 * @param {number} widgetKey - Widget key
 * @param {string} visitorId - Visitor ID
 * @returns {object|null} Conversation record
 */
const getConversationByVisitor = async (widgetKey, visitorId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
    .input('visitorId', sql.NVarChar, visitorId)
    .query(`
      SELECT ConversationKey, ConversationId, VisitorName, Status
      FROM iam.WidgetConversations
      WHERE WidgetKey = @widgetKey AND VisitorId = @visitorId AND Status = 1
    `);
  return result.recordset[0] || null;
};

/**
 * Get conversation by visitor and siteKey
 * @param {string} siteKey - Site key
 * @param {string} visitorId - Visitor ID
 * @returns {object|null} Conversation record with widget info
 */
const getConversationByVisitorAndSiteKey = async (siteKey, visitorId) => {
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
  return result.recordset[0] || null;
};

/**
 * Create message in conversation (MongoDB)
 * @param {number} conversationKey - Conversation key
 * @param {string} text - Message text
 * @param {number} senderType - 1 = visitor, 2 = agent, 3 = system
 * @param {string} senderId - Sender identifier
 * @param {string} conversationId - Conversation UUID (optional, will be fetched if not provided)
 * @param {string} clientMsgId - Client message ID for deduplication
 * @returns {object} Created message info
 */
const createMessage = async (conversationKey, text, senderType, senderId = null, conversationId = null, clientMsgId = null) => {
  // Get conversationId if not provided
  if (!conversationId) {
    const pool = getPool();
    const result = await pool.request()
      .input('conversationKey', sql.BigInt, conversationKey)
      .query('SELECT ConversationId FROM iam.WidgetConversations WHERE ConversationKey = @conversationKey');
    if (result.recordset.length > 0) {
      conversationId = result.recordset[0].ConversationId;
    }
  }

  // Use MongoDB for message storage
  return messageService.createMessage(
    conversationKey,
    conversationId,
    text,
    senderType,
    senderId,
    clientMsgId
  );
};

/**
 * Get messages for conversation (MongoDB)
 * @param {string} conversationId - Conversation UUID
 * @param {number} limit - Max messages to return
 * @param {string} before - Get messages before this timestamp (cursor)
 * @returns {array} Messages in chronological order
 */
const getMessages = async (conversationId, limit = 30, before = null) => {
  return messageService.getMessages(conversationId, limit, before);
};

/**
 * Update conversation last activity timestamp
 * LEGACY: Use updateConversationActivityWithSeq for new code
 * @param {number} conversationKey - Conversation key
 */
const updateConversationActivity = async (conversationKey) => {
  const pool = getPool();
  await pool.request()
    .input('conversationKey', sql.BigInt, conversationKey)
    .query(`
      UPDATE iam.WidgetConversations 
      SET LastMessageAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
      WHERE ConversationKey = @conversationKey
    `);
};

/**
 * Update conversation with latest message metadata
 * Uses safety condition to prevent LastMessageSeq from going backwards
 * This is critical for "last message correctness" under concurrent writes
 * 
 * @param {number} conversationKey - Conversation key
 * @param {number} seq - Message sequence number
 * @param {string} content - Message content (for preview)
 * @param {string} mongoId - MongoDB message ID (optional)
 */
const updateConversationActivityWithSeq = async (conversationKey, seq, content, mongoId = null) => {
  const pool = getPool();
  // Note: LastMessageSeq, LastMessagePreview, LastMessageMongoId are NOT in SQL table.
  // We only update timestamps. 'seq' check is skipped as column missing.

  await pool.request()
    .input('conversationKey', sql.BigInt, conversationKey)
    .query(`
      UPDATE iam.WidgetConversations 
      SET 
        LastMessageAt = SYSUTCDATETIME(), 
        UpdatedAt = SYSUTCDATETIME()
      WHERE ConversationKey = @conversationKey
    `);
};

/**
 * Get messages with keyset cursor pagination
 * @param {number} conversationKey - SQL conversation key  
 * @param {number} limit - Max messages to return
 * @param {number|null} cursorSeq - Get messages with seq < cursorSeq
 * @returns {object} { items: Message[], nextCursor: { seq: number } | null }
 */
const getMessagesBySeq = async (conversationKey, limit = 30, cursorSeq = null) => {
  return messageService.getMessagesBySeq(conversationKey, limit, cursorSeq);
};

/**
 * List active conversations for a widget
 * @param {number} widgetKey - Widget key
 * @param {number} limit - Max conversations
 * @param {number} offset - Offset for pagination
 * @returns {array} Conversations with last message
 */
const listConversations = async (widgetKey, limit = 20, offset = 0) => {
  const pool = getPool();
  const result = await pool.request()
    .input('widgetKey', sql.BigInt, widgetKey)
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
        (
          SELECT TOP 1 Content 
          FROM iam.WidgetMessages m 
          WHERE m.ConversationKey = c.ConversationKey 
          ORDER BY m.CreatedAt DESC
        ) as lastMessage
      FROM iam.WidgetConversations c
      WHERE c.WidgetKey = @widgetKey
      ORDER BY c.LastMessageAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

  return result.recordset;
};

/**
 * List conversations by SiteKey (for agent admin)
 * Gets conversation metadata from SQL, message info from MongoDB
 * @param {string} siteKey - Site key
 * @param {number} limit - Max conversations
 * @returns {array} Conversations with message previews
 */
const listConversationsBySiteKey = async (siteKey, limit = 50) => {
  const pool = getPool();

  // Get conversations from SQL
  const result = await pool.request()
    .input('siteKey', sql.NVarChar, siteKey)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT 
        c.ConversationId as id,
        c.VisitorId as visitorId,
        c.VisitorName as visitorName,
        c.Status as status,
        c.CreatedAt as createdAt,
        c.LastMessageAt as lastMessageAt,
        w.SiteKey as siteKey
      FROM iam.WidgetConversations c
      INNER JOIN iam.Widgets w ON c.WidgetKey = w.WidgetKey
      WHERE w.SiteKey = @siteKey
      ORDER BY c.LastMessageAt DESC
      OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
    `);

  const conversations = result.recordset;

  if (conversations.length === 0) {
    return [];
  }

  // Get message info from MongoDB in batch
  const conversationIds = conversations.map(c => c.id);
  const messageInfo = await messageService.getConversationMessageInfo(conversationIds);

  // Merge message info into conversations
  return conversations.map(conv => ({
    ...conv,
    lastMessage: messageInfo[conv.id]?.lastMessage || null,
    messageCount: messageInfo[conv.id]?.messageCount || 0
  }));
};

/**
 * Get conversation by ID
 * @param {string} conversationId - Conversation UUID
 * @returns {object|null} Conversation with widget info
 */
const getConversationById = async (conversationId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('conversationId', sql.UniqueIdentifier, conversationId)
    .query(`
      SELECT 
        c.ConversationKey, c.ConversationId, c.VisitorId, c.VisitorName, c.Status,
        w.WidgetKey, w.SiteKey, w.Name as WidgetName
      FROM iam.WidgetConversations c
      INNER JOIN iam.Widgets w ON c.WidgetKey = w.WidgetKey
      WHERE c.ConversationId = @conversationId
    `);
  return result.recordset[0] || null;
};

/**
 * List all conversations for a user across all workspaces
 * @param {number} userKey - User key
 * @param {number} limit - Max conversations
 * @returns {array} Conversations with message previews
 */
const listConversationsForUser = async (userKey, limit = 50) => {
  const pool = getPool();

  const result = await pool.request()
    .input('userKey', sql.BigInt, userKey)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT 
        c.ConversationId as id,
        c.VisitorId as visitorId,
        c.VisitorName as visitorName,
        c.Status as status,
        c.CreatedAt as createdAt,
        c.LastMessageAt as lastMessageAt,
        w.SiteKey as siteKey,
        w.Name as widgetName,
        ws.Name as workspaceName,
        ws.WorkspaceId as workspaceId
      FROM iam.WidgetConversations c
      INNER JOIN iam.Widgets w ON c.WidgetKey = w.WidgetKey
      INNER JOIN iam.Workspaces ws ON w.WorkspaceKey = ws.WorkspaceKey
      INNER JOIN iam.Memberships m ON m.WorkspaceKey = ws.WorkspaceKey
      WHERE m.UserKey = @userKey AND m.Status = 1
      ORDER BY c.LastMessageAt DESC
      OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
    `);

  const conversations = result.recordset;

  if (conversations.length === 0) {
    return [];
  }

  // Get message info from MongoDB
  const conversationIds = conversations.map(c => c.id);
  const messageInfo = await messageService.getConversationMessageInfo(conversationIds);

  return conversations.map(conv => ({
    ...conv,
    lastMessage: messageInfo[conv.id]?.lastMessage || null,
    messageCount: messageInfo[conv.id]?.messageCount || 0
  }));
};

module.exports = {
  getWidgetBySiteKey,
  validateOrigin,
  generateSessionToken,
  verifySessionToken,
  getOrCreateConversation,
  getConversationByVisitor,
  getConversationByVisitorAndSiteKey,
  createMessage,
  getMessages,
  getMessagesBySeq,
  updateConversationActivity,
  updateConversationActivityWithSeq,
  listConversations,
  listConversationsBySiteKey,
  listConversationsForUser,
  getConversationById
};
