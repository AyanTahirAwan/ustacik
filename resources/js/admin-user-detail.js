import { confirmAction } from './confirmation-modal.js'

const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

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
  const unsuspendButton = document.getElementById('admin-user-unsuspend')
  const suspendedNote = document.getElementById('admin-user-already-suspended')

  let currentUser = null

  function formatLabel(value) {
    if (!value) {
      return tr('Unavailable', 'Mevcut değil')
    }

    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatDate(value) {
    if (!value) {
      return tr('Unavailable', 'Mevcut değil')
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return tr('Unavailable', 'Mevcut değil')
    }

    return new Intl.DateTimeFormat(isTr ? 'tr' : 'en', {
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
        ? tr('Unavailable', 'Mevcut değil')
        : String(value)

    wrapper.append(term, description)
    roleDetails.appendChild(wrapper)
  }

  function renderRoleDetails(user) {
    roleDetails.replaceChildren()

    if (user.role === 'customer' && user.customer) {
      addDetail(tr('Full Name', 'Ad Soyad'), user.customer.fullName)
      addDetail(tr('Default Region ID', 'Varsayılan Bölge ID'), user.customer.defaultRegionId)
      addDetail(tr('Language', 'Dil'), user.customer.language)
      addDetail(
        tr('SMS Notifications', 'SMS Bildirimleri'),
        user.customer.smsOptIn ? tr('Enabled', 'Açık') : tr('Disabled', 'Kapalı')
      )
      return
    }

    if (user.role === 'craftsman' && user.craftsman) {
      const trustLabels = [
        tr('Unverified', 'Doğrulanmamış'),
        tr('Registered', 'Kayıtlı'),
        tr('Verified', 'Doğrulanmış'),
        tr('Approved', 'Onaylı'),
      ]

      addDetail(tr('Business Name', 'İşletme Adı'), user.craftsman.businessName)
      addDetail(tr('Category ID', 'Kategori ID'), user.craftsman.categoryId)
      addDetail(
        tr('Trust Level', 'Güven Seviyesi'),
        trustLabels[user.craftsman.trustLevel] ?? user.craftsman.trustLevel
      )
      addDetail(tr('Completed Jobs', 'Tamamlanan İşler'), user.craftsman.totalJobs)
      addDetail(tr('Registration Number', 'Kayıt Numarası'), user.craftsman.bizRegNo)
      addDetail(
        tr('Verbal Consent', 'Sözlü Onay'),
        user.craftsman.verbalConsent ? tr('Recorded', 'Alındı') : tr('Not recorded', 'Alınmadı')
      )

      if (user.craftsman.bio) {
        addDetail(tr('Bio', 'Biyografi'), user.craftsman.bio)
      }

      return
    }

    if (user.role === 'admin' && user.admin) {
      addDetail(tr('Full Name', 'Ad Soyad'), user.admin.fullName)
      addDetail(tr('Department', 'Departman'), user.admin.department)
      addDetail(tr('Clearance Level', 'Yetki Seviyesi'), user.admin.clearanceLvl)
      return
    }

    addDetail(tr('Role Profile', 'Rol Profili'), tr('No role-specific profile data is available.', 'Role özgü profil verisi mevcut değil.'))
  }

  function updateStatusState(user) {
    status.textContent = formatLabel(user.status)
    status.dataset.value = user.status

    const isSuspended = user.status === 'suspended'

    suspendButton.hidden = isSuspended
    if (unsuspendButton) {
      unsuspendButton.hidden = !isSuspended
    }
    suspendedNote.hidden = !isSuspended
  }

  function renderUser(user) {
    currentUser = user

    displayName.textContent = getDisplayName(user)
    email.textContent = user.email

    role.textContent = formatLabel(user.role)
    role.dataset.value = user.role

    id.textContent = String(user.id)
    phone.textContent = user.phoneNormalised ?? tr('Unavailable', 'Mevcut değil')
    created.textContent = formatDate(user.createdAt)
    updated.textContent = formatDate(user.updatedAt)

    renderRoleDetails(user)
    updateStatusState(user)
  }

  async function loadUser() {
    if (!Number.isInteger(userId) || userId < 1) {
      loading.hidden = true
      errorMessage.textContent = tr('The requested user ID is invalid.', 'İstenen kullanıcı ID geçersiz.')
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
      errorMessage.textContent = tr(
        'Unable to load this user. Please try again.',
        'Bu kullanıcı yüklenemedi. Lütfen tekrar deneyin.'
      )
      error.hidden = false
    }
  }

  suspendButton.addEventListener('click', async () => {
    if (!currentUser || currentUser.status === 'suspended') {
      return
    }

    const name = getDisplayName(currentUser)
    const confirmed = await confirmAction({
      title: tr('Suspend user?', 'Hesabı askıya al?'),
      message: isTr
        ? `"${name}" hesabını askıya almak istiyor musunuz? Hesap, askıya alındığı sürece uygulamaya erişemeyecektir.`
        : `Suspend "${name}"? The account will no longer be able to access the application while suspended.`,
      confirmLabel: tr('Suspend User', 'Askıya Al'),
      cancelLabel: tr('Cancel', 'İptal'),
    })

    if (!confirmed) {
      return
    }

    error.hidden = true
    success.hidden = true

    if (!csrfInput?.value) {
      errorMessage.textContent = tr(
        'Unable to suspend the user. Please refresh the page and try again.',
        'Hesap askıya alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.'
      )
      error.hidden = false
      return
    }

    suspendButton.disabled = true
    suspendButton.textContent = tr('Suspending...', 'Askıya alınıyor...')

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

      successMessage.textContent = tr(
        'The user account has been suspended successfully.',
        'Kullanıcı hesabı başarıyla askıya alındı.'
      )
      success.hidden = false
    } catch (suspendError) {
      console.error('Failed to suspend user', suspendError)

      errorMessage.textContent = tr(
        'Unable to suspend the user. Please try again.',
        'Hesap askıya alınamadı. Lütfen tekrar deneyin.'
      )
      error.hidden = false

      suspendButton.disabled = false
      suspendButton.textContent = tr('Suspend User', 'Askıya Al')
    }
  })

  if (unsuspendButton) {
    unsuspendButton.addEventListener('click', async () => {
      if (!currentUser || currentUser.status !== 'suspended') {
        return
      }

      const name = getDisplayName(currentUser)
      const confirmed = await confirmAction({
        title: tr('Unsuspend user?', 'Hesap engelini kaldır?'),
        message: isTr
          ? `"${name}" kullanıcısının engelini kaldırmak istiyor musunuz? Kullanıcı uygulamaya tekrar erişebilecektir.`
          : `Unsuspend "${name}"? The account will regain access to the application.`,
        confirmLabel: tr('Unsuspend User', 'Engeli Kaldır'),
        cancelLabel: tr('Cancel', 'İptal'),
      })

      if (!confirmed) {
        return
      }

      error.hidden = true
      success.hidden = true

      if (!csrfInput?.value) {
        errorMessage.textContent = tr(
          'Unable to unsuspend the user. Please refresh the page and try again.',
          'Hesap engeli kaldırılamadı. Lütfen sayfayı yenileyip tekrar deneyin.'
        )
        error.hidden = false
        return
      }

      unsuspendButton.disabled = true
      unsuspendButton.textContent = tr('Unsuspending...', 'İşleniyor...')

      try {
        const response = await fetch(
          `/api/admin/users/${currentUser.id}/unsuspend`,
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
          throw new Error('Admin user unsuspend request failed')
        }

        const { user } = await response.json()

        if (!user) {
          throw new Error('Unsuspended user response is missing')
        }

        currentUser = {
          ...currentUser,
          ...user,
        }

        updateStatusState(currentUser)

        successMessage.textContent = tr(
          'The user account has been unsuspended successfully.',
          'Kullanıcının hesabı başarıyla aktif edildi.'
        )
        success.hidden = false
      } catch (unsuspendError) {
        console.error('Failed to unsuspend user', unsuspendError)

        errorMessage.textContent = tr(
          'Unable to unsuspend the user. Please try again.',
          'Hesap engeli kaldırılamadı. Lütfen tekrar deneyin.'
        )
        error.hidden = false

        unsuspendButton.disabled = false
        unsuspendButton.textContent = tr('Unsuspend User', 'Hesap Engelini Kaldır')
      }
    })
  }

  const deleteButton = document.getElementById('admin-user-delete')
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      if (!currentUser) return

      const name = getDisplayName(currentUser)
      const confirmed = await confirmAction({
        title: tr('Delete user account?', 'Kullanıcı hesabı silinsin mi?'),
        message: isTr
          ? `"${name}" kullanıcısını ve ilişkili tüm verilerini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
          : `Are you sure you want to permanently delete "${name}" and all associated records? This action cannot be undone.`,
        confirmLabel: tr('Delete Account', 'Hesabı Sil'),
        cancelLabel: tr('Cancel', 'İptal'),
      })

      if (!confirmed) return

      error.hidden = true
      success.hidden = true

      deleteButton.disabled = true
      deleteButton.textContent = tr('Deleting...', 'Siliniyor...')

      try {
        const response = await fetch(`/api/admin/users/${currentUser.id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'x-csrf-token': csrfInput?.value || '',
          },
          credentials: 'same-origin',
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.message || 'Failed to delete user account')
        }

        window.location.assign('/admin/users')
      } catch (deleteErr) {
        console.error('Failed to delete user', deleteErr)
        errorMessage.textContent = deleteErr.message || tr(
          'Unable to delete the user. Please try again.',
          'Kullanıcı silinemedi. Lütfen tekrar deneyin.'
        )
        error.hidden = false
        deleteButton.disabled = false
        deleteButton.textContent = tr('Delete Account', 'Hesabı Sil')
      }
    })
  }

  loadUser()
})
