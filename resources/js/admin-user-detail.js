import { confirmAction } from './confirmation-modal.js'

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('admin-user-detail-page')

  if (!page) {
    return
  }

  const userId = Number(page.dataset.userId)

  const loading = document.getElementById('admin-user-detail-loading')
  const content = document.getElementById('admin-user-detail-content')

  const error = document.getElementById('admin-user-detail-error')
  const errorMessage = document.getElementById('admin-user-detail-error-message')
  const success = document.getElementById('admin-user-detail-success')
  const successMessage = document.getElementById('admin-user-detail-success-message')

  const displayName = document.getElementById('admin-user-display-name')
  const email = document.getElementById('admin-user-email')
  const role = document.getElementById('admin-user-role')
  const status = document.getElementById('admin-user-status')

  const id = document.getElementById('admin-user-id')
  const phone = document.getElementById('admin-user-phone')
  const created = document.getElementById('admin-user-created')
  const updated = document.getElementById('admin-user-updated')

  const roleDetails = document.getElementById('admin-user-role-details')

  const form = document.getElementById('admin-user-action-form')
  const csrfInput = form.querySelector('input[name="_csrf"]')
  const suspendButton = document.getElementById('admin-user-suspend')
  const suspendedNote = document.getElementById('admin-user-already-suspended')

  let currentUser = null

  function formatLabel(value) {
    if (!value) {
      return 'Unavailable'
    }

    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatDate(value) {
    if (!value) {
      return 'Unavailable'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Unavailable'
    }

    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  function getDisplayName(user) {
    return (
      user.customer?.fullName ??
      user.craftsman?.businessName ??
      user.admin?.fullName ??
      user.email
    )
  }

  function addDetail(label, value) {
    const wrapper = document.createElement('div')
    const term = document.createElement('dt')
    const description = document.createElement('dd')

    term.textContent = label
    description.textContent =
      value === null || value === undefined || value === ''
        ? 'Unavailable'
        : String(value)

    wrapper.append(term, description)
    roleDetails.appendChild(wrapper)
  }

  function renderRoleDetails(user) {
    roleDetails.replaceChildren()

    if (user.role === 'customer' && user.customer) {
      addDetail('Full Name', user.customer.fullName)
      addDetail('Default Region ID', user.customer.defaultRegionId)
      addDetail('Language', user.customer.language)
      addDetail(
        'SMS Notifications',
        user.customer.smsOptIn ? 'Enabled' : 'Disabled'
      )
      return
    }

    if (user.role === 'craftsman' && user.craftsman) {
      const trustLabels = [
        'Unverified',
        'Registered',
        'Verified',
        'Approved',
      ]

      addDetail('Business Name', user.craftsman.businessName)
      addDetail('Category ID', user.craftsman.categoryId)
      addDetail(
        'Trust Level',
        trustLabels[user.craftsman.trustLevel] ?? user.craftsman.trustLevel
      )
      addDetail('Completed Jobs', user.craftsman.totalJobs)
      addDetail('Registration Number', user.craftsman.bizRegNo)
      addDetail(
        'Verbal Consent',
        user.craftsman.verbalConsent ? 'Recorded' : 'Not recorded'
      )

      if (user.craftsman.bio) {
        addDetail('Bio', user.craftsman.bio)
      }

      return
    }

    if (user.role === 'admin' && user.admin) {
      addDetail('Full Name', user.admin.fullName)
      addDetail('Department', user.admin.department)
      addDetail('Clearance Level', user.admin.clearanceLvl)
      return
    }

    addDetail('Role Profile', 'No role-specific profile data is available.')
  }

  function updateStatusState(user) {
    status.textContent = formatLabel(user.status)
    status.dataset.value = user.status

    const isSuspended = user.status === 'suspended'

    suspendButton.hidden = isSuspended
    suspendedNote.hidden = !isSuspended
  }

  function renderUser(user) {
    currentUser = user

    displayName.textContent = getDisplayName(user)
    email.textContent = user.email

    role.textContent = formatLabel(user.role)
    role.dataset.value = user.role

    id.textContent = String(user.id)
    phone.textContent = user.phoneNormalised ?? 'Unavailable'
    created.textContent = formatDate(user.createdAt)
    updated.textContent = formatDate(user.updatedAt)

    renderRoleDetails(user)
    updateStatusState(user)
  }

  async function loadUser() {
    if (!Number.isInteger(userId) || userId < 1) {
      loading.hidden = true
      errorMessage.textContent = 'The requested user ID is invalid.'
      error.hidden = false
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Admin user detail request failed')
      }

      const { user } = await response.json()

      if (!user) {
        throw new Error('Admin user detail is missing')
      }

      renderUser(user)

      loading.hidden = true
      content.hidden = false
    } catch (loadError) {
      console.error('Failed to load admin user detail', loadError)

      loading.hidden = true
      errorMessage.textContent =
        'Unable to load this user. Please try again.'
      error.hidden = false
    }
  }

  suspendButton.addEventListener('click', async () => {
    if (!currentUser || currentUser.status === 'suspended') {
      return
    }

    const displayName = getDisplayName(currentUser)
    const confirmed = await confirmAction({
      title: 'Suspend user?',
      message: `Suspend "${displayName}"? The account will no longer be able to access the application while suspended.`,
      confirmLabel: 'Suspend User',
      cancelLabel: 'Cancel',
    })

    if (!confirmed) {
      return
    }

    error.hidden = true
    success.hidden = true

    if (!csrfInput?.value) {
      errorMessage.textContent =
        'Unable to suspend the user. Please refresh the page and try again.'
      error.hidden = false
      return
    }

    suspendButton.disabled = true
    suspendButton.textContent = 'Suspending...'

    try {
      const response = await fetch(
        `/api/admin/users/${currentUser.id}/suspend`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'x-csrf-token': csrfInput.value,
          },
          credentials: 'same-origin',
        }
      )

      if (!response.ok) {
        throw new Error('Admin user suspend request failed')
      }

      const { user } = await response.json()

      if (!user) {
        throw new Error('Suspended user response is missing')
      }

      currentUser = {
        ...currentUser,
        ...user,
      }

      updateStatusState(currentUser)

      successMessage.textContent =
        'The user account has been suspended successfully.'
      success.hidden = false
    } catch (suspendError) {
      console.error('Failed to suspend user', suspendError)

      errorMessage.textContent =
        'Unable to suspend the user. Please try again.'
      error.hidden = false

      suspendButton.disabled = false
      suspendButton.textContent = 'Suspend User'
    }
  })

  loadUser()
})
