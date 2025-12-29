/**
 * Notification Sanitizer - Injected Script
 *
 * This script runs in the page's main world (not isolated content script context)
 * to intercept the native Notification API and sanitize notification content.
 */

(function() {
  'use strict';

  // Store the original Notification constructor
  const OriginalNotification = window.Notification;

  // Store original static properties
  const originalPermission = Object.getOwnPropertyDescriptor(OriginalNotification, 'permission');
  const originalRequestPermission = OriginalNotification.requestPermission?.bind(OriginalNotification);

  /**
   * Strip HTML tags from a string
   */
  function stripHtml(str) {
    if (!str) return str;
    // Remove HTML tags
    let clean = str.replace(/<[^>]*>/g, '');
    // Decode common HTML entities
    clean = clean.replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");
    // Trim leading/trailing whitespace and collapse multiple newlines
    clean = clean.trim().replace(/\n{3,}/g, '\n\n');
    return clean;
  }

  /**
   * Custom Notification constructor that sanitizes content
   */
  function SanitizedNotification(title, options = {}) {
    // Sanitize the title and body
    const sanitizedTitle = stripHtml(title);
    const sanitizedBody = stripHtml(options.body);

    // Create sanitized options
    const sanitizedOptions = {
      ...options,
      body: sanitizedBody
    };

    // Send message to content script with notification data
    window.postMessage({
      type: 'NOTIFICATION_SANITIZER_CREATE',
      payload: {
        title: sanitizedTitle,
        body: sanitizedBody,
        icon: options.icon || null,
        tag: options.tag || null,
        url: window.location.href
      }
    }, '*');

    // Create the original notification with sanitized content
    // This ensures the page's notification handlers still work
    const notification = new OriginalNotification(sanitizedTitle, sanitizedOptions);

    // Proxy click events to also notify our extension
    const originalOnClick = notification.onclick;
    notification.onclick = function(event) {
      window.postMessage({
        type: 'NOTIFICATION_SANITIZER_CLICK',
        payload: { url: window.location.href }
      }, '*');
      if (originalOnClick) {
        originalOnClick.call(this, event);
      }
    };

    return notification;
  }

  // Copy static properties and methods
  Object.defineProperty(SanitizedNotification, 'permission', {
    get: function() {
      return OriginalNotification.permission;
    },
    enumerable: true,
    configurable: true
  });

  SanitizedNotification.requestPermission = function(callback) {
    return OriginalNotification.requestPermission(callback);
  };

  // Copy prototype
  SanitizedNotification.prototype = OriginalNotification.prototype;

  // Replace the global Notification
  window.Notification = SanitizedNotification;

  console.log('[Notification Sanitizer] Initialized - intercepting notifications');
})();
