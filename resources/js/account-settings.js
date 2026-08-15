document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('account-settings-page')
  if (!page) return

  const errorState = document.getElementById('account-settings-error')
  const successState = document.getElementById('account-settings-success')
  const contactNotice = document.getElementById('account-settings-contact-notice')
  const phone = document.getElementById('account-settings-phone')

  const formatPhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '')
    if (digits.length === 12 && digits.startsWith('90')) {
      return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
    }
    return value
  }

  if (phone) phone.textContent = formatPhone(phone.dataset.phone)

  page.querySelectorAll('[data-unavailable-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.unavailableAction
      const messages = {
        email:
          'Email changes are protected by verification. Email delivery has not yet been configured for this environment.',
        phone:
          'Phone changes are protected by verification. An SMS verification provider has not yet been configured for this environment.',
      }

      contactNotice.textContent = messages[action]
      contactNotice.hidden = false
    })
  })

  const passwordOpen = document.getElementById('account-settings-password-open')
  const passwordPanel = document.getElementById('account-settings-password-panel')
  const passwordForm = document.getElementById('account-settings-password-form')
  const currentPassword = document.getElementById('account-settings-current-password')
  const newPassword = document.getElementById('account-settings-new-password')
  const newPasswordConfirmation = document.getElementById(
    'account-settings-new-password-confirmation'
  )
  const showPasswords = document.getElementById('account-settings-show-passwords')
  const passwordCancel = document.getElementById('account-settings-password-cancel')
  const passwordSubmit = document.getElementById('account-settings-password-submit')
  const passwordError = document.getElementById('account-settings-password-error')
  const passwordSuccess = document.getElementById('account-settings-password-success')
  const passwordCsrf = passwordForm.querySelector('input[name="_csrf"]')?.value
  const passwordFields = [currentPassword, newPassword, newPasswordConfirmation]

  const clearPasswordForm = () => {
    passwordForm.reset()
    passwordFields.forEach((field) => {
      field.type = 'password'
    })
    passwordError.hidden = true
  }

  const closePasswordPanel = () => {
    clearPasswordForm()
    passwordSuccess.hidden = true
    passwordPanel.hidden = true
    passwordOpen.setAttribute('aria-expanded', 'false')
    passwordOpen.focus()
  }

  passwordOpen.addEventListener('click', () => {
    const opening = passwordPanel.hidden
    passwordPanel.hidden = !opening
    passwordOpen.setAttribute('aria-expanded', String(opening))
    passwordSuccess.hidden = true
    passwordError.hidden = true
    if (opening) currentPassword.focus()
  })

  passwordCancel.addEventListener('click', closePasswordPanel)

  showPasswords.addEventListener('change', () => {
    passwordFields.forEach((field) => {
      field.type = showPasswords.checked ? 'text' : 'password'
    })
  })

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    passwordError.hidden = true
    passwordSuccess.hidden = true

    if (newPassword.value !== newPasswordConfirmation.value) {
      passwordError.textContent = 'New password confirmation does not match.'
      passwordError.hidden = false
      newPasswordConfirmation.focus()
      return
    }
    if (!passwordCsrf) {
      passwordError.textContent = 'Unable to update your password. Please refresh and try again.'
      passwordError.hidden = false
      return
    }

    passwordSubmit.disabled = true
    passwordCancel.disabled = true
    passwordSubmit.textContent = 'Updating…'
    try {
      const response = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-csrf-token': passwordCsrf,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          currentPassword: currentPassword.value,
          newPassword: newPassword.value,
          newPasswordConfirmation: newPasswordConfirmation.value,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          payload.errors?.[0]?.message || payload.message || 'Unable to update your password.'
        )
      }

      clearPasswordForm()
      passwordSuccess.textContent = payload.message || 'Password updated successfully.'
      passwordSuccess.hidden = false
    } catch (error) {
      passwordError.textContent = error.message || 'Unable to update your password.'
      passwordError.hidden = false
    } finally {
      passwordSubmit.disabled = false
      passwordCancel.disabled = false
      passwordSubmit.textContent = 'Update Password'
    }
  })

  if (page.dataset.role !== 'customer') return

  const form = document.getElementById('account-settings-form')
  const name = document.getElementById('account-settings-name')
  const region = document.getElementById('account-settings-region')
  const language = document.getElementById('account-settings-language')
  const smsOptIn = document.getElementById('account-settings-sms-opt-in')
  const save = document.getElementById('account-settings-save')
  const reset = document.getElementById('account-settings-reset')
  const dirtyNote = document.getElementById('account-settings-dirty-note')
  const csrf = form.querySelector('input[name="_csrf"]')?.value
  const controls = [name, region, language, smsOptIn]
  let savedValues = null
  let saving = false

  const readValues = () => ({
    fullName: name.value.trim(),
    defaultRegionId: region.value === '' ? null : Number(region.value),
    language: language.value,
    smsOptIn: smsOptIn.checked,
  })

  const valuesMatch = (left, right) =>
    left &&
    right &&
    left.fullName === right.fullName &&
    left.defaultRegionId === right.defaultRegionId &&
    left.language === right.language &&
    left.smsOptIn === right.smsOptIn

  const updateDirtyState = () => {
    const dirty = savedValues && !valuesMatch(readValues(), savedValues)
    save.disabled = saving || !dirty
    reset.disabled = saving || !dirty
    dirtyNote.textContent = dirty ? 'You have unsaved changes' : 'No unsaved changes'
    dirtyNote.classList.toggle('is-dirty', Boolean(dirty))
  }

  const showError = (message) => {
    errorState.textContent = message
    errorState.hidden = false
    successState.hidden = true
  }

  const applyCustomer = (customer) => {
    name.value = customer.fullName || ''
    region.value = customer.defaultRegionId === null ? '' : String(customer.defaultRegionId)
    language.value = customer.language || 'en'
    smsOptIn.checked = Boolean(customer.smsOptIn)
    savedValues = readValues()
    controls.forEach((control) => {
      control.disabled = false
    })
    updateDirtyState()
  }

  const loadCustomer = async () => {
    const [profileResponse, regionsResponse] = await Promise.all([
      fetch('/api/customer/profile', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      }),
      fetch('/api/catalog/regions', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      }),
    ])
    const [profilePayload, regionsPayload] = await Promise.all([
      profileResponse.json().catch(() => ({})),
      regionsResponse.json().catch(() => ({})),
    ])

    if (!profileResponse.ok || !profilePayload.customer) {
      throw new Error(profilePayload.message || (isTr ? 'Hesap ayarları yüklenemedi.' : 'Unable to load account settings.'))
    }
    if (!regionsResponse.ok || !Array.isArray(regionsPayload.data)) {
      throw new Error(isTr ? 'Mevcut bölgeler yüklenemedi.' : 'Unable to load available regions.')
    }

    const emptyOption = region.firstElementChild
    region.replaceChildren(emptyOption)
    regionsPayload.data.forEach((item) => {
      const option = document.createElement('option')
      option.value = String(item.id)
      option.textContent = isTr ? item.nameTr : item.nameEn
      region.append(option)
    })
    applyCustomer(profilePayload.customer)
  }

  controls.forEach((control) => {
    control.addEventListener('input', updateDirtyState)
    control.addEventListener('change', updateDirtyState)
  })

  reset.addEventListener('click', () => {
    if (!savedValues || saving) return
    name.value = savedValues.fullName
    region.value = savedValues.defaultRegionId === null ? '' : String(savedValues.defaultRegionId)
    language.value = savedValues.language
    smsOptIn.checked = savedValues.smsOptIn
    errorState.hidden = true
    successState.hidden = true
    updateDirtyState()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!savedValues || valuesMatch(readValues(), savedValues) || saving) return

    errorState.hidden = true
    successState.hidden = true
    if (!csrf) {
      showError('Unable to save your settings. Please refresh the page and try again.')
      return
    }

    saving = true
    save.textContent = 'Saving…'
    updateDirtyState()
    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-csrf-token': csrf,
        },
        credentials: 'same-origin',
        body: JSON.stringify(readValues()),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.customer) {
        const validationMessage = payload.errors?.[0]?.message
        throw new Error(
          validationMessage || payload.message || 'Check your account details and try again.'
        )
      }

      await loadCustomer()
      successState.textContent = 'Your account settings have been saved.'
      successState.hidden = false
    } catch (error) {
      showError(error.message || 'Unable to save your account settings.')
    } finally {
      saving = false
      save.textContent = 'Save Changes'
      updateDirtyState()
    }
  })

  loadCustomer().catch((error) => {
    showError(error.message || 'Unable to load account settings.')
  })
})
