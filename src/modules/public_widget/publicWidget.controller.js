const service = require('./publicWidget.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

// Retrieve Widget Script
const getScript = (req, res) => {
  const jsContent = `
(function() {
  if (window.__NEMARK_WIDGET_LOADED__) return;
  window.__NEMARK_WIDGET_LOADED__ = true;

  const script = document.currentScript;
  const widgetId = script.dataset.widgetId;
  const apiBase = script.dataset.apiBase || 'http://localhost:3001';

  if (!widgetId) {
    console.error('Nemark Widget: widget-id is required');
    return;
  }

  // --- Styles & UI ---
  const container = document.createElement('div');
  container.id = 'nemark-widget-root';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  const style = \`
    .nemark-widget-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #2563eb;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: transform 0.2s;
    }
    .nemark-widget-bubble:hover { transform: scale(1.05); }
    .nemark-widget-icon { width: 30px; height: 30px; fill: white; }
    
    .nemark-widget-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .nemark-widget-panel.open { display: flex; }
    
    .nemark-header {
      padding: 16px;
      background: #2563eb;
      color: white;
    }
    .nemark-title { font-weight: 600; font-size: 16px; margin: 0; }
    .nemark-subtitle { font-size: 13px; opacity: 0.9; margin: 4px 0 0; }
    
    .nemark-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .nemark-msg {
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
    }
    .nemark-msg.visitor {
      background: #2563eb;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    .nemark-msg.agent {
      background: white;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }
    
    .nemark-input-area {
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    .nemark-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 20px;
      padding: 8px 12px;
      outline: none;
      font-size: 14px;
    }
    .nemark-input:focus { border-color: #2563eb; }
    .nemark-send {
      background: none;
      border: none;
      color: #2563eb;
      cursor: pointer;
      font-weight: 600;
      padding: 0 8px;
    }
  \`;

  const styleEl = document.createElement('style');
  styleEl.textContent = style;
  shadow.appendChild(styleEl);

  // --- Components ---
  const bubble = document.createElement('div');
  bubble.className = 'nemark-widget-bubble';
  bubble.innerHTML = '<svg class="nemark-widget-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  
  const panel = document.createElement('div');
  panel.className = 'nemark-widget-panel';
  panel.innerHTML = \`
    <div class="nemark-header">
      <h3 class="nemark-title">Chat Support</h3>
      <p class="nemark-subtitle">Ask us anything!</p>
    </div>
    <div class="nemark-messages"></div>
    <div class="nemark-input-area">
      <input type="text" class="nemark-input" placeholder="Type a message...">
      <button class="nemark-send">Send</button>
    </div>
  \`;

  shadow.appendChild(bubble);
  shadow.appendChild(panel);

  // --- Logic ---
  const messagesDiv = panel.querySelector('.nemark-messages');
  const input = panel.querySelector('.nemark-input');
  const sendBtn = panel.querySelector('.nemark-send');
  let config = {};
  let visitorId = localStorage.getItem('nemark_vid') || 'vis_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('nemark_vid', visitorId);

  // Fetch Config
  fetch(\`\${apiBase}/public/widgets/\${widgetId}/config?host=\${encodeURIComponent(window.location.origin)}\`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load widget config');
      return res.json();
    })
    .then(data => {
      config = data.data; // Wrapper { status: 'success', data: {...} }
      applyConfig(config);
    })
    .catch(err => {
      console.error('Nemark Widget Error:', err);
      bubble.style.display = 'none'; // Hide if invalid
    });

  function applyConfig(cfg) {
    if (cfg.theme) {
      const theme = JSON.parse(cfg.theme);
      panel.querySelector('.nemark-title').textContent = theme.title || 'Chat';
      panel.querySelector('.nemark-subtitle').textContent = theme.subtitle || '';
      // Apply colors...
      if (theme.color) {
        bubble.style.background = theme.color;
        panel.querySelector('.nemark-header').style.background = theme.color;
      }
      // Position
      if (theme.position === 'bl') {
        bubble.style.right = 'auto'; bubble.style.left = '20px';
        panel.style.right = 'auto'; panel.style.left = '20px';
      }
      
      if (theme.autoOpen) togglePanel();
    }
  }

  function togglePanel() {
    panel.classList.toggle('open');
  }

  bubble.addEventListener('click', togglePanel);

  function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = \`nemark-msg \${type}\`;
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function sendMessage() {
    const content = input.value.trim();
    if (!content) return;

    addMessage(content, 'visitor');
    input.value = '';

    fetch(\`\${apiBase}/public/widgets/\${widgetId}/messages\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        content,
        url: window.location.href
      })
    })
    .then(res => res.json())
    .then(data => {
      // Confirmed
    })
    .catch(err => console.error('Send failed', err));
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

})();
  `;

  res.set('Content-Type', 'application/javascript; charset=utf-8');
  res.send(jsContent);
};

// GET Config
const getConfig = asyncHandler(async (req, res) => {
  const { widgetId } = req.params;
  const origin = req.headers.origin || req.query.host;

  const widget = await service.getWidgetConfig(widgetId);
  
  if (!widget || widget.Status !== 1) {
    throw new AppError('Widget not found or disabled', 404);
  }

  const allowedDomains = JSON.parse(widget.AllowedDomains);
  // Normalize origin: remove trailing slash
  const cleanOrigin = origin ? origin.replace(/\/$/, '') : '';
  
  if (!allowedDomains.some(d => d.replace(/\/$/, '') === cleanOrigin)) {
    throw new AppError('Domain not allowed', 403);
  }

  res.status(200).json({
    status: 'success',
    data: {
      theme: widget.Theme,
      status: widget.Status
    }
  });
});

// POST Message
const postMessage = asyncHandler(async (req, res) => {
  const { widgetId } = req.params;
  const { visitorId, content, url } = req.body;
  
  // Basic Origin Check (Duplicate logic, ideally in middleware or service)
  const origin = req.headers.origin || (url ? new URL(url).origin : '');
  const widget = await service.getWidgetConfig(widgetId);
  if (!widget) throw new AppError('Widget not found', 404);
  
  const allowedDomains = JSON.parse(widget.AllowedDomains);
  const cleanOrigin = origin ? origin.replace(/\/$/, '') : '';
  
  if (!allowedDomains.some(d => d.replace(/\/$/, '') === cleanOrigin)) {
    throw new AppError('Domain not allowed', 403);
  }

  const result = await service.createMessage(widget.WidgetKey, { visitorId, content });
  
  res.status(201).json({ status: 'success', data: result });
});

module.exports = {
  getScript,
  getConfig,
  postMessage
};
