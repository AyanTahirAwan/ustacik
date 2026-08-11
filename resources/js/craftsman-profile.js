document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('craftsman-profile-page')
  if (!page) return

  const loading = document.getElementById('craftsman-profile-loading')
  const content = document.getElementById('craftsman-profile-content')
  const error = document.getElementById('craftsman-profile-error')
  const success = document.getElementById('craftsman-profile-success')
  const form = document.getElementById('craftsman-profile-form')
  const csrf = form.querySelector('input[name="_csrf"]')?.value
  const businessName = document.getElementById('craftsman-business-name')
  const category = document.getElementById('craftsman-category')
  const registrationNumber = document.getElementById('craftsman-registration-number')
  const bio = document.getElementById('craftsman-bio')
  const saveButton = document.getElementById('craftsman-profile-save')
  const resetButton = document.getElementById('craftsman-profile-reset')
  const controls = [businessName, category, registrationNumber, bio]
  let savedCraftsman = null

  const showError = (message) => {
    error.textContent = message
    error.hidden = false
    success.hidden = true
  }

  const showSuccess = (message) => {
    success.textContent = message
    success.hidden = false
    error.hidden = true
  }

  const clearMessages = () => {
    error.hidden = true
    success.hidden = true
  }

  const applyCraftsman = (craftsman) => {
    businessName.value = craftsman.businessName ?? ''
    category.value = String(craftsman.categoryId ?? craftsman.category?.id ?? '')
    registrationNumber.value = craftsman.bizRegNo ?? ''
    bio.value = craftsman.bio ?? ''
  }

  const setBusy = (isBusy) => {
    controls.forEach((control) => {
      control.disabled = isBusy
    })
    saveButton.disabled = isBusy
    resetButton.disabled = isBusy
  }

  const fetchProfile = async () => {
    const response = await fetch('/api/craftsman/profile', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.craftsman) throw new Error('Unable to load your profile.')
    return payload.craftsman
  }

  try {
    const [craftsman, categoriesResponse] = await Promise.all([
      fetchProfile(),
      fetch('/api/catalog/categories', { headers: { Accept: 'application/json' } }),
    ])
    const categoriesPayload = await categoriesResponse.json().catch(() => ({}))
    if (!categoriesResponse.ok || !Array.isArray(categoriesPayload.data)) throw new Error('Unable to load categories.')

    category.replaceChildren(new Option('Choose a category', ''))
    categoriesPayload.data.forEach((item) => category.append(new Option(item.nameEn, item.id)))
    savedCraftsman = craftsman
    applyCraftsman(savedCraftsman)
    setBusy(false)
    loading.hidden = true
    content.hidden = false
  } catch (failure) {
    loading.hidden = true
    showError(failure.message || 'Unable to load your profile.')
  }

  resetButton.addEventListener('click', () => {
    if (savedCraftsman) applyCraftsman(savedCraftsman)
    clearMessages()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearMessages()
    if (!form.reportValidity()) return
    if (!csrf) return showError('Unable to save your profile. Please refresh the page and try again.')

    setBusy(true)
    saveButton.textContent = 'Saving...'
    try {
      const response = await fetch('/api/craftsman/profile', {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify({
          businessName: businessName.value,
          categoryId: Number(category.value),
          bio: bio.value.trim() ? bio.value : null,
          bizRegNo: registrationNumber.value.trim() ? registrationNumber.value : null,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.craftsman) {
        throw new Error(payload.errors?.[0]?.message || payload.message || 'Unable to save your profile.')
      }
      savedCraftsman = await fetchProfile()
      applyCraftsman(savedCraftsman)
      showSuccess('Your profile has been updated successfully.')
    } catch (failure) {
      showError(failure.message || 'Unable to save your profile.')
    } finally {
      setBusy(false)
      saveButton.textContent = 'Save Changes'
    }
  })
})
