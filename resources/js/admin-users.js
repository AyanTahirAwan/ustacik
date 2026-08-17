import { confirmAction } from './confirmation-modal.js'

const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('admin-users-page')

  if (!page) {
    return
  }

  const form = document.getElementById('admin-users-filter-form')
  const roleSelect = document.getElementById('admin-users-role')
  const statusSelect = document.getElementById('admin-users-status')
  const resetButton = document.getElementById('admin-users-filter-reset')

  const loading = document.getElementById('admin-users-loading')
  const error = document.getElementById('admin-users-error')
  const errorMessage = document.getElementById('admin-users-error-message')
  const emptyState = document.getElementById('admin-users-empty')
  const tableWrapper = document.getElementById('admin-users-table-wrapper')
  const tableBody = document.getElementById('admin-users-table-body')
  const count = document.getElementById('admin-users-count')

  function formatLabel(value) {
    if (!value) {
      return tr('Unavailable', 'Mevcut değil')
    }

    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  function getDisplayName(user) {
    if (user.customer?.fullName) {
      return user.customer.fullName
    }

    if (user.craftsman?.businessName) {
      return user.craftsman.businessName
    }

    if (user.admin?.fullName) {
      return user.admin.fullName
    }

    return user.email
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName)

    if (className) {
      element.className = className
    }

    element.textContent = text
    return element
  }

  function createBadge(value, type) {
    const badge = createTextElement(
      'span',
      `admin-user-badge admin-user-badge-${type}`,
      formatLabel(value)
    )

    badge.dataset.value = value
    return badge
  }

  function renderUsers(users) {
    tableBody.replaceChildren()

    count.textContent = String(users.length)
    emptyState.hidden = users.length !== 0
    tableWrapper.hidden = users.length === 0

    users.forEach((user) => {
      const row = document.createElement('tr')

      const idCell = createTextElement('td', '', String(user.id))
      const nameCell = createTextElement(
        'td',
        'admin-user-name',
        getDisplayName(user)
      )
      const emailCell = createTextElement('td', 'admin-user-email', user.email)

      const roleCell = document.createElement('td')
      roleCell.appendChild(createBadge(user.role, 'role'))

      const statusCell = document.createElement('td')
      statusCell.appendChild(createBadge(user.status, 'status'))

      const actionCell = document.createElement('td')
      actionCell.style.display = 'flex'
      actionCell.style.alignItems = 'center'
      actionCell.style.gap = '8px'

      const detailLink = document.createElement('a')
      detailLink.href = `/admin/users/${user.id}`
      detailLink.className = 'btn-back admin-user-view-link'
      detailLink.textContent = tr('View Details', 'Detayları Gör')

      const deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className = 'admin-user-delete-btn'
      deleteBtn.setAttribute('title', tr('Delete Account', 'Hesabı Sil'))
      deleteBtn.setAttribute('aria-label', tr('Delete Account', 'Hesabı Sil'))
      deleteBtn.style.backgroundColor = '#dc2626'
      deleteBtn.style.color = '#ffffff'
      deleteBtn.style.border = 'none'
      deleteBtn.style.width = '38px'
      deleteBtn.style.height = '38px'
      deleteBtn.style.minWidth = '38px'
      deleteBtn.style.borderRadius = '8px'
      deleteBtn.style.display = 'inline-flex'
      deleteBtn.style.alignItems = 'center'
      deleteBtn.style.justifyContent = 'center'
      deleteBtn.style.cursor = 'pointer'
      deleteBtn.style.fontSize = '1.05rem'
      deleteBtn.style.padding = '0'
      deleteBtn.style.transition = 'all 0.2s ease'
      deleteBtn.innerHTML = '🗑️'
      deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.backgroundColor = '#b91c1c' })
      deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.backgroundColor = '#dc2626' })

      deleteBtn.addEventListener('click', async () => {
        const name = getDisplayName(user)
        const confirmed = await confirmAction({
          title: tr('Delete user account?', 'Kullanıcı hesabı silinsin mi?'),
          message: isTr
            ? `"${name}" kullanıcısını ve tüm ilişkili verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
            : `Are you sure you want to delete "${name}" and all associated data? This action cannot be undone.`,
          confirmLabel: tr('Delete', 'Sil'),
          cancelLabel: tr('Cancel', 'İptal'),
        })

        if (!confirmed) return

        try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.message || 'Failed to delete user')
          }
          await loadUsers()
        } catch (err) {
          alert(err.message || 'Failed to delete user')
        }
      })

      actionCell.append(detailLink, deleteBtn)

      row.append(
        idCell,
        nameCell,
        emailCell,
        roleCell,
        statusCell,
        actionCell
      )

      tableBody.appendChild(row)
    })
  }

  async function loadUsers() {
    loading.hidden = false
    error.hidden = true
    emptyState.hidden = true
    tableWrapper.hidden = true

    const params = new URLSearchParams()

    if (roleSelect.value) {
      params.set('role', roleSelect.value)
    }

    if (statusSelect.value) {
      params.set('status', statusSelect.value)
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/admin/users?${queryString}`
      : '/api/admin/users'

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Admin users request failed')
      }

      const payload = await response.json()

      if (!Array.isArray(payload.users)) {
        throw new Error('Admin user collection is missing')
      }

      renderUsers(payload.users)
      loading.hidden = true
    } catch (loadError) {
      console.error('Failed to load admin users', loadError)

      loading.hidden = true
      errorMessage.textContent = tr(
        'Unable to load the user list. Please try again.',
        'Kullanıcı listesi yüklenemedi. Lütfen tekrar deneyin.'
      )
      error.hidden = false
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    loadUsers()
  })

  resetButton.addEventListener('click', () => {
    roleSelect.value = ''
    statusSelect.value = ''
    loadUsers()
  })

  loadUsers()
})
