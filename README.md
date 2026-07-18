# POE Trade Alert Auto-Clicker Extension

A Chrome extension that monitors Path of Exile trade website alerts and automatically clicks the "Travel to hideout" button with user confirmation.

## Features

✨ **Alert Monitoring** - Intercepts all window alerts on POE trade pages
🎯 **Auto-Click** - Automatically clicks "Travel to hideout" button when alert is detected
🛡️ **Safe Operation** - Requires user confirmation after each click to prevent spam
📊 **Debug Log** - Shows all intercepted alerts for debugging
⚙️ **Easy Control** - Toggle extension on/off and control auto-click behavior
🧪 **Test Page** - Includes a test page to verify functionality

## Installation

### Method 1: Load as Unpacked Extension (For Development/Testing)

1. **Download/Clone the extension files** to a local folder (e.g., `C:\Projects\PoeExtension`)

2. **Create placeholder icons** (or use your own):
   - You need three icon files: `icon16.png`, `icon48.png`, `icon128.png`
   - You can create simple colored squares as placeholders or use proper icons

3. **Open Chrome Extensions page**:
   - Go to `chrome://extensions/`
   - Or click the three dots menu → More tools → Extensions

4. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

5. **Load the extension**:
   - Click "Load unpacked"
   - Select the `PoeExtension` folder
   - The extension should now appear in your extensions list

6. **Pin the extension** (optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Find "POE Trade Alert Auto-Clicker"
   - Click the pin icon to keep it visible

## Usage

### On Path of Exile Trade Website

1. **Navigate** to `https://www.pathofexile.com/trade/search/`
2. **Set up your live search** as you normally would
3. **Enable the extension** by clicking the extension icon and ensuring the toggle is ON
4. **Wait for alerts** - When a trade alert appears:
   - The extension intercepts the alert
   - Automatically clicks "Travel to hideout" button (if found and enabled)
   - Shows a confirmation dialog: "Continue monitoring or cancel?"
   - You must click "Continue" to re-enable auto-click for the next alert

### Extension Popup Controls

Click the extension icon to open the popup with these controls:

- **Enable Extension Toggle** - Turn the extension on/off
- **Status Indicator** - Shows if monitoring is active
- **Enable Auto-Click Button** - Manually re-enable auto-clicking
- **Disable Auto-Click Button** - Manually disable auto-clicking
- **Alert Log** - View all intercepted alerts with timestamps and actions
- **Clear Button** - Clear the alert log

### Testing

1. **Open the test page**:
   - Navigate to `file:///C:/Projects/PoeExtension/test.html` (adjust path as needed)
   - Or right-click `test.html` → Open with → Chrome

2. **Run tests**:
   - Click "Test Alert" buttons to trigger window alerts
   - Enter custom alert messages
   - Toggle the hideout button to test enabled/disabled states
   - View the action log to see what happened

3. **Verify extension behavior**:
   - Check if alerts are intercepted
   - Confirm the hideout button is clicked automatically
   - Verify the confirmation dialog appears after clicking

## How It Works

### Architecture

1. **Content Script** (`content.js`):
   - Runs on POE trade pages and test page
   - Overrides `window.alert()` to intercept alerts
   - Searches for and clicks "Travel to hideout" button
   - Shows custom confirmation dialog after clicking
   - Maintains alert log

2. **Background Worker** (`background.js`):
   - Manages global state
   - Stores alert history
   - Updates extension badge with alert count

3. **Popup UI** (`popup.html`, `popup.js`, `popup.css`):
   - Provides user interface for settings
   - Displays alert log with real-time updates
   - Controls for enabling/disabling features

### Alert Interception Flow

```
1. Website triggers window.alert()
   ↓
2. Extension intercepts the alert
   ↓
3. Logs the alert (timestamp, message)
   ↓
4. If extension & auto-click enabled:
   - Search for hideout button
   - Click if found and enabled
   - Show confirmation dialog
   ↓
5. User chooses:
   - Continue: Re-enable auto-click
   - Cancel: Keep auto-click disabled
```

## Configuration

### Settings stored in Chrome Storage:
- `extensionEnabled` (boolean) - Master on/off switch

### Runtime State:
- `autoClickEnabled` - Whether auto-click is currently active
- `alertLog` - Array of recent alerts

## Troubleshooting

### Extension not working?
- Check if extension is enabled in `chrome://extensions/`
- Verify you're on the correct URL pattern
- Check browser console for errors (F12 → Console tab)

### Button not being clicked?
- Ensure the button text contains "travel to hideout" or "hideout"
- Button must be visible and not disabled
- Check the alert log to see if button was found

### Test page not working?
- Make sure you granted file access:
  - Go to `chrome://extensions/`
  - Find the extension
  - Click "Details"
  - Enable "Allow access to file URLs"

### Alerts not intercepted?
- Reload the page after installing/updating extension
- Check if content script is injected (F12 → Sources → Content scripts)

## File Structure

```
PoeExtension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── content.js         # Content script (alert interception)
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── popup.css          # Popup styling
├── test.html          # Test page for development
├── icon16.png         # Extension icon (16x16)
├── icon48.png         # Extension icon (48x48)
├── icon128.png        # Extension icon (128x128)
└── README.md          # This file
```

## Development

### Debugging

1. **Content Script**:
   - Open page with F12
   - Look for `[POE Extension]` logs in console

2. **Background Worker**:
   - Go to `chrome://extensions/`
   - Click "service worker" link under extension
   - View logs and inspect state

3. **Popup**:
   - Right-click extension icon → Inspect popup
   - View console for popup-specific logs

### Making Changes

After modifying code:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card
3. Reload any open POE trade pages

## Security & Privacy

- ✅ Only runs on specified domains (POE trade website and local test page)
- ✅ No data sent to external servers
- ✅ All data stored locally in Chrome storage
- ✅ No network requests made by the extension
- ✅ Open source - inspect all code before installing

## Limitations

- Only works on Chromium-based browsers (Chrome, Edge, Brave, etc.)
- Requires manual confirmation after each auto-click (by design)
- Button search is text-based (must contain "hideout" in the text)
- Limited to 100 alerts in history (automatically cleaned)

## Known Issues

- None at this time

## Future Enhancements

- [ ] Customizable button text patterns
- [ ] Keyboard shortcuts
- [ ] Sound notifications
- [ ] Statistics dashboard
- [ ] Export alert log

## License

Free to use and modify for personal use.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console logs for errors
3. Test with the included test.html page
4. Verify extension permissions

## Version History

### v1.0.0 (2026-02-03)
- Initial release
- Alert interception
- Auto-click functionality
- User confirmation dialog
- Debug logging
- Test page
