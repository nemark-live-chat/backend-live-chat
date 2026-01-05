/**
 * widget.js - Embeddable Live Chat Widget Script
 * 
 * Zero dependencies, vanilla JS. Loads chat widget in an iframe.
 * Configuration via data-attributes on the script tag.
 */
(function() {
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
    baseUrl: script.getAttribute('data-base-url') || 'http://localhost:3001',
    widgetUrl: script.getAttribute('data-widget-url') || 'http://localhost:3000',
    position: script.getAttribute('data-position') || 'bottom-right',
    offsetX: parseInt(script.getAttribute('data-offset-x'), 10) || 20,
    offsetY: parseInt(script.getAttribute('data-offset-y'), 10) || 20,
    zIndex: parseInt(script.getAttribute('data-z-index'), 10) || 999999,
    width: parseInt(script.getAttribute('data-width'), 10) || 400,
    height: parseInt(script.getAttribute('data-height'), 10) || 560,
    primaryColor: script.getAttribute('data-primary-color') || '#2563eb',
    autoOpen: script.getAttribute('data-auto-open') === 'true',
    openDelay: parseInt(script.getAttribute('data-open-delay'), 10) || 0
  };

  // Generate or retrieve visitor ID
  var storageKey = 'nemark_chat_visitorId_' + siteKey;
  var visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId = 'v_' + generateUUID();
    try {
      localStorage.setItem(storageKey, visitorId);
    } catch (e) {
      console.warn('Nemark Chat: localStorage not available');
    }
  }

  // UUID v4 generator
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Calculate position styles
  function getPositionStyles(isOpen) {
    var isMobile = window.innerWidth < 480;
    var styles = {
      bubble: {},
      panel: {}
    };

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

    if (isMobile && isOpen) {
      styles.panel.width = '100vw';
      styles.panel.height = '100vh';
      styles.panel.bottom = '0';
      styles.panel.right = '0';
      styles.panel.left = '0';
      styles.panel.borderRadius = '0';
    } else {
      styles.panel.width = config.width + 'px';
      styles.panel.height = config.height + 'px';
      styles.panel.borderRadius = '16px';
    }

    return styles;
  }

  // Create styles
  var css = '\
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
    }\
    #nemark-chat-bubble.open svg.chat-icon { display: none; }\
    #nemark-chat-bubble.open svg.close-icon { display: block; }\
    #nemark-chat-bubble:not(.open) svg.chat-icon { display: block; }\
    #nemark-chat-bubble:not(.open) svg.close-icon { display: none; }\
    #nemark-chat-panel {\
      position: fixed;\
      background: white;\
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
    ';

    var pos = getPositionStyles(false);
    bubble.style.bottom = pos.bubble.bottom;
    bubble.style.left = pos.bubble.left;
    bubble.style.right = pos.bubble.right;

    return bubble;
  }

  // Create panel with iframe
  function createPanel() {
    var panel = document.createElement('div');
    panel.id = 'nemark-chat-panel';

    var pos = getPositionStyles(false);
    panel.style.bottom = pos.panel.bottom;
    panel.style.left = pos.panel.left;
    panel.style.right = pos.panel.right;
    panel.style.width = pos.panel.width;
    panel.style.height = pos.panel.height;
    panel.style.borderRadius = pos.panel.borderRadius;

    return panel;
  }

  // Create iframe (lazy loaded)
  function createIframe() {
    var iframe = document.createElement('iframe');
    var timestamp = Date.now();
    var iframeSrc = config.widgetUrl + '/widget?siteKey=' + encodeURIComponent(siteKey) + 
                    '&visitorId=' + encodeURIComponent(visitorId) + 
                    '&t=' + timestamp;
    
    iframe.src = iframeSrc;
    iframe.id = 'nemark-chat-iframe';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    iframe.setAttribute('allow', 'microphone');
    iframe.setAttribute('title', 'Chat Widget');

    return iframe;
  }

  // Widget state
  var isOpen = false;
  var iframeLoaded = false;
  var bubble, panel, iframe;
  var widgetOrigin = new URL(config.widgetUrl).origin;

  // Toggle widget open/close
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

    // Update positions for mobile
    var pos = getPositionStyles(isOpen);
    panel.style.width = pos.panel.width;
    panel.style.height = pos.panel.height;
    panel.style.bottom = pos.panel.bottom;
    panel.style.left = pos.panel.left;
    panel.style.right = pos.panel.right;
    panel.style.borderRadius = pos.panel.borderRadius;

    // Hide bubble on mobile when open
    if (window.innerWidth < 480) {
      bubble.style.display = isOpen ? 'none' : 'flex';
    }

    // Notify iframe
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'HOST_TOGGLE', isOpen: isOpen }, widgetOrigin);
    }
  }

  // Handle messages from iframe
  function handleMessage(event) {
    // Validate origin
    if (event.origin !== widgetOrigin) return;

    var data = event.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'WIDGET_CLOSE':
        if (isOpen) toggle();
        break;
      case 'WIDGET_RESIZE':
        if (data.height && !window.innerWidth < 480) {
          panel.style.height = Math.min(data.height, config.height) + 'px';
        }
        break;
      case 'WIDGET_READY':
        // Widget loaded successfully
        break;
    }
  }

  // Initialize widget
  function init() {
    injectStyles();
    
    bubble = createBubble();
    panel = createPanel();

    document.body.appendChild(bubble);
    document.body.appendChild(panel);

    bubble.addEventListener('click', toggle);
    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', function() {
      var pos = getPositionStyles(isOpen);
      panel.style.width = pos.panel.width;
      panel.style.height = pos.panel.height;
      panel.style.bottom = pos.panel.bottom;
      panel.style.borderRadius = pos.panel.borderRadius;
      if (window.innerWidth >= 480) {
        bubble.style.display = 'flex';
      }
    });

    // Auto-open if configured
    if (config.autoOpen) {
      setTimeout(function() {
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

  // Expose minimal API
  window.NemarkChat = {
    open: function() { if (!isOpen) toggle(); },
    close: function() { if (isOpen) toggle(); },
    toggle: toggle
  };

})();
