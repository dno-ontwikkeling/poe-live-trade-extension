// This script runs in the page context to intercept the Notification API.
;(function () {
  const DEBUG = false
  const log = (...args) => {
    if (DEBUG) console.log('[POE Extension - Page Context]', ...args)
  }

  // Prevent duplicate execution
  if (window.__POE_EXTENSION_INJECTED) {
    log('Already injected, skipping...')
    return
  }
  window.__POE_EXTENSION_INJECTED = true

  const OriginalNotification = window.Notification
  let interceptEnabled = true

  if (!OriginalNotification) {
    log('Notification API not available')
    return
  }

  // Wrap the constructor with a Proxy so prototype chain, static properties
  // (including a live Notification.permission) and `instanceof` keep working.
  window.Notification = new Proxy(OriginalNotification, {
    construct (target, args) {
      if (interceptEnabled) {
        log('Intercepting notification:', args[0])
        window.postMessage(
          {
            type: 'POE_NOTIFICATION_INTERCEPTED',
            title: args[0],
            options: args[1]
          },
          '*'
        )
      }
      return new target(...args)
    }
  })

  // Listen for enable/disable messages from the content script
  window.addEventListener('message', event => {
    if (event.source !== window) return

    if (event.data.type === 'POE_DISABLE_INTERCEPTION') {
      log('Disabling notification interception')
      interceptEnabled = false
    } else if (event.data.type === 'POE_ENABLE_INTERCEPTION') {
      log('Enabling notification interception')
      interceptEnabled = true
    }
  })

  log('Notification interceptor installed successfully')
})()
