const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { getPool, sql } = require('../../infra/sql/pool');

// Configuration
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001';
const FRONTEND_PUBLIC_URL = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000';
const WIDGET_VERSION = '1.0.0';

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
  const pool = getPool();
  const result = await pool.request()
    .input('siteKey', sql.NVarChar, siteKey)
    .query(`
      SELECT WidgetId, Name, Status 
      FROM iam.Widgets 
      WHERE SiteKey = @siteKey AND Status = 1
    `);

  if (result.recordset.length === 0) {
    throw new AppError('Widget not found', 404);
  }

  const scriptUrl = `${BACKEND_PUBLIC_URL}/embed/widget.js`;
  const snippet = `<script async src="${scriptUrl}" data-site-key="${siteKey}" data-base-url="${BACKEND_PUBLIC_URL}" data-widget-url="${FRONTEND_PUBLIC_URL}"></script>`;

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

  // Validate siteKey exists
  const pool = getPool();
  const result = await pool.request()
    .input('siteKey', sql.NVarChar, siteKey)
    .query(`
      SELECT WidgetId, Name, Status 
      FROM iam.Widgets 
      WHERE SiteKey = @siteKey AND Status = 1
    `);

  if (result.recordset.length === 0) {
    throw new AppError('Widget not found', 404);
  }

  const widget = result.recordset[0];
  const scriptUrl = `${BACKEND_PUBLIC_URL}/embed/widget.js`;
  const snippet = `<script async src="${scriptUrl}" data-site-key="${siteKey}" data-base-url="${BACKEND_PUBLIC_URL}" data-widget-url="${FRONTEND_PUBLIC_URL}"></script>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Embed Preview - ${widget.Name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background: #f5f5f5; 
      min-height: 100vh; 
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #1f2937; margin-bottom: 8px; }
    p.subtitle { color: #6b7280; margin-bottom: 32px; }
    .card { 
      background: white; 
      border-radius: 12px; 
      padding: 24px; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }
    .card h2 { color: #374151; font-size: 18px; margin-bottom: 16px; }
    .code-box {
      background: #1f2937;
      color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      overflow-x: auto;
      position: relative;
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy-btn:hover { background: #2563eb; }
    .preview-frame {
      width: 100%;
      height: 500px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
    }
    .status { 
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .status.active { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Widget Embed Code</h1>
    <p class="subtitle">Widget: ${widget.Name} <span class="status active">Active</span></p>
    
    <div class="card">
      <h2>📋 Copy this code</h2>
      <p style="color:#6b7280;margin-bottom:16px;font-size:14px;">
        Paste this snippet before the closing &lt;/body&gt; tag on your website.
      </p>
      <div class="code-box">
        <button class="copy-btn" onclick="copySnippet()">Copy</button>
        <code id="snippet">${snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
      </div>
    </div>
    
    <div class="card">
      <h2>👁️ Live Preview</h2>
      <p style="color:#6b7280;margin-bottom:16px;font-size:14px;">
        See how the widget looks and works. Click the chat bubble below.
      </p>
      <iframe class="preview-frame" srcdoc='
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: system-ui; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 400px; }
            h1 { color: white; }
            p { color: rgba(255,255,255,0.8); }
          </style>
        </head>
        <body>
          <h1>Your Website</h1>
          <p>This is a preview of how the chat widget will appear on your site.</p>
          ${snippet}
        </body>
        </html>
      '></iframe>
    </div>
  </div>
  
  <script>
    function copySnippet() {
      const code = document.getElementById("snippet").textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector(".copy-btn");
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 2000);
      });
    }
  </script>
</body>
</html>`;

  res.set('Content-Type', 'text/html');
  res.send(html);
});

module.exports = {
  getWidgetScript,
  getWidgetScriptMinified,
  getSnippet,
  getSnippetPreview
};
