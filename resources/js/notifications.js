document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('notifications-page')
  if (!page) return

  const loading = document.getElementById('notifications-loading')
  const error = document.getElementById('notifications-error')
  const content = document.getElementById('notifications-content')
  const empty = document.getElementById('notifications-empty')
  const list = document.getElementById('notifications-list')
  const count = document.getElementById('notifications-unread-count')
  const readAll = document.getElementById('notifications-read-all')
  const csrf = document.querySelector('#notifications-csrf-form input[name="_csrf"]')?.value
  let notifications = []

  const request = async (url) => {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Accept': 'application/json', 'x-csrf-token': csrf },
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || 'The notification could not be updated.')
    return payload
  }

  const formatDate = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }

  const render = () => {
    list.replaceChildren()
    const unreadCount = notifications.filter((notification) => !notification.isRead).length
    count.textContent = `${unreadCount} unread`
    count.hidden = unreadCount === 0
    readAll.hidden = unreadCount === 0
    empty.hidden = notifications.length !== 0

    for (const notification of notifications) {
      const item = document.createElement('article')
      item.className = `notification-item ${notification.isRead ? 'is-read' : 'is-unread'}`

      const body = document.createElement('div')
      body.className = 'notification-item-body'
      const title = document.createElement('h2')
      title.textContent = notification.title
      const message = document.createElement('p')
      message.textContent = notification.message
      const timestamp = document.createElement('time')
      timestamp.dateTime = notification.createdAt || ''
      timestamp.textContent = formatDate(notification.createdAt)
      body.append(title, message, timestamp)

      const actions = document.createElement('div')
      actions.className = 'notification-item-actions'
      const target = document.createElement('a')
      target.className = 'btn-back'
      target.href = notification.target
      target.textContent = 'View'
      actions.appendChild(target)

      if (!notification.isRead) {
        const markRead = document.createElement('button')
        markRead.className = 'btn-primary'
        markRead.type = 'button'
        markRead.textContent = 'Mark as Read'
        markRead.addEventListener('click', async () => {
          markRead.disabled = true
          try {
            await request(`/api/notifications/${notification.id}/read`)
            notification.isRead = true
            render()
          } catch (requestError) {
            error.textContent = requestError.message
            error.hidden = false
            markRead.disabled = false
          }
        })
        actions.appendChild(markRead)
      }

      item.append(body, actions)
      list.appendChild(item)
    }
  }

  readAll.addEventListener('click', async () => {
    readAll.disabled = true
    try {
      await request('/api/notifications/read-all')
      notifications.forEach((notification) => {
        notification.isRead = true
      })
      render()
    } catch (requestError) {
      error.textContent = requestError.message
      error.hidden = false
      readAll.disabled = false
    }
  })

  try {
    const response = await fetch('/api/notifications', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(payload.notifications)) {
      throw new Error('Unable to load your notifications.')
    }
    notifications = payload.notifications
    loading.hidden = true
    content.hidden = false
    render()
  } catch (loadError) {
    loading.hidden = true
    error.textContent = loadError.message || 'Unable to load your notifications.'
    error.hidden = false
  }
})
