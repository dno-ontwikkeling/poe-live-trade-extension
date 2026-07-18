// Background service worker
let alertHistory = []
let extensionEnabled = false
let autoClickEnabled = false

// Initialize extension state from storage
chrome.storage.local.get(['extensionEnabled', 'autoClickEnabled'], result => {
  extensionEnabled =
    result.extensionEnabled !== undefined ? result.extensionEnabled : false
  autoClickEnabled =
    result.autoClickEnabled !== undefined ? result.autoClickEnabled : false
  console.log(
    '[Background] Extension initialized - Enabled:',
    extensionEnabled,
    'Auto-click:',
    autoClickEnabled
  )
})

// Function to check if URL is POE trade
function isPoeTradeUrl (url) {
  return url && url.startsWith('https://www.pathofexile.com/trade')
}

// Function to inject scripts into a tab
async function injectScripts (tabId) {
  try {
    console.log(
      '[Background] Checking if scripts need injection for tab:',
      tabId
    )

    // Check if content script is already loaded
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
      if (response && response.alive) {
        console.log('[Background] Scripts already injected in tab:', tabId)
        return true
      }
    } catch (e) {
      // Content script not loaded, proceed with injection
      console.log('[Background] Content script not loaded, injecting...')
    }

    console.log('[Background] Injecting scripts into tab:', tabId)

    // First inject the page context script that intercepts notifications
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['inject.js'],
      world: 'MAIN'
    })

    // Then inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    })

    console.log('[Background] Scripts injected successfully')
    return true
  } catch (error) {
    console.error('[Background] Failed to inject scripts:', error)
    return false
  }
}

// Listen for tab updates to auto-inject scripts on POE trade pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only inject when page finishes loading on POE trade URLs
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    extensionEnabled &&
    isPoeTradeUrl(tab.url)
  ) {
    console.log(
      '[Background] Auto-injecting scripts into POE trade page:',
      tabId
    )
    await injectScripts(tabId)
  }
})

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'setExtensionEnabled') {
    // Update global extension enabled state
    extensionEnabled = request.enabled
    chrome.storage.local.set({ extensionEnabled: extensionEnabled })
    console.log(
      '[Background] Extension globally',
      extensionEnabled ? 'enabled' : 'disabled'
    )

    // If enabling, inject into current POE trade tabs
    if (extensionEnabled) {
      chrome.tabs.query(
        { url: 'https://www.pathofexile.com/trade/*' },
        tabs => {
          tabs.forEach(tab => {
            console.log(
              '[Background] Injecting into existing POE trade tab:',
              tab.id
            )
            injectScripts(tab.id)
          })
        }
      )
    }

    sendResponse({ success: true })
    return true
  } else if (request.type === 'getExtensionEnabled') {
    sendResponse({ enabled: extensionEnabled })
    return true
  } else if (request.type === 'injectScripts') {
    // Handle script injection request from popup
    injectScripts(request.tabId).then(success => {
      sendResponse({ success })
    })
    return true
  } else if (request.type === 'getTabId') {
    // Return the tab ID to content script
    if (sender.tab && sender.tab.id) {
      sendResponse({ tabId: sender.tab.id })
    } else {
      sendResponse({ tabId: null })
    }
  } else if (request.type === 'alertIntercepted') {
    console.log('[Background] Alert intercepted:', request.alert)
    alertHistory.push(request.alert)

    // Keep only last 5 alerts
    if (alertHistory.length > 5) {
      alertHistory.shift()
    }
  } else if (request.type === 'alertUpdated') {
    console.log('[Background] Alert updated:', request.alert)
    // Update the last alert in history
    if (alertHistory.length > 0) {
      alertHistory[alertHistory.length - 1] = request.alert
    }
  } else if (request.type === 'showConfirmationOnAllTabs') {
    console.log('[Background] Showing confirmation on all POE trade tabs')
    // Show confirmation notification on all POE trade tabs
    chrome.tabs.query({ url: 'https://www.pathofexile.com/trade/*' }, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'showConfirmationNotification' },
          () => {
            // Ignore errors if content script not loaded
            if (chrome.runtime.lastError) {
              console.log('[Background] Could not show confirmation on tab:', tab.id)
            }
          }
        )
      })
    })
    sendResponse({ success: true })
  } else if (request.type === 'autoClickEnabled') {
    console.log('[Background] Auto-click enabled')
    autoClickEnabled = true
    chrome.storage.local.set({ autoClickEnabled: true })
  } else if (request.type === 'autoClickDisabled') {
    console.log('[Background] Auto-click disabled')
    autoClickEnabled = false
    chrome.storage.local.set({ autoClickEnabled: false })
  } else if (request.type === 'getAlertHistory') {
    sendResponse({ alerts: alertHistory })
  } else if (request.type === 'clearAlertHistory') {
    alertHistory = []
    sendResponse({ success: true })
  } else if (request.type === 'saveAutoClickState') {
    // Save global auto-click state
    autoClickEnabled = request.enabled
    chrome.storage.local.set({ autoClickEnabled: autoClickEnabled }, () => {
      if (chrome.runtime.lastError) {
        console.log(
          '[Background] Could not save auto-click state:',
          chrome.runtime.lastError.message
        )
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        })
      } else {
        console.log(
          '[Background] Successfully saved global auto-click state:',
          autoClickEnabled
        )

        // Notify all POE trade tabs about the state change
        chrome.tabs.query(
          { url: 'https://www.pathofexile.com/trade/*' },
          tabs => {
            tabs.forEach(tab => {
              // Update auto-click state
              chrome.tabs.sendMessage(
                tab.id,
                {
                  action: autoClickEnabled
                    ? 'enableAutoClick'
                    : 'disableAutoClick'
                },
                () => {
                  // Ignore errors if content script not loaded
                  if (chrome.runtime.lastError) {
                    console.log('[Background] Could not notify tab:', tab.id)
                  }
                }
              )
              
              // Close confirmation notifications on all tabs
              chrome.tabs.sendMessage(
                tab.id,
                { action: 'closeConfirmationNotification' },
                () => {
                  // Ignore errors if content script not loaded
                  if (chrome.runtime.lastError) {
                    console.log('[Background] Could not close notification on tab:', tab.id)
                  }
                }
              )
            })
          }
        )

        sendResponse({ success: true })
      }
    })
    return true
  } else if (request.type === 'getAutoClickState') {
    // Get global auto-click state
    sendResponse({ success: true, enabled: autoClickEnabled })
    return true
  }

  return true
})

console.log('[Background] Service worker initialized')
