const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { getPool, sql } = require('../../infra/sql/pool');
const embedService = require('./embed.service');
const env = require('../../config/env');

// Configuration
const BACKEND_PUBLIC_URL = env.urls?.backend || process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001';
const FRONTEND_PUBLIC_URL = env.urls?.frontend || process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000';
const WIDGET_VERSION = '2.0.0';

// Cache for widget script
let widgetScriptCache = null;
let widgetScriptEtag = null;

// Load widget script from file
function loadWidgetScript() {
  const scriptPath = path.join(__dirname, 'widget.js');
  const content = fs.readFileSync(scriptPath, 'utf8');

  // Replace default URLs with environment values
  const processedContent = content
    .replace(/http:\/\/localhost:3001/g, BACKEND_PUBLIC_URL)
    .replace(/http:\/\/localhost:3000/g, FRONTEND_PUBLIC_URL);

  widgetScriptCache = processedContent;
  widgetScriptEtag = crypto.createHash('md5').update(processedContent).digest('hex');

  return { content: processedContent, etag: widgetScriptEtag };
}

// Simple minification (remove comments and extra whitespace)
function minifyScript(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
    .replace(/\/\/.*$/gm, '') // Line comments
    .replace(/\s+/g, ' ') // Multiple whitespace to single
    .replace(/\s*([{}();,:])\s*/g, '$1') // Remove space around punctuation
    .replace(/;\s*}/g, '}') // Remove trailing semicolons before }
    .trim();
}

/**
 * GET /embed/widget.js
 * Serve the widget loader script
 */
const getWidgetScript = (req, res) => {
  try {
    // Load script if not cached or in development
    if (!widgetScriptCache || process.env.NODE_ENV === 'development') {
      loadWidgetScript();
    }

    // Check If-None-Match for caching
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === `"${widgetScriptEtag}"`) {
      return res.status(304).end();
    }

    // Set headers
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // 1 day
      'ETag': `"${widgetScriptEtag}"`,
      'X-Widget-Version': WIDGET_VERSION,
      'Access-Control-Allow-Origin': '*'
    });

    res.send(widgetScriptCache);
  } catch (err) {
    console.error('Error serving widget script:', err);
    res.status(500).send('// Widget script error');
  }
};

/**
 * GET /embed/widget.min.js
 * Serve minified widget script
 */
const getWidgetScriptMinified = (req, res) => {
  try {
    if (!widgetScriptCache || process.env.NODE_ENV === 'development') {
      loadWidgetScript();
    }

    const minified = minifyScript(widgetScriptCache);
    const minEtag = crypto.createHash('md5').update(minified).digest('hex');

    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === `"${minEtag}"`) {
      return res.status(304).end();
    }

    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=604800', // 7 days
      'ETag': `"${minEtag}"`,
      'X-Widget-Version': WIDGET_VERSION,
      'Access-Control-Allow-Origin': '*'
    });

    res.send(minified);
  } catch (err) {
    console.error('Error serving minified widget script:', err);
    res.status(500).send('// Widget script error');
  }
};

/**
 * GET /embed/snippet?siteKey=xxx
 * Generate embed snippet JSON
 */
const getSnippet = asyncHandler(async (req, res) => {
  const { siteKey } = req.query;

  if (!siteKey) {
    throw new AppError('siteKey is required', 400);
  }

  // Validate siteKey exists
  const widget = await embedService.getWidgetBySiteKey(siteKey);
  if (!widget) {
    throw new AppError('Widget not found', 404);
  }

  const scriptUrl = `${BACKEND_PUBLIC_URL}/api/embed/widget.js`;
  const snippet = `<script async src="${scriptUrl}" data-site-key="${siteKey}" data-api-base="${BACKEND_PUBLIC_URL}"></script>`;

  res.status(200).json({
    status: 'success',
    data: {
      siteKey,
      scriptUrl,
      snippet,
      version: WIDGET_VERSION
    }
  });
});

/**
 * GET /embed/snippet/preview?siteKey=xxx
 * HTML preview page with copy box and live demo
 */
const getSnippetPreview = asyncHandler(async (req, res) => {
  const { siteKey } = req.query;

  if (!siteKey) {
    throw new AppError('siteKey is required', 400);
  }

  const widget = await embedService.getWidgetBySiteKey(siteKey);
  if (!widget) {
    throw new AppError('Widget not found', 404);
  }

  const scriptUrl = `${BACKEND_PUBLIC_URL}/api/embed/widget.js`;
  const snippet = `<script async src="${scriptUrl}" data-site-key="${siteKey}" data-api-base="${BACKEND_PUBLIC_URL}"></script>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Embed Preview - ${widget.Name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #1f2937; margin-bottom: 8px; }
    p.subtitle { color: #6b7280; margin-bottom: 32px; }
    .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }
    .card h2 { color: #374151; font-size: 18px; margin-bottom: 16px; }
    .code-box { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; position: relative; }
    .copy-btn { position: absolute; top: 8px; right: 8px; background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .copy-btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Widget Embed Code</h1>
    <p class="subtitle">Widget: ${widget.Name}</p>
    <div class="card">
      <h2>📋 Copy this code</h2>
      <p style="color:#6b7280;margin-bottom:16px;font-size:14px;">Paste before the closing &lt;/body&gt; tag on your website.</p>
      <div class="code-box">
        <button class="copy-btn" onclick="copySnippet()">Copy</button>
        <code id="snippet">${snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
      </div>
    </div>
  </div>
  ${snippet}
  <script>
    function copySnippet() {
      navigator.clipboard.writeText(\`${snippet}\`).then(() => {
        document.querySelector(".copy-btn").textContent = "Copied!";
        setTimeout(() => document.querySelector(".copy-btn").textContent = "Copy", 2000);
      });
    }
  </script>
</body>
</html>`;

  res.set('Content-Type', 'text/html');
  res.send(html);
});

/**
 * POST /api/embed/session
 * Create session token for visitor
 */
const createSession = asyncHandler(async (req, res) => {
  const { siteKey, visitorId } = req.body;

  if (!siteKey || !visitorId) {
    throw new AppError('siteKey and visitorId are required', 400);
  }

  // Validate siteKey
  const widget = await embedService.getWidgetBySiteKey(siteKey);
  if (!widget) {
    throw new AppError('Widget not found or disabled', 404);
  }

  // Validate origin (in production)
  const origin = req.headers.origin || req.headers.referer;
  if (env.app.env === 'production' && !env.embed.devAllowAll) {
    if (!embedService.validateOrigin(widget, origin)) {
      throw new AppError('Origin not allowed', 403);
    }
  }

  // Generate token
  const tokenData = embedService.generateSessionToken(widget, visitorId);

  res.status(200).json({
    status: 'success',
    data: {
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      widgetName: widget.Name
    }
  });
});

/**
 * GET /embed/frame
 * Serve iframe chat HTML
 */
const getFrame = (req, res) => {
  try {
    const framePath = path.join(__dirname, 'frame.html');
    const html = fs.readFileSync(framePath, 'utf8');

    // Get allowed origins from query or use wildcard for dev
    const { siteKey } = req.query;
    let frameAncestors = '*';

    // In production, could restrict frame-ancestors based on widget config
    // For now, we rely on token validation

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `frame-ancestors ${frameAncestors}`,
      'X-Frame-Options': '', // Remove X-Frame-Options to allow embedding
      'Cache-Control': 'no-cache'
    });

    res.send(html);
  } catch (err) {
    console.error('Error serving frame:', err);
    res.status(500).send('<html><body>Error loading chat</body></html>');
  }
};

/**
 * GET /embed/demo
 * Demo page for testing widget
 */
const getDemo = asyncHandler(async (req, res) => {
  const { siteKey } = req.query;

  // If no siteKey, try to get first available widget
  let demoSiteKey = siteKey;
  if (!demoSiteKey) {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT TOP 1 SiteKey FROM iam.Widgets WHERE Status = 1 AND SiteKey IS NOT NULL
    `);
    if (result.recordset.length > 0) {
      demoSiteKey = result.recordset[0].SiteKey;
    }
  }

  const scriptTag = demoSiteKey
    ? `<script async src="${BACKEND_PUBLIC_URL}/api/embed/widget.js" data-site-key="${demoSiteKey}" data-api-base="${BACKEND_PUBLIC_URL}"></script>`
    : '<!-- No widget configured. Create a widget first and add SiteKey. -->';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Embed Widget Demo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      min-height: 100vh; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 20px;
      color: white;
    }
    h1 { font-size: 48px; margin-bottom: 16px; }
    p { font-size: 18px; opacity: 0.9; margin-bottom: 40px; line-height: 1.6; }
    .info-box {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .info-box h3 { margin-bottom: 12px; font-size: 20px; }
    .info-box code {
      display: block;
      background: rgba(0,0,0,0.2);
      padding: 16px;
      border-radius: 8px;
      font-size: 13px;
      overflow-x: auto;
      margin-top: 12px;
    }
    .links { display: flex; gap: 16px; flex-wrap: wrap; }
    .links a {
      display: inline-block;
      padding: 12px 24px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .links a:hover { transform: translateY(-2px); }
    .feature-list { margin-top: 40px; }
    .feature-list li {
      padding: 8px 0;
      font-size: 16px;
      opacity: 0.9;
      list-style: none;
    }
    .feature-list li:before { content: "✓ "; color: #4ade80; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💬 Live Chat Widget</h1>
    <p>This is a demo page showing the embeddable live chat widget. Click the chat bubble in the bottom-right corner to start a conversation!</p>
    
    ${demoSiteKey ? `
    <div class="info-box">
      <h3>Current Configuration</h3>
      <p>SiteKey: <strong>${demoSiteKey}</strong></p>
      <code>${scriptTag.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
    </div>
    ` : `
    <div class="info-box">
      <h3>⚠️ No Widget Configured</h3>
      <p>Create a widget first and ensure it has a SiteKey, or pass ?siteKey=xxx in the URL.</p>
    </div>
    `}

    <div class="links">
      <a href="/api/embed/admin${demoSiteKey ? '?siteKey=' + demoSiteKey : ''}">Open Agent Console</a>
      <a href="/api-docs">API Documentation</a>
    </div>

    <ul class="feature-list">
      <li>Realtime messaging with Socket.IO</li>
      <li>Visitor identification with localStorage</li>
      <li>Message history persistence</li>
      <li>Typing indicators</li>
      <li>Mobile-responsive design</li>
    </ul>
  </div>
  
  ${scriptTag}
</body>
</html>`;

  res.set('Content-Type', 'text/html');
  res.send(html);
});

/**
 * GET /embed/admin
 * Agent admin console
 */
const getAdmin = (req, res) => {
  try {
    const adminPath = path.join(__dirname, 'admin.html');
    const html = fs.readFileSync(adminPath, 'utf8');

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      // Allow inline scripts and CDN for admin page
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.socket.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; img-src 'self' data:;"
    });

    res.send(html);
  } catch (err) {
    console.error('Error serving admin:', err);
    res.status(500).send('<html><body>Error loading admin</body></html>');
  }
};


/**
 * GET /api/embed/conversations?siteKey=xxx
 * List conversations for a site (agent use)
 */
const getConversations = asyncHandler(async (req, res) => {
  const { siteKey, limit = 50 } = req.query;

  if (!siteKey) {
    throw new AppError('siteKey is required', 400);
  }

  const conversations = await embedService.listConversationsBySiteKey(siteKey, parseInt(limit, 10));

  res.status(200).json({
    status: 'success',
    data: {
      conversations,
      count: conversations.length
    }
  });
});

/**
 * GET /api/embed/messages/:conversationId
 * Get messages for a conversation
 */
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { limit = 50 } = req.query;

  if (!conversationId) {
    throw new AppError('conversationId is required', 400);
  }

  const messages = await embedService.getMessages(conversationId, parseInt(limit, 10));

  res.status(200).json({
    status: 'success',
    data: {
      messages
    }
  });
});

/**
 * POST /api/embed/agent-session
 * Create session for agent (simplified for testing)
 */
const createAgentSession = asyncHandler(async (req, res) => {
  const { siteKey } = req.body;

  if (!siteKey) {
    throw new AppError('siteKey is required', 400);
  }

  const widget = await embedService.getWidgetBySiteKey(siteKey);
  if (!widget) {
    throw new AppError('Widget not found', 404);
  }

  // Generate agent token (marked differently)
  const agentId = 'agent_' + Date.now();
  const tokenData = embedService.generateSessionToken(widget, agentId);

  res.status(200).json({
    status: 'success',
    data: {
      token: tokenData.token,
      agentId
    }
  });
});

/**
 * POST /api/embed/agent-message
 * Send message as agent
 */
const sendAgentMessage = asyncHandler(async (req, res) => {
  const { siteKey, visitorId, conversationId, text } = req.body;

  if (!siteKey || !visitorId || !text) {
    throw new AppError('siteKey, visitorId, and text are required', 400);
  }

  if (text.length > 2000) {
    throw new AppError('Message too long (max 2000 characters)', 400);
  }

  // Get conversation
  let conv;
  if (conversationId) {
    conv = await embedService.getConversationById(conversationId);
  } else {
    conv = await embedService.getConversationByVisitorAndSiteKey(siteKey, visitorId);
  }

  if (!conv) {
    throw new AppError('Conversation not found', 404);
  }

  // Create message
  const message = await embedService.createMessage(
    conv.ConversationKey,
    text.trim(),
    2, // agent
    'agent'
  );

  // Update activity
  await embedService.updateConversationActivity(conv.ConversationKey);

  const messageData = {
    id: message.messageId,
    text: text.trim(),
    sender: 'agent',
    createdAt: message.createdAt
  };

  // Emit via socket
  try {
    const { emitToEmbedRoom } = require('../../bootstrap/socket');
    const roomName = `embed:${siteKey}:${visitorId}`;
    emitToEmbedRoom(roomName, 'embed:message', messageData);
  } catch (err) {
    console.warn('Failed to emit socket message:', err.message);
  }

  res.status(201).json({
    status: 'success',
    data: messageData
  });
});

module.exports = {
  getWidgetScript,
  getWidgetScriptMinified,
  getSnippet,
  getSnippetPreview,
  createSession,
  getFrame,
  getDemo,
  getAdmin,
  getConversations,
  getMessages,
  createAgentSession,
  sendAgentMessage
};

