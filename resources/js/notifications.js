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
  const isTr = window.APP_LOCALE === 'tr'

  const request = async (url) => {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Accept': 'application/json', 'x-csrf-token': csrf },
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || (isTr ? 'Bildirim güncellenemedi.' : 'The notification could not be updated.'))
    return payload
  }

  const formatDate = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? (isTr ? 'Tarih yok' : 'Date unavailable')
      : new Intl.DateTimeFormat(isTr ? 'tr' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }

  const updateHeaderCount = (unreadCount) => {
    const headerBadge = document.querySelector('[data-notification-count]')
    if (headerBadge) {
      headerBadge.textContent = String(unreadCount)
      headerBadge.hidden = unreadCount === 0
    }
  }

  const render = () => {
    list.replaceChildren()
    const unreadCount = notifications.filter((notification) => !notification.isRead).length
    count.textContent = `${unreadCount} ${isTr ? 'okunmamış' : 'unread'}`
    count.hidden = unreadCount === 0
    readAll.hidden = unreadCount === 0
    empty.hidden = notifications.length !== 0
    updateHeaderCount(unreadCount)

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

    for (const notification of notifications) {
      const item = document.createElement('article')
      item.className = `notification-item ${notification.isRead ? 'is-read' : 'is-unread'}`

      const body = document.createElement('div')
      body.className = 'notification-item-body'
      const title = document.createElement('h2')
      title.textContent = tNotif(notification.title)
      const message = document.createElement('p')
      message.textContent = tNotif(notification.message || notification.messageBody)
      const timestamp = document.createElement('time')
      timestamp.dateTime = notification.createdAt || notification.sentAt || ''
      timestamp.textContent = formatDate(notification.createdAt || notification.sentAt)
      body.append(title, message, timestamp)

      const actions = document.createElement('div')
      actions.className = 'notification-item-actions'
      const target = document.createElement('a')
      target.className = 'btn-back'
      target.href = notification.target || '#'
      target.textContent = isTr ? 'Görüntüle' : 'View'

      target.addEventListener('click', async () => {
        if (!notification.isRead) {
          try {
            await request(`/api/notifications/${notification.id}/read`)
            notification.isRead = true
          } catch {}
        }
      })

      actions.appendChild(target)

      if (!notification.isRead) {
        const markRead = document.createElement('button')
        markRead.className = 'btn-primary'
        markRead.type = 'button'
        markRead.textContent = isTr ? 'Okundu İşaretle' : 'Mark as Read'
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
      throw new Error(isTr ? 'Bildirimleriniz yüklenemedi.' : 'Unable to load your notifications.')
    }
    notifications = payload.notifications
    loading.hidden = true
    content.hidden = false
    render()


  } catch (loadError) {
    loading.hidden = true
    error.textContent = loadError.message || (isTr ? 'Bildirimleriniz yüklenemedi.' : 'Unable to load your notifications.')
    error.hidden = false
  }
})
