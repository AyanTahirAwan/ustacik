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

  function formatNotificationType(type) {
    return type
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatSentAt(value) {
    if (!value) {
      return 'Date unavailable'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable'
    }

    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName)
    element.className = className
    element.textContent = text
    return element
  }

  function renderNotifications(notifications) {
    list.replaceChildren()
    emptyState.hidden = notifications.length !== 0

    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead
    )

    if (unreadNotifications.length > 0) {
      unreadCount.textContent = `${unreadNotifications.length} unread`
      unreadCount.hidden = false
    } else {
      unreadCount.hidden = true
    }

    notifications.forEach((notification) => {
      const item = document.createElement('article')
      const topRow = document.createElement('div')
      const titleGroup = document.createElement('div')

      const title = createTextElement(
        'h3',
        'customer-notification-title',
        notification.title
      )

      const type = createTextElement(
        'span',
        'customer-notification-type',
        formatNotificationType(notification.type)
      )

      const message = createTextElement(
        'p',
        'customer-notification-body',
        notification.messageBody
      )

      const sentAt = createTextElement(
        'time',
        'customer-notification-time',
        formatSentAt(notification.sentAt)
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
      item.append(topRow, message, sentAt)

      list.appendChild(item)
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

    renderNotifications(payload.notifications)

    loading.hidden = true
    content.hidden = false
  } catch (loadError) {
    console.error('Failed to load customer notifications', loadError)

    loading.hidden = true
    errorMessage.textContent =
      'Unable to load your notifications. Please try again.'
    error.hidden = false
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomerNotifications()
})
