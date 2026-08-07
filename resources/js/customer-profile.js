async function loadCustomerProfile() {
  const profilePage = document.getElementById('customer-profile-page')

  if (!profilePage) {
    return
  }

  const loading = document.getElementById('customer-profile-loading')
  const error = document.getElementById('customer-profile-error')
  const errorMessage = document.getElementById('customer-profile-error-message')
  const success = document.getElementById('customer-profile-success')
  const successMessage = document.getElementById('customer-profile-success-message')
  const content = document.getElementById('customer-profile-content')
  const form = document.getElementById('customer-profile-form')
  const fullName = document.getElementById('customer-profile-full-name')
  const email = document.getElementById('customer-profile-email')
  const phone = document.getElementById('customer-profile-phone')
  const region = document.getElementById('customer-profile-region')
  const language = document.getElementById('customer-profile-language')
  const smsOptIn = document.getElementById('customer-profile-sms-opt-in')
  const editButton = document.getElementById('customer-profile-edit')
  const saveButton = document.getElementById('customer-profile-save')
  const cancelButton = document.getElementById('customer-profile-cancel')
  const csrfInput = form.querySelector('input[name="_csrf"]')
  let savedCustomer = null

  function hideMessages() {
    error.hidden = true
    success.hidden = true
  }

  function showError(message) {
    errorMessage.textContent = message
    error.hidden = false
    success.hidden = true
  }

  function showSuccess(message) {
    successMessage.textContent = message
    success.hidden = false
    error.hidden = true
  }

  function applyCustomer(customer) {
    fullName.value = customer.fullName ?? ''
    email.value = customer.user?.email ?? ''
    phone.value = customer.user?.phoneNormalised ?? ''
    region.value = customer.defaultRegionId === null ? '' : String(customer.defaultRegionId)
    language.value = customer.language ?? ''
    smsOptIn.checked = Boolean(customer.smsOptIn)
  }

  function setEditing(isEditing) {
    fullName.readOnly = !isEditing
    region.disabled = !isEditing
    language.readOnly = !isEditing
    smsOptIn.disabled = !isEditing
    editButton.hidden = isEditing
    saveButton.hidden = !isEditing
    cancelButton.hidden = !isEditing
  }

  function populateRegions(regions) {
    const emptyOption = document.createElement('option')

    emptyOption.value = ''
    emptyOption.textContent = 'Not selected'
    region.replaceChildren(emptyOption)

    regions.forEach((regionItem) => {
      const option = document.createElement('option')

      option.value = String(regionItem.id)
      option.textContent = regionItem.nameEn
      region.appendChild(option)
    })
  }

  try {
    const [profileResponse, regionsResponse] = await Promise.all([
      fetch('/api/customer/profile', {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      }),
      fetch('/api/catalog/regions', {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      }),
    ])

    if (!profileResponse.ok || !regionsResponse.ok) {
      throw new Error('Unable to load profile data')
    }

    const [{ customer }, { data: regions }] = await Promise.all([
      profileResponse.json(),
      regionsResponse.json(),
    ])

    if (!customer || !Array.isArray(regions)) {
      throw new Error('Profile data is incomplete')
    }

    populateRegions(regions)
    savedCustomer = customer
    applyCustomer(savedCustomer)
    setEditing(false)

    loading.hidden = true
    content.hidden = false
  } catch (loadError) {
    console.error('Failed to load customer profile', loadError)

    loading.hidden = true
    showError('Unable to load your profile. Please try again.')
  }

  editButton.addEventListener('click', () => {
    hideMessages()
    setEditing(true)
    fullName.focus()
  })

  cancelButton.addEventListener('click', () => {
    if (savedCustomer) {
      applyCustomer(savedCustomer)
    }

    hideMessages()
    setEditing(false)
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideMessages()

    if (!csrfInput?.value) {
      showError('Unable to save your profile. Please refresh the page and try again.')
      return
    }

    saveButton.disabled = true
    cancelButton.disabled = true
    saveButton.textContent = 'Saving...'
    let failureMessage = 'Unable to save your profile. Please try again.'

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-csrf-token': csrfInput.value,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          fullName: fullName.value,
          defaultRegionId: region.value === '' ? null : Number(region.value),
          language: language.value,
          smsOptIn: smsOptIn.checked,
        }),
      })

      if (!response.ok) {
        if (response.status === 422) {
          failureMessage = 'Please check your profile details and try again.'
        }

        throw new Error('Profile update request failed')
      }

      const { customer } = await response.json()

      if (!customer) {
        throw new Error('Updated customer profile is missing')
      }

      savedCustomer = customer
      applyCustomer(savedCustomer)
      setEditing(false)
      showSuccess('Your profile has been updated successfully.')
    } catch (saveError) {
      console.error('Failed to save customer profile', saveError)
      showError(failureMessage)
    } finally {
      saveButton.disabled = false
      cancelButton.disabled = false
      saveButton.textContent = 'Save Changes'
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomerProfile()
})