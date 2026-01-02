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

  /**
   * Get the site's favicon URL
   */
  function getFaviconUrl() {
    // Try various favicon link tags in order of preference (larger icons first)
    const selectors = [
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
      'link[rel="icon"][sizes="192x192"]',
      'link[rel="icon"][sizes="128x128"]',
      'link[rel="icon"][sizes="96x96"]',
      'link[rel="icon"][sizes="64x64"]',
      'link[rel="icon"][sizes="32x32"]',
      'link[rel="icon"]',
      'link[rel="shortcut icon"]'
    ];

    for (const selector of selectors) {
      const link = document.querySelector(selector);
      if (link && link.href) {
        return link.href;
      }
    }

    // Fall back to default favicon location
    return new URL('/favicon.ico', window.location.origin).href;
  }

  // Store original static properties
  const originalPermission = Object.getOwnPropertyDescriptor(OriginalNotification, 'permission');
  const originalRequestPermission = OriginalNotification.requestPermission?.bind(OriginalNotification);

  /**
   * Sanitize notification body by removing link elements and cleaning up
   */
  function sanitizeBody(str) {
    if (!str) return str;
    // Remove entire <a> tags including their content (the URL text we don't want)
    let clean = str.replace(/<a[^>]*>[^<]*<\/a>/gi, '');
    // Remove any other HTML tags
    clean = clean.replace(/<[^>]*>/g, '');
    // Decode common HTML entities
    clean = clean.replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");
    // Remove leading newlines/whitespace and collapse multiple newlines
    clean = clean.replace(/^\s*\n+/, '').trim().replace(/\n{3,}/g, '\n\n');
    return clean;
  }

  /**
   * Strip HTML tags from a string (for title - keep text content)
   */
  function stripHtml(str) {
    if (!str) return str;
    let clean = str.replace(/<[^>]*>/g, '');
    clean = clean.replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");
    return clean.trim();
  }

  /**
   * Custom Notification constructor that sanitizes content
   */
  function SanitizedNotification(title, options = {}) {
    // Sanitize the title and body
    const sanitizedTitle = stripHtml(title);
    const sanitizedBody = sanitizeBody(options.body);

    // Create sanitized options
    const sanitizedOptions = {
      ...options,
      body: sanitizedBody
    };

    // Return a fake notification object that mimics the real API
    // but doesn't actually create a system notification (we handle that via chrome.notifications)
    const fakeNotification = {
      title: sanitizedTitle,
      body: sanitizedBody,
      icon: options.icon,
      tag: options.tag,
      onclick: null,
      onclose: null,
      onerror: null,
      onshow: null,
      close: function() {
        if (this.onclose) this.onclose();
      }
    };

    // Get icon URL - use provided icon or fall back to favicon
    // The actual fetching happens in background.js which can bypass CORS
    const iconUrl = options.icon || getFaviconUrl();

    window.postMessage({
      type: 'NOTIFICATION_SANITIZER_CREATE',
      payload: {
        title: sanitizedTitle,
        body: sanitizedBody,
        icon: iconUrl,
        tag: options.tag || null,
        url: window.location.href
      }
    }, '*');

    // Simulate the 'show' event
    setTimeout(() => {
      if (fakeNotification.onshow) fakeNotification.onshow();
    }, 0);

    return fakeNotification;
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
