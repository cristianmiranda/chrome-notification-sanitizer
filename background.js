/**
 * Notification Sanitizer - Service Worker (Background Script)
 *
 * Handles notification creation and click events.
 * Maps notifications to their originating tabs for focus-on-click.
 */

// Store mapping of notification ID to tab info
const notificationTabMap = new Map();

/**
 * Generate a unique notification ID
 */
function generateNotificationId() {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'createNotification') {
    handleCreateNotification(message, sender);
  }
  // Return true if we need to send an async response
  return false;
});

/**
 * Create a system notification
 */
async function handleCreateNotification(message, sender) {
  const { title, body, icon, tag, url } = message;
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;

  // Use tag as notification ID if provided, otherwise generate one
  const notificationId = tag || generateNotificationId();

  // Store tab info for click handling
  if (tabId) {
    notificationTabMap.set(notificationId, {
      tabId,
      windowId,
      url
    });
  }

  // Create notification options
  const options = {
    type: 'basic',
    title: title || 'Notification',
    message: body || '',
    iconUrl: icon || chrome.runtime.getURL('icons/icon128.png'),
    priority: 0
  };

  try {
    await chrome.notifications.create(notificationId, options);
  } catch (err) {
    console.error('[Notification Sanitizer] Failed to create notification:', err);
  }
}

/**
 * Handle notification clicks - focus the originating tab
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const tabInfo = notificationTabMap.get(notificationId);

  if (tabInfo) {
    try {
      // Focus the window first
      if (tabInfo.windowId) {
        await chrome.windows.update(tabInfo.windowId, { focused: true });
      }

      // Then activate the tab
      if (tabInfo.tabId) {
        await chrome.tabs.update(tabInfo.tabId, { active: true });
      }
    } catch (err) {
      console.error('[Notification Sanitizer] Failed to focus tab:', err);
      // Tab may have been closed, try opening the URL instead
      if (tabInfo.url) {
        chrome.tabs.create({ url: tabInfo.url });
      }
    }
  }

  // Clear the notification
  chrome.notifications.clear(notificationId);

  // Clean up the mapping
  notificationTabMap.delete(notificationId);
});

/**
 * Handle notification closed - clean up mapping
 */
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  notificationTabMap.delete(notificationId);
});

/**
 * Clean up old entries periodically (every 10 minutes)
 * to prevent memory leaks from notifications that were never clicked
 */
setInterval(() => {
  // Keep only entries from the last hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [id, info] of notificationTabMap.entries()) {
    // Extract timestamp from ID if it's our format
    const match = id.match(/^notif-(\d+)-/);
    if (match && parseInt(match[1]) < oneHourAgo) {
      notificationTabMap.delete(id);
    }
  }
}, 10 * 60 * 1000);

console.log('[Notification Sanitizer] Service worker initialized');
