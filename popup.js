// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const enableExtensionCheckbox = document.getElementById('enableExtension')
  const statusText = document.getElementById('statusText')
  const statusIndicator = document.querySelector('.status-indicator')
  const monitoringStatus = document.getElementById('monitoringStatus')
  const autoClickToggle = document.getElementById('autoClickToggle')
  const clearLogBtn = document.getElementById('clearLog')
  const alertLogDiv = document.getElementById('alertLog')

  let currentTabId = null

  // Load settings and check current tab
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      currentTabId = tabs[0].id
      console.log('[Popup] Current tab ID:', currentTabId)

      // Load settings and alert log
      loadAlertLog()
      checkCurrentTab()
    }
  })

  // Settings toggle - enables extension globally and monitors POE trade pages
  enableExtensionCheckbox.addEventListener('change', async e => {
    const enabled = e.target.checked

    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      if (!tabs[0]) {
        showNotification('No active tab found', 'warning')
        enableExtensionCheckbox.checked = !enabled
        return
      }

      const tab = tabs[0]
      currentTabId = tab.id
      const isPoeTradeUrl =
        tab.url && tab.url.startsWith('https://www.pathofexile.com/trade')

      if (enabled) {
        // Enable extension globally
        chrome.runtime.sendMessage(
          { type: 'setExtensionEnabled', enabled: true },
          response => {
            if (response && response.success) {
              updateStatus(true)

              // Reload all POE trade tabs to ensure clean script injection
              chrome.tabs.query(
                { url: 'https://www.pathofexile.com/trade/*' },
                tabs => {
                  tabs.forEach(tab => {
                    console.log('Reloading POE trade tab:', tab.id)
                    chrome.tabs.reload(tab.id)
                  })
                }
              )

              if (isPoeTradeUrl) {
                monitoringStatus.textContent =
                  '✅ Monitoring active! Page will reload...'
                monitoringStatus.style.color = '#4caf50'
                showNotification(
                  'Extension enabled! Reloading page...',
                  'success'
                )
              } else {
                monitoringStatus.textContent =
                  '✅ Extension enabled (only works on POE trade pages)'
                monitoringStatus.style.color = '#4caf50'
                showNotification(
                  'Extension enabled! Visit POE trade to activate',
                  'success'
                )
              }
            } else {
              console.error('Failed to enable extension')
              showNotification('Failed to enable extension', 'warning')
              enableExtensionCheckbox.checked = false
            }
          }
        )
      } else {
        // Disable extension globally
        chrome.runtime.sendMessage(
          { type: 'setExtensionEnabled', enabled: false },
          response => {
            if (response && response.success) {
              // Reload all POE trade tabs to clean up scripts
              chrome.tabs.query(
                { url: 'https://www.pathofexile.com/trade/*' },
                tabs => {
                  tabs.forEach(tab => {
                    console.log('Reloading POE trade tab:', tab.id)
                    chrome.tabs.reload(tab.id)
                  })
                }
              )

              monitoringStatus.textContent =
                'Extension disabled - Page will reload...'
              monitoringStatus.style.color = '#999'
              updateStatus(false)
              showNotification(
                'Extension disabled - Reloading page...',
                'warning'
              )
            }
          }
        )
      }
    })
  })

  // Auto-click toggle
  autoClickToggle.addEventListener('change', e => {
    const enabled = e.target.checked

    // Save global auto-click state
    chrome.runtime.sendMessage(
      { type: 'saveAutoClickState', enabled: enabled },
      response => {
        if (response && response.success) {
          showNotification(
            enabled
              ? 'Auto-click enabled globally'
              : 'Auto-click disabled globally',
            enabled ? 'success' : 'warning'
          )
        } else {
          showNotification('Failed to save auto-click state', 'warning')
          autoClickToggle.checked = !enabled
        }
      }
    )
  })

  // Clear log button
  clearLogBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'clearAlertHistory' }, response => {
      if (response && response.success) {
        alertLogDiv.innerHTML =
          '<p class="empty-state">No alerts intercepted yet</p>'
        showNotification('Log cleared', 'success')
      }
    })

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'clearAlertLog' }, () => {
          // Ignore errors if content script not available
          if (chrome.runtime.lastError) {
            console.log('Content script not available on this tab')
          }
        })
      }
    })
  })

  // Check if current tab is being monitored
  function checkCurrentTab () {
    if (!currentTabId) {
      console.log('[Popup] No current tab ID set')
      return
    }

    // Load global extension state from storage.local
    chrome.runtime.sendMessage({ type: 'getExtensionEnabled' }, response => {
      const isEnabled = response && response.enabled
      enableExtensionCheckbox.checked = isEnabled

      // Load global auto-click state
      chrome.runtime.sendMessage({ type: 'getAutoClickState' }, response => {
        const autoClickEnabled = response && response.enabled === true

        console.log(
          '[Popup] Extension enabled:',
          isEnabled,
          'Auto-click (global):',
          autoClickEnabled
        )

        // Auto-click toggle state
        autoClickToggle.checked = autoClickEnabled
        console.log('[Popup] Setting toggle to:', autoClickToggle.checked)

        // Check if current tab is POE trade
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const isPoeTradeUrl =
            tabs[0] &&
            tabs[0].url &&
            tabs[0].url.startsWith('https://www.pathofexile.com/trade')

          if (isEnabled) {
            if (isPoeTradeUrl) {
              monitoringStatus.textContent =
                '✅ Monitoring active on this page!'
              monitoringStatus.style.color = '#4caf50'
            } else {
              monitoringStatus.textContent =
                '✅ Extension enabled (only works on POE trade pages)'
              monitoringStatus.style.color = '#4caf50'
            }
            updateStatus(true)
          } else {
            monitoringStatus.textContent =
              'Toggle extension above to start monitoring'
            monitoringStatus.style.color = '#999'
            updateStatus(false)
          }
        })
      })
    })
  }

  // Update status display
  function updateStatus (enabled) {
    if (enabled) {
      statusText.textContent = 'Active - Monitoring alerts'
      statusIndicator.classList.add('active')
      statusIndicator.classList.remove('inactive')
    } else {
      statusText.textContent = 'Inactive - Extension disabled'
      statusIndicator.classList.remove('active')
      statusIndicator.classList.add('inactive')
    }
  }

  // Load alert log
  function loadAlertLog () {
    chrome.runtime.sendMessage({ type: 'getAlertHistory' }, response => {
      if (response && response.alerts) {
        displayAlerts(response.alerts)
      }
    })
  }

  // Display alerts in the log
  function displayAlerts (alerts) {
    if (alerts.length === 0) {
      alertLogDiv.innerHTML =
        '<p class="empty-state">No alerts intercepted yet</p>'
      return
    }

    alertLogDiv.innerHTML = ''

    // Show most recent first
    const recentAlerts = [...alerts].reverse().slice(0, 20)

    recentAlerts.forEach(alert => {
      const alertItem = document.createElement('div')
      alertItem.className = 'alert-item'

      const timestamp = new Date(alert.timestamp).toLocaleTimeString()
      const actionBadge = getActionBadge(alert.action)

      alertItem.innerHTML = `
        <div class="alert-header">
          <span class="alert-time">${timestamp}</span>
          ${actionBadge}
        </div>
        <div class="alert-message">${escapeHtml(alert.message)}</div>
      `

      alertLogDiv.appendChild(alertItem)
    })
  }

  // Get action badge HTML
  function getActionBadge (action) {
    const badges = {
      intercepted: '<span class="badge badge-info">Intercepted</span>',
      button_clicked: '<span class="badge badge-success">Button Clicked</span>',
      button_not_found:
        '<span class="badge badge-warning">Button Not Found</span>'
    }
    return badges[action] || '<span class="badge">Unknown</span>'
  }

  // Escape HTML to prevent XSS
  function escapeHtml (text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Show notification
  function showNotification (message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.add('show')
    }, 10)

    setTimeout(() => {
      notification.classList.remove('show')
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 2000)
  }

  // Refresh log every 2 seconds
  setInterval(loadAlertLog, 2000)
})
