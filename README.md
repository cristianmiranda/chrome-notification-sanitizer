# Notification Sanitizer

A Chrome extension that sanitizes web notifications by stripping HTML tags before they reach the system notification daemon.

## Problem

Chrome injects HTML anchor tags (`<a href="...">site.com</a>`) into web notification bodies. Notification daemons like **dunst** can't render these tags, resulting in ugly raw HTML being displayed instead of clean text.

## Solution

This extension intercepts the Web Notifications API and:
1. Strips HTML tags from notification title and body
2. Preserves click-to-focus functionality (clicks focus the originating tab)
3. Forwards clean notifications to the system daemon

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/notification-sanitizer.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked**

5. Select the `notification-sanitizer` directory

## How It Works

```
Website calls new Notification()
        ↓
injected.js (overrides Notification constructor, strips HTML)
        ↓ window.postMessage
content.js (content script)
        ↓ chrome.runtime.sendMessage
background.js (service worker)
        ↓ chrome.notifications.create()
System notification daemon (dunst, etc.)
```

## Permissions

- **notifications**: Create system notifications
- **tabs**: Focus the originating tab when notification is clicked
- **host_permissions** (`<all_urls>`): Inject into all websites to intercept notifications

## License

MIT
