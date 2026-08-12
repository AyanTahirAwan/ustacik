import { confirmAction } from './confirmation-modal.js'

async function loadCustomerAddresses() {
  const page = document.getElementById('customer-addresses-page')

  if (!page) {
    return
  }

  const loading = document.getElementById('customer-addresses-loading')
  const error = document.getElementById('customer-addresses-error')
  const errorMessage = document.getElementById('customer-addresses-error-message')
  const success = document.getElementById('customer-addresses-success')
  const successMessage = document.getElementById('customer-addresses-success-message')
  const content = document.getElementById('customer-addresses-content')
  const emptyState = document.getElementById('customer-addresses-empty')
  const addressList = document.getElementById('customer-addresses-list')

  const form = document.getElementById('customer-address-form')
  const formTitle = document.getElementById('customer-address-form-title')
  const region = document.getElementById('customer-address-region')
  const label = document.getElementById('customer-address-label')
  const street = document.getElementById('customer-address-street')
  const landmark = document.getElementById('customer-address-landmark')
  const isDefault = document.getElementById('customer-address-default')
  const submitButton = document.getElementById('customer-address-submit')
  const cancelButton = document.getElementById('customer-address-cancel')
  const newButton = document.getElementById('customer-address-new')
  const csrfInput = form.querySelector('input[name="_csrf"]')

  let addresses = []
  let editingAddressId = null

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

  function populateRegions(regions) {
    const emptyOption = document.createElement('option')

    emptyOption.value = ''
    emptyOption.textContent = 'Select a region'
    region.replaceChildren(emptyOption)

    regions.forEach((regionItem) => {
      const option = document.createElement('option')

      option.value = String(regionItem.id)
      option.textContent = regionItem.nameEn
      region.appendChild(option)
    })
  }

  function resetForm(options = {}) {
    editingAddressId = null
    form.reset()
    region.value = ''
    formTitle.textContent = 'Add Address'
    submitButton.textContent = 'Save Address'
    cancelButton.hidden = true

    if (options.focus) {
      region.focus()
      form.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function beginEditing(address) {
    hideMessages()
    editingAddressId = address.id
    region.value = String(address.regionId)
    label.value = address.label ?? ''
    street.value = address.street ?? ''
    landmark.value = address.landmark ?? ''
    isDefault.checked = Boolean(address.isDefault)
    formTitle.textContent = 'Edit Address'
    submitButton.textContent = 'Update Address'
    cancelButton.hidden = false

    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
    label.focus()
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName)

    if (className) {
      element.className = className
    }

    element.textContent = text
    return element
  }

  function renderAddresses() {
    addressList.replaceChildren()
    emptyState.hidden = addresses.length !== 0

    addresses.forEach((address) => {
      const card = document.createElement('article')
      const header = document.createElement('div')
      const titleGroup = document.createElement('div')
      const title = createTextElement('h3', 'customer-address-title', address.label)
      const regionName =
        address.region?.nameEn ?? address.region?.nameTr ?? `Region ${address.regionId}`
      const regionText = createTextElement(
        'p',
        'customer-address-region',
        regionName
      )
      const streetText = createTextElement(
        'p',
        'customer-address-street',
        address.street
      )
      const actions = document.createElement('div')
      const editButton = createTextElement('button', 'btn-primary', 'Edit')
      const deleteButton = createTextElement(
        'button',
        'customer-address-delete',
        'Delete'
      )

      card.className = 'customer-address-card'
      header.className = 'customer-address-card-header'
      actions.className = 'customer-address-card-actions'

      titleGroup.append(title, regionText)

      if (address.isDefault) {
        const defaultBadge = createTextElement(
          'span',
          'customer-address-default-badge',
          'Default'
        )

        header.append(titleGroup, defaultBadge)
      } else {
        header.append(titleGroup)
      }

      card.append(header, streetText)

      if (address.landmark) {
        const landmarkText = createTextElement(
          'p',
          'customer-address-landmark',
          `Landmark: ${address.landmark}`
        )

        card.appendChild(landmarkText)
      }

      editButton.type = 'button'
      deleteButton.type = 'button'

      editButton.addEventListener('click', () => {
        beginEditing(address)
      })

      deleteButton.addEventListener('click', async () => {
        const confirmed = await confirmAction({
          title: 'Delete address?',
          message: `Delete "${address.label}"? This action cannot be undone.`,
          confirmLabel: 'Delete Address',
          cancelLabel: 'Cancel',
        })

        if (!confirmed) {
          return
        }

        hideMessages()

        if (!csrfInput?.value) {
          showError('Unable to delete the address. Please refresh the page.')
          return
        }

        deleteButton.disabled = true
        deleteButton.textContent = 'Deleting...'

        try {
          const response = await fetch(
            `/api/customer/addresses/${address.id}`,
            {
              method: 'DELETE',
              headers: {
                Accept: 'application/json',
                'x-csrf-token': csrfInput.value,
              },
              credentials: 'same-origin',
            }
          )

          if (!response.ok) {
            throw new Error('Address delete request failed')
          }

          if (editingAddressId === address.id) {
            resetForm()
          }

          await fetchAddresses()
          showSuccess('The address has been deleted successfully.')
        } catch (deleteError) {
          console.error('Failed to delete customer address', deleteError)
          showError('Unable to delete the address. Please try again.')
          deleteButton.disabled = false
          deleteButton.textContent = 'Delete'
        }
      })

      actions.append(editButton, deleteButton)
      card.appendChild(actions)
      addressList.appendChild(card)
    })
  }

  async function fetchAddresses() {
    const response = await fetch('/api/customer/addresses', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Unable to load addresses')
    }

    const payload = await response.json()

    if (!Array.isArray(payload.addresses)) {
      throw new Error('Address collection is missing')
    }

    addresses = payload.addresses
    renderAddresses()
  }

  try {
    const regionsResponse = await fetch('/api/catalog/regions', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!regionsResponse.ok) {
      throw new Error('Unable to load regions')
    }

    const regionsPayload = await regionsResponse.json()

    if (!Array.isArray(regionsPayload.data)) {
      throw new Error('Region collection is missing')
    }

    populateRegions(regionsPayload.data)
    await fetchAddresses()

    loading.hidden = true
    content.hidden = false
  } catch (loadError) {
    console.error('Failed to load customer addresses', loadError)
    loading.hidden = true
    showError('Unable to load your addresses. Please try again.')
  }

  newButton.addEventListener('click', () => {
    hideMessages()
    resetForm({ focus: true })
  })

  cancelButton.addEventListener('click', () => {
    hideMessages()
    resetForm()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideMessages()

    if (!csrfInput?.value) {
      showError('Unable to save the address. Please refresh the page.')
      return
    }

    submitButton.disabled = true
    cancelButton.disabled = true

    const isEditing = editingAddressId !== null
    const originalButtonText = submitButton.textContent

    submitButton.textContent = isEditing ? 'Updating...' : 'Saving...'

    try {
      const response = await fetch(
        isEditing
          ? `/api/customer/addresses/${editingAddressId}`
          : '/api/customer/addresses',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'x-csrf-token': csrfInput.value,
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            regionId: Number(region.value),
            label: label.value.trim(),
            street: street.value.trim(),
            landmark: landmark.value.trim() || null,
            isDefault: isDefault.checked,
          }),
        }
      )

      if (!response.ok) {
        if (response.status === 422) {
          throw new Error('VALIDATION_ERROR')
        }

        throw new Error('Address save request failed')
      }

      await fetchAddresses()
      resetForm()
      showSuccess(
        isEditing
          ? 'The address has been updated successfully.'
          : 'The address has been saved successfully.'
      )
    } catch (saveError) {
      console.error('Failed to save customer address', saveError)

      if (saveError.message === 'VALIDATION_ERROR') {
        showError('Please check the address details and try again.')
      } else {
        showError('Unable to save the address. Please try again.')
      }
    } finally {
      submitButton.disabled = false
      cancelButton.disabled = false

      if (editingAddressId === null) {
        submitButton.textContent = 'Save Address'
      } else {
        submitButton.textContent = originalButtonText
      }
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomerAddresses()
})
