document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('craftsman-profile-page')

  if (!page) {
    return
  }

  const loading = document.getElementById('craftsman-profile-loading')
  const content = document.getElementById('craftsman-profile-content')
  const error = document.getElementById('craftsman-profile-error')
  const errorMessage = document.getElementById('craftsman-profile-error-message')
  const success = document.getElementById('craftsman-profile-success')
  const successMessage = document.getElementById('craftsman-profile-success-message')

  const form = document.getElementById('craftsman-profile-form')
  const csrfInput = form.querySelector('input[name="_csrf"]')

  const businessName = document.getElementById('craftsman-business-name')
  const category = document.getElementById('craftsman-category')
  const registrationNumber = document.getElementById('craftsman-registration-number')
  const totalJobs = document.getElementById('craftsman-total-jobs')
  const bio = document.getElementById('craftsman-bio')
  const verbalConsent = document.getElementById('craftsman-verbal-consent')
  const trustBadge = document.getElementById('craftsman-profile-trust-badge')

  const editButton = document.getElementById('craftsman-profile-edit')
  const saveButton = document.getElementById('craftsman-profile-save')
  const cancelButton = document.getElementById('craftsman-profile-cancel')

  let savedCraftsman = null

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

  function getCategoryName(craftsman) {
    return craftsman.category?.nameEn ?? craftsman.category?.nameTr ?? 'Unavailable'
  }

  function applyCraftsman(craftsman) {
    businessName.value = craftsman.businessName ?? ''
    category.value = getCategoryName(craftsman)
    registrationNumber.value = craftsman.bizRegNo ?? ''
    totalJobs.value = String(craftsman.totalJobs ?? 0)
    bio.value = craftsman.bio ?? ''
    verbalConsent.checked = Boolean(craftsman.verbalConsent)

    trustBadge.textContent = craftsman.trustLevelLabel ?? 'unverified'
  }

  function setEditing(isEditing) {
    businessName.readOnly = !isEditing
    registrationNumber.readOnly = !isEditing
    bio.readOnly = !isEditing
    verbalConsent.disabled = !isEditing

    editButton.hidden = isEditing
    saveButton.hidden = !isEditing
    cancelButton.hidden = !isEditing
  }

  try {
    const response = await fetch('/api/craftsman/profile', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Profile request failed')
    }

    const { craftsman } = await response.json()

    if (!craftsman) {
      throw new Error('Craftsman profile is missing')
    }

    savedCraftsman = craftsman
    applyCraftsman(savedCraftsman)
    setEditing(false)

    loading.hidden = true
    content.hidden = false
  } catch (loadError) {
    console.error('Failed to load craftsman profile', loadError)
    loading.hidden = true
    showError('Unable to load your profile. Please try again.')
  }

  editButton.addEventListener('click', () => {
    hideMessages()
    setEditing(true)
    businessName.focus()
  })

  cancelButton.addEventListener('click', () => {
    if (savedCraftsman) {
      applyCraftsman(savedCraftsman)
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

    try {
      const response = await fetch('/api/craftsman/profile', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-csrf-token': csrfInput.value,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          businessName: businessName.value,
          bio: bio.value.trim() === '' ? null : bio.value,
          bizRegNo:
            registrationNumber.value.trim() === ''
              ? null
              : registrationNumber.value,
          verbalConsent: verbalConsent.checked,
        }),
      })

      if (!response.ok) {
        throw new Error('Profile update failed')
      }

      const { craftsman } = await response.json()

      if (!craftsman) {
        throw new Error('Updated profile is missing')
      }

      savedCraftsman = craftsman
      applyCraftsman(savedCraftsman)
      setEditing(false)
      showSuccess('Your profile has been updated successfully.')
    } catch (saveError) {
      console.error('Failed to update craftsman profile', saveError)
      showError('Unable to save your profile. Please check your details and try again.')
    } finally {
      saveButton.disabled = false
      cancelButton.disabled = false
      saveButton.textContent = 'Save Changes'
    }
  })
})
