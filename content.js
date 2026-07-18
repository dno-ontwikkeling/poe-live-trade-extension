// Content script that monitors intercepted notifications and clicks the
// "Travel to hideout" button.
if (window.__POE_CONTENT_SCRIPT_LOADED) {
  console.log('[POE Extension] Content script already loaded, skipping...')
} else {
  window.__POE_CONTENT_SCRIPT_LOADED = true

  ;(function () {
    'use strict'

    const DEBUG = false
    const BUTTON_TIMEOUT = 4000 // give the button up to 4s to appear
    const MAX_ALERTS = 20

    const log = (...args) => {
      if (DEBUG) console.log('[POE Extension]', ...args)
    }

    let extensionEnabled = true // Enabled by default when injected
    let autoClickEnabled = false // Auto-click DISABLED by default on startup
    let alertLog = []

    // Send a message to the background worker, swallowing errors that happen
    // when the extension has been reloaded and the context is invalidated.
    function sendBg (message, callback) {
      try {
        chrome.runtime.sendMessage(message, response => {
          if (chrome.runtime.lastError) {
            log('sendMessage error:', chrome.runtime.lastError.message)
            return
          }
          if (callback) callback(response)
        })
      } catch (error) {
        log('Could not send message (extension may have been reloaded):', error)
      }
    }

    // Load the global auto-click state from the background worker.
    sendBg({ type: 'getAutoClickState' }, response => {
      if (response && typeof response.enabled === 'boolean') {
        autoClickEnabled = response.enabled
        log('Loaded auto-click state:', autoClickEnabled)
      }
    })

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'ping':
          sendResponse({ alive: true })
          break
        case 'showConfirmationNotification':
          showConfirmationNotification()
          sendResponse({ success: true })
          break
        case 'closeConfirmationNotification':
          closeConfirmationNotification()
          sendResponse({ success: true })
          break
        case 'enableExtension':
          extensionEnabled = true
          window.postMessage({ type: 'POE_ENABLE_INTERCEPTION' }, '*')
          sendResponse({ success: true })
          break
        case 'disableExtension':
          extensionEnabled = false
          autoClickEnabled = false
          window.postMessage({ type: 'POE_DISABLE_INTERCEPTION' }, '*')
          sendResponse({ success: true })
          break
        case 'enableAutoClick':
          autoClickEnabled = true
          sendResponse({ success: true })
          break
        case 'disableAutoClick':
          autoClickEnabled = false
          sendResponse({ success: true })
          break
        case 'getAlertLog':
          sendResponse({ alerts: alertLog })
          break
        case 'clearAlertLog':
          alertLog = []
          sendResponse({ success: true })
          break
        default:
          sendResponse({ success: false })
      }
      // All responses are synchronous; no need to keep the channel open.
      return false
    })

    // Listen for messages from the page context (inject.js)
    window.addEventListener('message', event => {
      if (event.source !== window) return
      if (event.data && event.data.type === 'POE_NOTIFICATION_INTERCEPTED') {
        handleInterceptedNotification(event.data.title, event.data.options)
      }
    })

    function handleInterceptedNotification (title, options) {
      log('Notification intercepted:', title, options)

      const message =
        title + (options && options.body ? ' - ' + options.body : '')
      const alertEntry = {
        timestamp: new Date().toISOString(),
        message,
        action: 'intercepted'
      }

      alertLog.push(alertEntry)
      while (alertLog.length > MAX_ALERTS) alertLog.shift()

      sendBg({ type: 'alertIntercepted', alert: alertEntry })

      if (!extensionEnabled) {
        log('Extension disabled, ignoring notification')
        return
      }

      if (!autoClickEnabled) {
        log('Auto-click disabled, not clicking')
        alertEntry.action = 'auto_click_disabled'
        sendBg({ type: 'alertUpdated', alert: alertEntry })
        return
      }

      // Disable auto-click first so a single alert triggers a single click,
      // and persist it globally so other tabs stop too.
      autoClickEnabled = false
      sendBg({ type: 'autoClickDisabled' })

      startHideoutFlow(alertEntry)
    }

    // Wait for a button matching `matches` to appear, then click it. Uses a
    // MutationObserver instead of tight polling. Falls back to `onTimeout`
    // after BUTTON_TIMEOUT ms.
    function waitForButton (matches, onFound, onTimeout) {
      if (clickMatchingButton(matches)) {
        onFound()
        return
      }

      let settled = false
      const finish = found => {
        if (settled) return
        settled = true
        observer.disconnect()
        clearTimeout(timer)
        if (found) onFound()
        else if (onTimeout) onTimeout()
      }

      const observer = new MutationObserver(() => {
        if (clickMatchingButton(matches)) finish(true)
      })
      observer.observe(document.body, { childList: true, subtree: true })

      const timer = setTimeout(() => finish(false), BUTTON_TIMEOUT)
    }

    // Find the first visible, enabled clickable element whose text matches,
    // click it, and report whether a click happened.
    function clickMatchingButton (matches) {
      const elements = document.querySelectorAll(
        'button, a, input[type="button"], input[type="submit"]'
      )

      for (const el of elements) {
        const text = (el.textContent || el.value || '').trim().toLowerCase()
        if (!matches(text)) continue
        if (el.disabled || el.offsetParent === null) {
          log('Matching button found but disabled or hidden')
          continue
        }
        el.click()
        log('Clicked button:', text)
        return true
      }
      return false
    }

    // Match only the actual "Travel to hideout" button, not any element that
    // merely mentions the word "hideout".
    const isHideoutButton = text => text.includes('travel to hideout')
    const isTeleportButton = text =>
      text.includes('teleport anyway') || text.includes('in demand')

    function startHideoutFlow (alertEntry) {
      waitForButton(
        isHideoutButton,
        () => {
          alertEntry.action = 'button_clicked'
          sendBg({ type: 'showConfirmationOnAllTabs' })
          sendBg({ type: 'alertUpdated', alert: alertEntry })

          // After the hideout click, handle the "In demand. Teleport anyway?"
          // confirmation if it shows up.
          waitForButton(isTeleportButton, () => {}, () => {})
        },
        () => {
          log('Timeout waiting for hideout button')
          alertEntry.action = 'button_not_found'
          sendBg({ type: 'alertUpdated', alert: alertEntry })
        }
      )
    }

    // Close the on-page confirmation notification
    function closeConfirmationNotification () {
      const notification = document.getElementById('poe-extension-notification')
      if (notification) {
        notification.style.animation = 'poeSlideOut 0.28s ease-out forwards'
        setTimeout(() => notification.remove(), 300)
      }
    }

    // Show on-page confirmation notification after an auto-click
    function showConfirmationNotification () {
      const existing = document.getElementById('poe-extension-notification')
      if (existing) existing.remove()

      const notification = document.createElement('div')
      notification.id = 'poe-extension-notification'
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(180deg, #1e2126 0%, #16181c 100%);
        color: #e8e9ec;
        padding: 18px 20px 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.5;
        min-width: 320px;
        max-width: 380px;
        animation: poeSlideIn 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      `

      notification.innerHTML = `
        <style>
          @keyframes poeSlideIn {
            from { transform: translateX(420px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes poeSlideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(420px); opacity: 0; }
          }
          #poe-extension-notification * { box-sizing: border-box; }
          #poe-extension-notification .poe-head {
            display: flex;
            align-items: center;
            gap: 11px;
            margin-bottom: 10px;
          }
          #poe-extension-notification .poe-check {
            flex-shrink: 0;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: rgba(34, 197, 94, 0.16);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          #poe-extension-notification h3 {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: -0.01em;
            color: #f3f4f6;
          }
          #poe-extension-notification p {
            margin: 0 0 16px 0;
            font-size: 13px;
            color: #9195a0;
          }
          #poe-extension-notification .button-container {
            display: flex;
            gap: 10px;
          }
          #poe-extension-notification button {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid transparent;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s, transform 0.1s;
          }
          #poe-extension-notification button:active { transform: scale(0.98); }
          #poe-extension-notification .btn-continue {
            background: #ff6b35;
            color: #1a0f08;
          }
          #poe-extension-notification .btn-continue:hover { background: #ff7d4d; }
          #poe-extension-notification .btn-cancel {
            background: rgba(255, 255, 255, 0.05);
            color: #c9ccd3;
            border-color: rgba(255, 255, 255, 0.1);
          }
          #poe-extension-notification .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #e8e9ec;
          }
        </style>
        <div class="poe-head">
          <span class="poe-check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <h3>Hideout button clicked</h3>
        </div>
        <p>Auto-click is now off. Keep monitoring for the next alert?</p>
        <div class="button-container">
          <button class="btn-continue" id="poe-continue-btn">Continue monitoring</button>
          <button class="btn-cancel" id="poe-cancel-btn">Stay disabled</button>
        </div>
      `

      document.body.appendChild(notification)

      document
        .getElementById('poe-continue-btn')
        .addEventListener('click', () => {
          log('User chose to continue monitoring')
          autoClickEnabled = true
          // Persist globally; background closes notifications on all tabs.
          sendBg({ type: 'saveAutoClickState', enabled: true })
          closeConfirmationNotification()
        })

      document
        .getElementById('poe-cancel-btn')
        .addEventListener('click', () => {
          log('User chose to stay disabled')
          sendBg({ type: 'saveAutoClickState', enabled: false })
          closeConfirmationNotification()
        })
    }

    // Readiness marker in the shared DOM so tests (and debugging) can tell the
    // content script is live and listening for intercepted notifications.
    document.documentElement.setAttribute('data-poe-ready', '1')

    log(
      'Content script initialized - enabled:',
      extensionEnabled,
      'auto-click:',
      autoClickEnabled
    )
  })()
}
