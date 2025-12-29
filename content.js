/**
 * Notification Sanitizer - Content Script
 *
 * This script runs in the isolated content script context.
 * It injects the main script into the page's world and bridges
 * messages between the page and the service worker.
 */

(function() {
  'use strict';

  // Inject the script into the page's main world
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Listen for messages from the injected script
  window.addEventListener('message', function(event) {
    // Only accept messages from the same window
    if (event.source !== window) return;

    const { type, payload } = event.data;

    if (type === 'NOTIFICATION_SANITIZER_CREATE') {
      // Forward notification creation to service worker
      chrome.runtime.sendMessage({
        action: 'createNotification',
        ...payload
      }).catch(err => {
        // Extension context may be invalidated, ignore
        console.debug('[Notification Sanitizer] Could not send message:', err);
      });
    }

    if (type === 'NOTIFICATION_SANITIZER_CLICK') {
      // Forward click event to service worker
      chrome.runtime.sendMessage({
        action: 'notificationClicked',
        ...payload
      }).catch(err => {
        console.debug('[Notification Sanitizer] Could not send message:', err);
      });
    }
  });

  // Inject the script as soon as possible
  injectScript();
})();
