// This script runs in the page context to intercept Notification API
;(function () {
  // Prevent duplicate execution
  if (window.__POE_EXTENSION_INJECTED) {
    console.log('[POE Extension - Page Context] Already injected, skipping...')
    return
  }
  window.__POE_EXTENSION_INJECTED = true

  console.log('[POE Extension - Page Context] Starting injection...')
  const OriginalNotification = window.Notification
  let interceptEnabled = true

  if (OriginalNotification) {
    // Store original in a way we can restore it
    window.__POE_OriginalNotification = OriginalNotification

    window.Notification = function (title, options) {
      console.log(
        '[POE Extension - Page Context] Notification created:',
        title,
        options
      )

      // Only intercept if enabled
      if (interceptEnabled) {
        console.log('[POE Extension - Page Context] Intercepting notification')
        // Send message to content script
        window.postMessage(
          {
            type: 'POE_NOTIFICATION_INTERCEPTED',
            title: title,
            options: options
          },
          '*'
        )
      }

      // Create the original notification
      return new OriginalNotification(title, options)
    }

    // Copy static properties
    window.Notification.permission = OriginalNotification.permission
    window.Notification.requestPermission =
      OriginalNotification.requestPermission.bind(OriginalNotification)

    // Listen for enable/disable messages
    window.addEventListener('message', event => {
      if (event.source !== window) return

      if (event.data.type === 'POE_DISABLE_INTERCEPTION') {
        console.log(
          '[POE Extension - Page Context] Disabling notification interception'
        )
        interceptEnabled = false
      } else if (event.data.type === 'POE_ENABLE_INTERCEPTION') {
        console.log(
          '[POE Extension - Page Context] Enabling notification interception'
        )
        interceptEnabled = true
      }
    })

    console.log(
      '[POE Extension - Page Context] Notification interceptor installed successfully'
    )
  } else {
    console.log('[POE Extension - Page Context] Notification API not available')
  }
})()
