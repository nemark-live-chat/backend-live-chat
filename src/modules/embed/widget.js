/**
 * widget.js - Embeddable Live Chat Widget Script
 * 
 * Zero dependencies, vanilla JS. Loads chat widget in an iframe.
 * Configuration via data-attributes on the script tag.
 * 
 * Version: 2.0.0
 */
(function () {
  'use strict';

  // Prevent double-initialization
  if (window.__NEMARK_CHAT_LOADED__) {
    console.warn('Nemark Chat: Widget already loaded, skipping...');
    return;
  }
  window.__NEMARK_CHAT_LOADED__ = true;

  // Get script element and configuration
  var script = document.currentScript;
  if (!script) {
    // Fallback for IE/older browsers
    var scripts = document.getElementsByTagName('script');
    script = scripts[scripts.length - 1];
  }

  // Required configuration
  var siteKey = script.getAttribute('data-site-key');
  if (!siteKey) {
    console.error('Nemark Chat: data-site-key is required');
    return;
  }

  // Optional configuration with defaults
  var config = {
    siteKey: siteKey,
    apiBase: script.getAttribute('data-api-base') || 'http://localhost:3001',
    position: script.getAttribute('data-position') || 'bottom-right',
    offsetX: parseInt(script.getAttribute('data-offset-x'), 10) || 24,
    offsetY: parseInt(script.getAttribute('data-offset-y'), 10) || 24,
    zIndex: parseInt(script.getAttribute('data-z-index'), 10) || 999999,
    width: parseInt(script.getAttribute('data-width'), 10) || 400,
    height: parseInt(script.getAttribute('data-height'), 10) || 560,
    primaryColor: script.getAttribute('data-primary-color') || '#2563eb',
    title: script.getAttribute('data-title') || 'Chat Support',
    autoOpen: script.getAttribute('data-auto-open') === 'true',
    openDelay: parseInt(script.getAttribute('data-open-delay'), 10) || 0
  };

  // Generate or retrieve visitor ID
  var storageKey = 'nemark_chat_visitor_' + siteKey;
  var visitorId = null;
  try {
    visitorId = localStorage.getItem(storageKey);
    if (!visitorId) {
      visitorId = 'v_' + generateUUID();
      localStorage.setItem(storageKey, visitorId);
    }
  } catch (e) {
    console.warn('Nemark Chat: localStorage not available, using session-only ID');
    visitorId = 'v_' + generateUUID();
  }

  // UUID v4 generator
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // CSS styles
  var css = '\
    #nemark-chat-container {\
      position: fixed;\
      z-index: ' + config.zIndex + ';\
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\
    }\
    #nemark-chat-bubble {\
      position: fixed;\
      width: 60px;\
      height: 60px;\
      border-radius: 50%;\
      background: ' + config.primaryColor + ';\
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);\
      cursor: pointer;\
      display: flex;\
      align-items: center;\
      justify-content: center;\
      z-index: ' + config.zIndex + ';\
      transition: transform 0.2s ease, box-shadow 0.2s ease;\
      border: none;\
      outline: none;\
    }\
    #nemark-chat-bubble:hover {\
      transform: scale(1.05);\
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);\
    }\
    #nemark-chat-bubble svg {\
      width: 28px;\
      height: 28px;\
      fill: white;\
      transition: transform 0.2s ease;\
    }\
    #nemark-chat-bubble.open svg.chat-icon { display: none; }\
    #nemark-chat-bubble.open svg.close-icon { display: block; }\
    #nemark-chat-bubble:not(.open) svg.chat-icon { display: block; }\
    #nemark-chat-bubble:not(.open) svg.close-icon { display: none; }\
    #nemark-chat-badge {\
      position: absolute;\
      top: -4px;\
      right: -4px;\
      min-width: 20px;\
      height: 20px;\
      padding: 0 6px;\
      background: #ef4444;\
      color: white;\
      font-size: 11px;\
      font-weight: 600;\
      border-radius: 10px;\
      display: none;\
      align-items: center;\
      justify-content: center;\
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);\
    }\
    #nemark-chat-badge.visible {\
      display: flex;\
    }\
    #nemark-chat-panel {\
      position: fixed;\
      background: white;\
      border-radius: 16px;\
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);\
      z-index: ' + (config.zIndex - 1) + ';\
      overflow: hidden;\
      opacity: 0;\
      transform: scale(0.9) translateY(20px);\
      pointer-events: none;\
      transition: opacity 0.25s ease, transform 0.25s ease;\
    }\
    #nemark-chat-panel.open {\
      opacity: 1;\
      transform: scale(1) translateY(0);\
      pointer-events: auto;\
    }\
    #nemark-chat-panel iframe {\
      width: 100%;\
      height: 100%;\
      border: none;\
    }\
    @media (max-width: 480px) {\
      #nemark-chat-panel.open {\
        width: 100vw !important;\
        height: 100vh !important;\
        bottom: 0 !important;\
        right: 0 !important;\
        left: 0 !important;\
        border-radius: 0 !important;\
      }\
      #nemark-chat-bubble.open {\
        display: none;\
      }\
    }\
  ';

  // Inject styles
  function injectStyles() {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.id = 'nemark-chat-styles';
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    document.head.appendChild(style);
  }

  // Calculate position
  function getPositionStyles() {
    var styles = { bubble: {}, panel: {} };

    if (config.position === 'bottom-left') {
      styles.bubble.left = config.offsetX + 'px';
      styles.bubble.right = 'auto';
      styles.panel.left = config.offsetX + 'px';
      styles.panel.right = 'auto';
    } else {
      styles.bubble.right = config.offsetX + 'px';
      styles.bubble.left = 'auto';
      styles.panel.right = config.offsetX + 'px';
      styles.panel.left = 'auto';
    }

    styles.bubble.bottom = config.offsetY + 'px';
    styles.panel.bottom = (config.offsetY + 70) + 'px';
    styles.panel.width = config.width + 'px';
    styles.panel.height = config.height + 'px';

    return styles;
  }

  // Create bubble button
  function createBubble() {
    var bubble = document.createElement('button');
    bubble.id = 'nemark-chat-bubble';
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.innerHTML = '\
      <svg class="chat-icon" viewBox="0 0 24 24">\
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>\
      </svg>\
      <svg class="close-icon" viewBox="0 0 24 24" style="display:none">\
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>\
      </svg>\
      <span id="nemark-chat-badge">0</span>\
    ';

    var pos = getPositionStyles();
    bubble.style.bottom = pos.bubble.bottom;
    bubble.style.left = pos.bubble.left;
    bubble.style.right = pos.bubble.right;

    return bubble;
  }

  // Create panel
  function createPanel() {
    var panel = document.createElement('div');
    panel.id = 'nemark-chat-panel';

    var pos = getPositionStyles();
    panel.style.bottom = pos.panel.bottom;
    panel.style.left = pos.panel.left;
    panel.style.right = pos.panel.right;
    panel.style.width = pos.panel.width;
    panel.style.height = pos.panel.height;

    return panel;
  }

  // Create iframe
  function createIframe() {
    var iframe = document.createElement('iframe');
    var iframeSrc = config.apiBase + '/api/embed/frame' +
      '?siteKey=' + encodeURIComponent(siteKey) +
      '&visitorId=' + encodeURIComponent(visitorId) +
      '&title=' + encodeURIComponent(config.title) +
      '&t=' + Date.now();

    iframe.src = iframeSrc;
    iframe.id = 'nemark-chat-iframe';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    iframe.setAttribute('title', 'Chat Widget');

    return iframe;
  }

  // Widget state
  var isOpen = false;
  var iframeLoaded = false;
  var unreadCount = 0;
  var bubble, panel, iframe, badge;

  // Toggle widget
  function toggle() {
    isOpen = !isOpen;

    if (isOpen && !iframeLoaded) {
      iframe = createIframe();
      panel.appendChild(iframe);
      iframeLoaded = true;
    }

    bubble.classList.toggle('open', isOpen);
    panel.classList.toggle('open', isOpen);
    bubble.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');

    // Clear unread when opening
    if (isOpen && unreadCount > 0) {
      unreadCount = 0;
      updateBadge();
    }

    // Notify iframe
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'HOST_TOGGLE', isOpen: isOpen }, '*');
      } catch (e) { }
    }
  }

  // Update badge
  function updateBadge() {
    if (!badge) return;

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }

  // Handle messages from iframe
  function handleMessage(event) {
    // Basic origin check (iframe is from our API)
    var expectedOrigin = new URL(config.apiBase).origin;
    if (event.origin !== expectedOrigin) return;

    var data = event.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'EMBED_READY':
        // Widget loaded, send init data
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'EMBED_INIT',
            payload: {
              siteKey: siteKey,
              visitorId: visitorId,
              title: config.title
            }
          }, expectedOrigin);
        }
        break;

      case 'EMBED_UNREAD':
        if (data.payload && typeof data.payload.count === 'number') {
          unreadCount = data.payload.count;
          if (!isOpen) {
            updateBadge();
          }
        }
        break;

      case 'WIDGET_CLOSE':
        if (isOpen) toggle();
        break;

      case 'WIDGET_RESIZE':
        if (data.payload && data.payload.height && window.innerWidth >= 480) {
          var newHeight = Math.min(data.payload.height, config.height);
          panel.style.height = newHeight + 'px';
        }
        break;
    }
  }

  // Initialize widget
  function init() {
    injectStyles();

    bubble = createBubble();
    panel = createPanel();
    badge = bubble.querySelector('#nemark-chat-badge');

    document.body.appendChild(bubble);
    document.body.appendChild(panel);

    bubble.addEventListener('click', toggle);
    window.addEventListener('message', handleMessage);

    // Handle window resize
    window.addEventListener('resize', function () {
      var pos = getPositionStyles();
      panel.style.width = pos.panel.width;
      panel.style.height = pos.panel.height;
      panel.style.bottom = pos.panel.bottom;
    });

    // Handle escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        toggle();
      }
    });

    // Auto-open if configured
    if (config.autoOpen) {
      setTimeout(function () {
        if (!isOpen) toggle();
      }, config.openDelay);
    }
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global API
  window.NemarkChat = {
    open: function () { if (!isOpen) toggle(); },
    close: function () { if (isOpen) toggle(); },
    toggle: toggle,
    getVisitorId: function () { return visitorId; },
    isOpen: function () { return isOpen; },
    destroy: function () {
      if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      var style = document.getElementById('nemark-chat-styles');
      if (style && style.parentNode) style.parentNode.removeChild(style);
      window.__NEMARK_CHAT_LOADED__ = false;
    }
  };

})();

