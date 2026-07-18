// Content script that monitors alerts and clicks the hideout button
console.log('[POE Extension] Content script file executing...')

// Prevent duplicate execution
if (window.__POE_CONTENT_SCRIPT_LOADED) {
  console.log('[POE Extension] Content script already loaded, skipping...')
} else {
  window.__POE_CONTENT_SCRIPT_LOADED = true

  ;(function () {
    'use strict'

    console.log('[POE Extension] Content script IIFE started')

    let extensionEnabled = true // Enabled by default when injected
    let autoClickEnabled = false // Auto-click DISABLED by default on startup
    let alertLog = []
    let currentTabId = null

    // Get current tab ID and load auto-click state from local storage
    chrome.runtime.sendMessage({ type: 'getTabId' }, response => {
      if (response && response.tabId) {
        currentTabId = response.tabId
        try {
          chrome.storage.local.get([`autoClick_${currentTabId}`], result => {
            if (chrome.runtime.lastError) {
              console.log(
                '[POE Extension] Could not access local storage:',
                chrome.runtime.lastError.message
              )
              return
            }
            if (result) {
              const savedState = result[`autoClick_${currentTabId}`]
              if (savedState !== undefined) {
                autoClickEnabled = savedState
                console.log(
                  '[POE Extension] Loaded auto-click state from storage:',
                  autoClickEnabled
                )
              }
            }
          })
        } catch (error) {
          console.log('[POE Extension] Storage access error:', error)
        }
      }
    })

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'ping') {
        // Respond to ping to indicate content script is loaded
        sendResponse({ alive: true })
      } else if (request.action === 'showConfirmationNotification') {
        // Show confirmation notification on this tab
        showConfirmationNotification()
        sendResponse({ success: true })
      } else if (request.action === 'closeConfirmationNotification') {
        // Close confirmation notification on this tab
        closeConfirmationNotification()
        sendResponse({ success: true })
      } else if (request.action === 'enableExtension') {
        extensionEnabled = true
        console.log('[POE Extension] Extension enabled')

        // Re-enable notification interception in page context
        window.postMessage({ type: 'POE_ENABLE_INTERCEPTION' }, '*')

        sendResponse({ success: true })
      } else if (request.action === 'disableExtension') {
        extensionEnabled = false
        autoClickEnabled = false
        console.log('[POE Extension] Extension disabled')

        // Disable notification interception in page context
        window.postMessage({ type: 'POE_DISABLE_INTERCEPTION' }, '*')

        // Save disabled state to local storage
        if (currentTabId) {
          try {
            const state = {}
            state[`autoClick_${currentTabId}`] = false
            chrome.storage.local.set(state, () => {
              if (chrome.runtime.lastError) {
                console.log(
                  '[POE Extension] Could not save to local storage:',
                  chrome.runtime.lastError.message
                )
              }
            })
          } catch (error) {
            console.log('[POE Extension] Storage access error:', error)
          }
        }

        sendResponse({ success: true })
      } else if (request.action === 'enableAutoClick') {
        autoClickEnabled = true
        console.log('[POE Extension] Auto-click re-enabled')

        // Save state to local storage
        if (currentTabId) {
          try {
            const state = {}
            state[`autoClick_${currentTabId}`] = true
            chrome.storage.local.set(state, () => {
              if (chrome.runtime.lastError) {
                console.log(
                  '[POE Extension] Could not save to local storage:',
                  chrome.runtime.lastError.message
                )
              }
            })
          } catch (error) {
            console.log('[POE Extension] Storage access error:', error)
          }
        }

        sendResponse({ success: true })
      } else if (request.action === 'disableAutoClick') {
        autoClickEnabled = false
        console.log('[POE Extension] Auto-click disabled')

        // Save state to local storage
        if (currentTabId) {
          try {
            const state = {}
            state[`autoClick_${currentTabId}`] = false
            chrome.storage.local.set(state, () => {
              if (chrome.runtime.lastError) {
                console.log(
                  '[POE Extension] Could not save to local storage:',
                  chrome.runtime.lastError.message
                )
              }
            })
          } catch (error) {
            console.log('[POE Extension] Storage access error:', error)
          }
        }

        sendResponse({ success: true })
      } else if (request.action === 'getAlertLog') {
        sendResponse({ alerts: alertLog })
      } else if (request.action === 'clearAlertLog') {
        alertLog = []
        sendResponse({ success: true })
      }
      return true
    })

    // Inject script into page context to intercept Notification
    // Note: This is now handled by popup.js using chrome.scripting.executeScript with world: 'MAIN'
    // No need to manually inject here anymore

    // Listen for messages from page context
    window.addEventListener('message', event => {
      if (event.source !== window) return

      console.log('[POE Extension] Message received:', event.data.type)

      if (event.data.type === 'POE_NOTIFICATION_INTERCEPTED') {
        handleInterceptedNotification(event.data.title, event.data.options)
      }
    })

    function handleInterceptedNotification (title, options) {
      console.log(
        '[POE Extension] Notification intercepted in content script:',
        title,
        options
      )

      const message =
        title + (options && options.body ? ' - ' + options.body : '')
      const alertEntry = {
        timestamp: new Date().toISOString(),
        message: message,
        action: 'intercepted'
      }

      alertLog.push(alertEntry)
      if (alertLog.length > 5) {
        alertLog.shift()
      }

      // Send message with error handling for invalidated context
      try {
        chrome.runtime.sendMessage({
          type: 'alertIntercepted',
          alert: alertEntry
        })
      } catch (error) {
        console.log(
          '[POE Extension] Could not send message (extension may have been reloaded):',
          error
        )
      }

      if (extensionEnabled) {
        if (autoClickEnabled) {
          console.log(
            '[POE Extension] Auto-click is enabled, disabling it and starting to poll for hideout button...'
          )

          // Disable auto-click FIRST
          autoClickEnabled = false

          // Save disabled state to local storage
          if (currentTabId) {
            try {
              const state = {}
              state[`autoClick_${currentTabId}`] = false
              chrome.storage.local.set(state, () => {
                if (chrome.runtime.lastError) {
                  console.log(
                    '[POE Extension] Could not save to local storage:',
                    chrome.runtime.lastError.message
                  )
                }
              })
            } catch (error) {
              console.log('[POE Extension] Storage access error:', error)
            }
          }

          // Notify that auto-click was disabled
          try {
            chrome.runtime.sendMessage({ type: 'autoClickDisabled' })
          } catch (error) {
            console.log('[POE Extension] Could not send message:', error)
          }

          // Start polling for hideout button
          pollForHideoutButton(alertEntry)
        } else {
          console.log(
            '[POE Extension] Auto-click is disabled, not clicking button...'
          )
          alertEntry.action = 'auto_click_disabled'
          
          try {
            chrome.runtime.sendMessage({
              type: 'alertUpdated',
              alert: alertEntry
            })
          } catch (error) {
            console.log('[POE Extension] Could not send message:', error)
          }
        }
      } else {
        console.log(
          '[POE Extension] Extension is disabled, ignoring notification'
        )
      }
    }

    // Function to poll for and click the "Travel to hideout" button
    function pollForHideoutButton (alertEntry) {
      const startTime = Date.now()
      const timeout = 4000 // 4 seconds
      const pollInterval = 20 // 20ms
      
      const poll = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= timeout) {
          console.log('[POE Extension] Timeout reached while polling for hideout button')
          alertEntry.action = 'button_not_found'
          
          try {
            chrome.runtime.sendMessage({
              type: 'alertUpdated',
              alert: alertEntry
            })
          } catch (error) {
            console.log('[POE Extension] Could not send message:', error)
          }
          return
        }
        
        const buttonClicked = findAndClickHideoutButton()
        
        if (!buttonClicked) {
          // Button not found or clicked, continue polling
          setTimeout(poll, pollInterval)
        } else {
          console.log('[POE Extension] Successfully clicked hideout button, stopping poll')
          alertEntry.action = 'button_clicked'

          // Notify background to show confirmation on all tabs
          console.log('[POE Extension] Sending showConfirmationOnAllTabs message')
          try {
            chrome.runtime.sendMessage({
              type: 'showConfirmationOnAllTabs',
              tabId: currentTabId
            })
            console.log('[POE Extension] showConfirmationOnAllTabs message sent successfully')
          } catch (error) {
            console.log('[POE Extension] Could not send showConfirmationOnAllTabs message:', error)
          }
          
          try {
            chrome.runtime.sendMessage({
              type: 'alertUpdated',
              alert: alertEntry
            })
          } catch (error) {
            console.log('[POE Extension] Could not send message:', error)
          }
          
          // Poll for the "In demand. Teleport anyway?" button with 4 second timeout
          pollForTeleportAnywayButton()
        }
      }
      
      // Start polling
      poll()
    }

    // Function to find and click the "Travel to hideout" button
    function findAndClickHideoutButton () {
      // Look for buttons with text "Travel to hideout" or similar
      const buttons = document.querySelectorAll(
        'button, a, input[type="button"], input[type="submit"]'
      )

      for (const button of buttons) {
        const text = button.textContent || button.value || ''
        if (
          text.toLowerCase().includes('travel to hideout') ||
          text.toLowerCase().includes('hideout')
        ) {
          console.log('[POE Extension] Found hideout button:', button)

          // Check if button is enabled
          if (!button.disabled && button.offsetParent !== null) {
            // Click the button once
            button.click()
            console.log('[POE Extension] Clicked hideout button')
            return true
          } else {
            console.log('[POE Extension] Button found but disabled or hidden')
          }
        }
      }

      return false
    }

    // Function to poll for and click the "In demand. Teleport anyway?" button
    function pollForTeleportAnywayButton () {
      const startTime = Date.now()
      const timeout = 4000 // 4 seconds
      const pollInterval = 20 // 20ms
      
      const poll = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= timeout) {
          console.log('[POE Extension] Timeout reached while polling for "Teleport anyway" button')
          return
        }
        
        const buttonClicked = findAndClickTeleportAnywayButton()
        
        if (!buttonClicked) {
          // Button not found or clicked, continue polling
          setTimeout(poll, pollInterval)
        } else {
          console.log('[POE Extension] Successfully clicked "Teleport anyway" button, stopping poll')
        }
      }
      
      // Start polling
      poll()
    }

    // Function to find and click the "In demand. Teleport anyway?" button
    function findAndClickTeleportAnywayButton () {
      const buttons = document.querySelectorAll(
        'button, a, input[type="button"], input[type="submit"]'
      )

      for (const button of buttons) {
        const text = button.textContent || button.value || ''
        if (
          text.toLowerCase().includes('in demand') ||
          text.toLowerCase().includes('teleport anyway')
        ) {
          console.log('[POE Extension] Found "Teleport anyway" button:', button)

          // Check if button is enabled
          if (!button.disabled && button.offsetParent !== null) {
            // Click the button
            button.click()
            console.log('[POE Extension] Clicked "Teleport anyway" button')
            return true
          } else {
            console.log('[POE Extension] "Teleport anyway" button found but disabled or hidden')
          }
        }
      }

      return false
    }

    // Function to close the confirmation notification
    function closeConfirmationNotification () {
      const notification = document.getElementById('poe-extension-notification')
      if (notification) {
        notification.style.animation = 'slideOut 0.3s ease-out'
        setTimeout(() => notification.remove(), 300)
        console.log('[POE Extension] Notification closed')
      }
    }

    // Function to show on-page confirmation notification
    function showConfirmationNotification () {
      // Remove any existing notification
      const existingNotification = document.getElementById('poe-extension-notification')
      if (existingNotification) {
        existingNotification.remove()
      }

      // Create notification element
      const notification = document.createElement('div')
      notification.id = 'poe-extension-notification'
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4a5568;
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
      `

      notification.innerHTML = `
        <style>
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(400px);
              opacity: 0;
            }
          }
          #poe-extension-notification h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
            font-weight: 600;
          }
          #poe-extension-notification p {
            margin: 0 0 15px 0;
            font-size: 14px;
            opacity: 0.95;
          }
          #poe-extension-notification .button-container {
            display: flex;
            gap: 10px;
          }
          #poe-extension-notification button {
            flex: 1;
            padding: 10px 15px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          #poe-extension-notification .btn-continue {
            background: white;
            color: #667eea;
          }
          #poe-extension-notification .btn-continue:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
          }
          #poe-extension-notification .btn-cancel {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
          #poe-extension-notification .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        </style>
        <h3>✅ Hideout Button Clicked</h3>
        <p>Auto-click has been disabled. Would you like to continue monitoring?</p>
        <div class="button-container">
          <button class="btn-continue" id="poe-continue-btn">Continue Monitoring</button>
          <button class="btn-cancel" id="poe-cancel-btn">Stay Disabled</button>
        </div>
      `

      document.body.appendChild(notification)

      // Handle continue button
      document.getElementById('poe-continue-btn').addEventListener('click', () => {
        console.log('[POE Extension] User chose to continue monitoring')
        
        // Re-enable auto-click locally
        autoClickEnabled = true
        
        // Save state globally for all tabs and close notifications on all tabs
        try {
          chrome.runtime.sendMessage({ type: 'saveAutoClickState', enabled: true }, (response) => {
            if (response && response.success) {
              console.log('[POE Extension] Auto-click enabled globally for all tabs')
            }
          })
        } catch (error) {
          console.log('[POE Extension] Could not send message:', error)
        }
        
        // Close notification with animation (will be closed on all tabs by background message)
        notification.style.animation = 'slideOut 0.3s ease-out'
        setTimeout(() => notification.remove(), 300)
      })

      // Handle cancel button
      document.getElementById('poe-cancel-btn').addEventListener('click', () => {
        console.log('[POE Extension] User chose to stay disabled')
        
        // Disable auto-click globally for all tabs and close notifications on all tabs
        try {
          chrome.runtime.sendMessage({ type: 'saveAutoClickState', enabled: false }, (response) => {
            if (response && response.success) {
              console.log('[POE Extension] Auto-click disabled globally for all tabs')
            }
          })
        } catch (error) {
          console.log('[POE Extension] Could not send message:', error)
        }
        
        // Close notification with animation (will be closed on all tabs by background message)
        notification.style.animation = 'slideOut 0.3s ease-out'
        setTimeout(() => notification.remove(), 300)
      })
    }

    // Initialize
    console.log(
      '[POE Extension] Content script initialized - Extension enabled:',
      extensionEnabled,
      'Auto-click:',
      autoClickEnabled
    )
  })()
}
