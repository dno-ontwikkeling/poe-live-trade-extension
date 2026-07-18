// Background service worker
// State lives in chrome.storage.local (source of truth). MV3 workers get
// terminated when idle, so in-memory globals cannot be trusted between events.
const MAX_ALERTS = 20
const DEBUG = false
const POE_TRADE_MATCH = 'https://www.pathofexile.com/trade/*'

const log = (...args) => {
  if (DEBUG) console.log('[Background]', ...args)
}

// Read the full state with defaults. Returns a promise (MV3 storage API).
function getState () {
  return chrome.storage.local.get({
    extensionEnabled: false,
    autoClickEnabled: false,
    alertHistory: []
  })
}

// Function to check if URL is POE trade
function isPoeTradeUrl (url) {
  return url && url.startsWith('https://www.pathofexile.com/trade')
}

// Send a message to every open POE trade tab, ignoring tabs without a
// content script.
async function messageAllTradeTabs (message) {
  const tabs = await chrome.tabs.query({ url: POE_TRADE_MATCH })
  await Promise.all(
    tabs.map(tab =>
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        log('Could not message tab:', tab.id)
      })
    )
  )
}

// Function to inject scripts into a tab
async function injectScripts (tabId) {
  try {
    // Check if content script is already loaded
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
      if (response && response.alive) {
        log('Scripts already injected in tab:', tabId)
        return true
      }
    } catch (e) {
      // Content script not loaded, proceed with injection
      log('Content script not loaded, injecting into tab:', tabId)
    }

    // First inject the page context script that intercepts notifications
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['inject.js'],
      world: 'MAIN'
    })

    // Then inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    })

    log('Scripts injected successfully into tab:', tabId)
    return true
  } catch (error) {
    console.error('[Background] Failed to inject scripts:', error)
    return false
  }
}

// Listen for tab updates to auto-inject scripts on POE trade pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url || !isPoeTradeUrl(tab.url)) {
    return
  }
  const { extensionEnabled } = await getState()
  if (extensionEnabled) {
    log('Auto-injecting scripts into POE trade page:', tabId)
    await injectScripts(tabId)
  }
})

// Handle a single message. Always resolves to a response object so callers
// can rely on the response callback firing.
async function handleMessage (request, sender) {
  switch (request.type) {
    case 'setExtensionEnabled': {
      await chrome.storage.local.set({ extensionEnabled: request.enabled })
      log('Extension globally', request.enabled ? 'enabled' : 'disabled')
      if (request.enabled) {
        const tabs = await chrome.tabs.query({ url: POE_TRADE_MATCH })
        await Promise.all(tabs.map(tab => injectScripts(tab.id)))
      }
      return { success: true }
    }

    case 'getExtensionEnabled': {
      const { extensionEnabled } = await getState()
      return { enabled: extensionEnabled }
    }

    case 'injectScripts':
      return { success: await injectScripts(request.tabId) }

    case 'getTabId':
      return { tabId: sender.tab && sender.tab.id ? sender.tab.id : null }

    case 'alertIntercepted': {
      const { alertHistory } = await getState()
      alertHistory.push(request.alert)
      while (alertHistory.length > MAX_ALERTS) alertHistory.shift()
      await chrome.storage.local.set({ alertHistory })
      return { success: true }
    }

    case 'alertUpdated': {
      const { alertHistory } = await getState()
      if (alertHistory.length > 0) {
        alertHistory[alertHistory.length - 1] = request.alert
        await chrome.storage.local.set({ alertHistory })
      }
      return { success: true }
    }

    case 'showConfirmationOnAllTabs': {
      await messageAllTradeTabs({ action: 'showConfirmationNotification' })
      return { success: true }
    }

    case 'autoClickEnabled':
      await chrome.storage.local.set({ autoClickEnabled: true })
      return { success: true }

    case 'autoClickDisabled':
      await chrome.storage.local.set({ autoClickEnabled: false })
      return { success: true }

    case 'getAlertHistory': {
      const { alertHistory } = await getState()
      return { alerts: alertHistory }
    }

    case 'clearAlertHistory':
      await chrome.storage.local.set({ alertHistory: [] })
      return { success: true }

    case 'saveAutoClickState': {
      await chrome.storage.local.set({ autoClickEnabled: request.enabled })
      log('Saved global auto-click state:', request.enabled)
      await messageAllTradeTabs({
        action: request.enabled ? 'enableAutoClick' : 'disableAutoClick'
      })
      await messageAllTradeTabs({ action: 'closeConfirmationNotification' })
      return { success: true }
    }

    case 'getAutoClickState': {
      const { autoClickEnabled } = await getState()
      return { success: true, enabled: autoClickEnabled }
    }

    default:
      return { success: false, error: 'unknown message type: ' + request.type }
  }
}

// Listen for messages from content scripts and popup. Every handler is async,
// so we always keep the channel open (return true) and reply once resolved.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('[Background] Message handler error:', error)
      sendResponse({ success: false, error: String(error) })
    })
  return true
})

log('Service worker initialized')
