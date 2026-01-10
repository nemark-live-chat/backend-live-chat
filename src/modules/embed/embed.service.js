/**
 * Embed Service Layer
 * REFACTORED: Uses Repository Pattern (SQL) + MongoDB for Content
 */
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');

// Repositories
const conversationRepo = require('./conversation.repo');
const messageRepo = require('./message.repo');
const readRepo = require('./read.repo');
const widgetRepo = require('./widget.repo');

// Services
const messageService = require('./message.mongo.service');

/**
 * Get widget by SiteKey with validation
 */
const getWidgetBySiteKey = async (siteKey) => {
  return widgetRepo.getWidgetBySiteKey(siteKey);
};

/**
 * Validate origin against widget's allowed domains
 */
const validateOrigin = (widget, origin) => {
  if (!origin) return false;
  if (env.embed.devAllowAll && env.app.env === 'development') return true;

  try {
    const allowedDomains = JSON.parse(widget.AllowedDomains || '[]');
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();

    return allowedDomains.some(domain => {
      const normalizedDomain = domain.replace(/\/$/, '').toLowerCase();
      if (normalizedDomain === normalizedOrigin) return true;
      const originNoProtocol = normalizedOrigin.replace(/^https?:\/\//, '');
      if (normalizedDomain === originNoProtocol) return true;

      if (normalizedDomain.startsWith('*')) {
        const pattern = normalizedDomain.replace('*', '.*');
        return new RegExp(`^${pattern}$`).test(normalizedOrigin) ||
          new RegExp(`^${pattern}$`).test(originNoProtocol);
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

  const decoded = jwt.decode(token);
  return {
    token,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
    expiresIn: env.embed.tokenTTL
  };
};

/**
 * Verify embed session token
 */
const verifySessionToken = (token) => {
  return jwt.verify(token, env.embed.jwtSecret);
};

/**
 * Get or create conversation for widget + visitor
 */
const getOrCreateConversation = async (widgetKey, visitorId, visitorName = null, sourceUrl = null) => {
  // Check existing active conversation
  const existing = await conversationRepo.findActiveByVisitor(widgetKey, visitorId);

  if (existing) {
    // Update metadata if needed
    if ((visitorName && visitorName !== existing.VisitorName) || (sourceUrl && sourceUrl !== existing.SourceUrl)) {
      await conversationRepo.updateConversationMetadata(existing.ConversationKey, { visitorName, sourceUrl });
    }
    return {
      conversationId: existing.ConversationId,
      conversationKey: existing.ConversationKey,
      created: false
    };
  }

  // Create new
  const newConv = await conversationRepo.createConversation({
    widgetKey, visitorId, visitorName, sourceUrl
  });

  return {
    conversationId: newConv.ConversationId,
    conversationKey: newConv.ConversationKey,
    created: true
  };
};

/**
 * Create message (Syncs to MongoDB and SQL)
 */
const createMessage = async (conversationKey, text, senderType, senderId = null, conversationId = null, clientMsgId = null) => {
  // 1. Resolve conversationId if missing
  // If not passed, lookup not performed here. Caller should ensure logic.

  // 2. Save to MongoDB (Content Source)
  const mongoMsg = await messageService.createMessage(
    conversationKey, conversationId, text, senderType, senderId, clientMsgId
  );

  // 3. Save to SQL (Metadata/Summary Source)
  const sqlMsg = await messageRepo.createMessage({
    conversationKey,
    senderType,
    content: text
  });

  console.log('[EmbedService] SQL Message Created:', sqlMsg);

  if (!sqlMsg || !sqlMsg.MessageKey) {
    console.error('[EmbedService] Failed to get MessageKey from SQL insert. Using fallback 0.');
    // This avoids crashing but indicates DB issue.
  }

  // Use MessageKey (BIGINT IDENTITY) as seq, not MessageId (GUID)
  const seqId = parseInt(sqlMsg?.MessageKey, 10) || 0;

  // 4. Update Conversation Summary
  await conversationRepo.updateConversationSummary(conversationKey, {
    seq: seqId,
    preview: text,
    mongoId: mongoMsg.id,
    isVisitor: senderType === 1
  });

  // 5. Invalidate Cache (Legacy: Not needed as Redis removed)

  return {
    ...mongoMsg,
    seq: seqId,
    messageId: sqlMsg?.MessageId
  };
};

/**
 * Get messages by sequence (Infinite Scroll support)
 * Uses SQL Repository
 */
const getMessagesBySeq = async (conversationId, limit = 30, cursorSeq = null) => {
  // Need Conversation Key first
  const conv = await conversationRepo.getConversationById(conversationId);
  if (!conv) throw new AppError('Conversation not found', 404);

  const messages = await messageRepo.listMessagesBySeq(conv.ConversationKey, limit, cursorSeq);

  // Return structure expected by Controller
  const items = messages;
  const nextCursor = items.length > 0 ? items[0].seq : null;

  return {
    items,
    nextCursor
  };
};

/**
 * List conversations for User (Unified Inbox)
 * Uses SQL Repo with Unread Counts
 */
const listConversationsForUser = async (userKey, limit = 50) => {
  return conversationRepo.listConversationsForUser(userKey, limit);
};

/**
 * Get messages (Legacy Support)
 */
const getMessages = async (conversationId, limit = 50, before = null) => {
  const conv = await conversationRepo.getConversationById(conversationId);
  if (!conv) throw new AppError('Conversation not found', 404);

  // Use new Repo but return flat array
  return messageRepo.listMessagesBySeq(conv.ConversationKey, limit, before);
};

/**
 * Mark conversation as read
 */
const markConversationRead = async (conversationId, userKey) => {
  const conv = await conversationRepo.getConversationById(conversationId);
  if (!conv) throw new AppError('Conversation not found', 404);

  // Set LastReadVisitorCount to current VisitorMessageCount
  await readRepo.upsertReadState(conv.ConversationKey, userKey, conv.VisitorMessageCount);

  return {
    success: true
  };
};

/**
 * Get Conversation by ID (Direct Repo Call)
 */
const getConversationById = async (conversationId) => conversationRepo.getConversationById(conversationId);

// Legacy Helpers (Proxy to Repo)
const getConversationByVisitor = async (widgetKey, visitorId) => conversationRepo.findActiveByVisitor(widgetKey, visitorId);

const getConversationByVisitorAndSiteKey = async (siteKey, visitorId) => conversationRepo.findActiveByVisitorAndSiteKey(siteKey, visitorId);

/**
 * Update conversation activity with seq safety (async, for socket handlers)
 * Wrapper for updateConversationSummary that handles errors gracefully
 */
const updateConversationActivityWithSeq = async (conversationKey, seq, preview, messageId) => {
  try {
    await conversationRepo.updateConversationSummary(conversationKey, {
      seq: parseInt(seq, 10) || 0,
      preview: preview,
      mongoId: messageId,
      isVisitor: false // Called after message already created, don't increment again
    });
  } catch (err) {
    console.error('[EmbedService] Failed to update conversation activity:', err);
  }
};

// Export
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
  getConversationById,
  listConversationsForUser,
  markConversationRead,
  updateConversationActivityWithSeq
};
