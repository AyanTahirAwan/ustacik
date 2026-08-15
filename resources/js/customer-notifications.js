async function loadCustomerNotifications() {
  const page = document.getElementById('customer-notifications-page')

  if (!page) {
    return
  }

  const loading = document.getElementById('customer-notifications-loading')
  const error = document.getElementById('customer-notifications-error')
  const errorMessage = document.getElementById('customer-notifications-error-message')
  const content = document.getElementById('customer-notifications-content')
  const emptyState = document.getElementById('customer-notifications-empty')
  const list = document.getElementById('customer-notifications-list')
  const unreadCount = document.getElementById('customer-notifications-unread-count')
  const readAllButton = document.getElementById('customer-notifications-read-all')
  const csrfInput = document.querySelector('#customer-notifications-csrf-form input[name="_csrf"]')
  let notificationsStore = []

  const isTr = window.APP_LOCALE === 'tr'

  async function apiPatch(url) {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'x-csrf-token': csrfInput?.value || '',
      },
      credentials: 'same-origin',
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload.message || 'Notification operation failed')
    }
    return payload
  }

  function formatNotificationType(type) {
    const formatted = type
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      
    if (!isTr) return formatted
    
    const typeMap = {
      'system': 'Sistem',
      'job_request': 'Hizmet Talebi',
      'job_accepted': 'Talep Onaylandı',
      'job_declined': 'Talep Reddedildi',
      'job_started': 'İş Başladı',
      'job_completed': 'İş Tamamlandı',
      'review': 'Değerlendirme'
    }
    
    return typeMap[type] || formatted
  }

  function formatSentAt(value) {
    if (!value) {
      return isTr ? 'Tarih bilgisi yok' : 'Date unavailable'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return isTr ? 'Tarih bilgisi yok' : 'Date unavailable'
    }

    return new Intl.DateTimeFormat(isTr ? 'tr' : 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName)
    if (className) element.className = className
    element.textContent = text
    return element
  }

  function updateHeaderCount(count) {
    const headerBadge = document.querySelector('[data-notification-count]')
    if (headerBadge) {
      headerBadge.textContent = String(count)
      headerBadge.hidden = count === 0
    }
  }

  function renderNotifications(notifications) {
    notificationsStore = notifications
    list.replaceChildren()
    emptyState.hidden = notifications.length !== 0

    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead
    )

    const count = unreadNotifications.length
    updateHeaderCount(count)

    if (count > 0) {
      unreadCount.textContent = `${count} ${isTr ? 'okunmamış' : 'unread'}`
      unreadCount.hidden = false
      if (readAllButton) readAllButton.hidden = false
    } else {
      unreadCount.hidden = true
      if (readAllButton) readAllButton.hidden = true
    }

    const tNotif = (text) => {
      if (!isTr) return text;
      const map = {
        'Request accepted': 'Talebiniz Kabul Edildi',
        'Request declined': 'Talebiniz Reddedildi',
        'Work started': 'İş Başladı',
        'Work completed': 'İş Tamamlandı',
        'New service request': 'Yeni Hizmet Talebi',
        'New customer review': 'Yeni Müşteri Değerlendirmesi',
        'Your service request was accepted.': 'Hizmet talebiniz kabul edildi.',
        'Your service request was declined.': 'Hizmet talebiniz reddedildi.',
        'Work on your service request has started.': 'Hizmet talebiniz üzerinde çalışmaya başlandı.',
        'Your service request has been completed.': 'Hizmet talebiniz tamamlandı.',
        'You have a new service request.': 'Yeni bir hizmet talebiniz var.',
        'You received a new customer review.': 'Yeni bir müşteri değerlendirmesi aldınız.'
      }
      return map[text] || text
    }

    notifications.forEach((notification) => {
      const item = document.createElement('article')
      const topRow = document.createElement('div')
      const titleGroup = document.createElement('div')

      const title = createTextElement(
        'h3',
        'customer-notification-title',
        tNotif(notification.title)
      )

      const type = createTextElement(
        'span',
        'customer-notification-type',
        formatNotificationType(notification.type)
      )

      const messageText = notification.messageBody || notification.message || ''
      const message = createTextElement(
        'p',
        'customer-notification-body',
        tNotif(messageText)
      )

      const dateVal = notification.sentAt || notification.createdAt
      const sentAt = createTextElement(
        'time',
        'customer-notification-time',
        formatSentAt(dateVal)
      )

      item.className = notification.isRead
        ? 'customer-notification-item is-read'
        : 'customer-notification-item is-unread'

      topRow.className = 'customer-notification-top'
      titleGroup.className = 'customer-notification-title-group'

      if (!notification.isRead) {
        const unreadIndicator = document.createElement('span')
        unreadIndicator.className = 'customer-notification-unread-indicator'
        unreadIndicator.setAttribute('aria-label', 'Unread notification')
        titleGroup.appendChild(unreadIndicator)
      }

      titleGroup.appendChild(title)
      topRow.append(titleGroup, type)

      const bottomRow = document.createElement('div')
      bottomRow.style.display = 'flex'
      bottomRow.style.justifyContent = 'space-between'
      bottomRow.style.alignItems = 'center'
      bottomRow.style.marginTop = '12px'

      bottomRow.appendChild(sentAt)

      const actions = document.createElement('div')
      actions.style.display = 'flex'
      actions.style.gap = '8px'

      if (notification.target) {
        const viewLink = document.createElement('a')
        viewLink.className = 'btn-back'
        viewLink.href = notification.target
        viewLink.textContent = isTr ? 'Görüntüle' : 'View'
        
        if (!notification.isRead) {
          viewLink.addEventListener('click', (event) => {
            event.preventDefault()
            const originalText = viewLink.textContent
            viewLink.textContent = '...'
            viewLink.style.pointerEvents = 'none'
            apiPatch(`/api/notifications/${notification.id}/read`)
              .catch(() => {}) // Ignore errors, still try to navigate
              .finally(() => {
                window.location.assign(notification.target)
              })
          })
        }
        
        actions.appendChild(viewLink)
      }

      if (!notification.isRead) {
        const markReadBtn = document.createElement('button')
        markReadBtn.className = 'btn-primary'
        markReadBtn.type = 'button'
        markReadBtn.textContent = isTr ? 'Okundu İşaretle' : 'Mark as Read'
        markReadBtn.addEventListener('click', async () => {
          markReadBtn.disabled = true
          try {
            await apiPatch(`/api/notifications/${notification.id}/read`)
            notification.isRead = true
            renderNotifications(notificationsStore)
          } catch (err) {
            markReadBtn.disabled = false
            errorMessage.textContent = err.message
            error.hidden = false
          }
        })
        actions.appendChild(markReadBtn)
      }

      bottomRow.appendChild(actions)
      item.append(topRow, message, bottomRow)
      list.appendChild(item)
    })
  }

  if (readAllButton) {
    readAllButton.addEventListener('click', async () => {
      readAllButton.disabled = true
      try {
        await apiPatch('/api/notifications/read-all')
        notificationsStore.forEach((n) => (n.isRead = true))
        renderNotifications(notificationsStore)
      } catch (err) {
        readAllButton.disabled = false
        errorMessage.textContent = err.message
        error.hidden = false
      }
    })
  }

  try {
    const response = await fetch('/api/notifications', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Notification request failed')
    }

    const payload = await response.json()

    if (!Array.isArray(payload.notifications)) {
      throw new Error('Notification collection is missing')
    }

    loading.hidden = true
    content.hidden = false

    renderNotifications(payload.notifications)
  } catch (loadError) {
    console.error('Failed to load customer notifications', loadError)

    loading.hidden = true
    errorMessage.textContent =
      isTr ? 'Bildirimleriniz yüklenemedi. Lütfen tekrar deneyin.' : 'Unable to load your notifications. Please try again.'
    error.hidden = false
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomerNotifications()
})
