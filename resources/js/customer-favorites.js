async function loadCustomerFavorites() {
  const page = document.getElementById('customer-favorites-page')

  if (!page) {
    return
  }

  const loading = document.getElementById('customer-favorites-loading')
  const error = document.getElementById('customer-favorites-error')
  const errorMessage = document.getElementById('customer-favorites-error-message')
  const success = document.getElementById('customer-favorites-success')
  const successMessage = document.getElementById('customer-favorites-success-message')
  const content = document.getElementById('customer-favorites-content')
  const emptyState = document.getElementById('customer-favorites-empty')
  const noAvailableState = document.getElementById('customer-favorites-no-available')
  const favoritesList = document.getElementById('customer-favorites-list')

  const form = document.getElementById('customer-favorite-form')
  const craftsmanSelect = document.getElementById('customer-favorite-craftsman')
  const addButton = document.getElementById('customer-favorite-add')
  const csrfInput = form.querySelector('input[name="_csrf"]')

  let favorites = []
  let craftsmen = []

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

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName)

    if (className) {
      element.className = className
    }

    element.textContent = text
    return element
  }

  function getCraftsmanByUserId(userId) {
    return craftsmen.find((craftsman) => craftsman.userId === userId) ?? null
  }

  function getCategoryName(craftsman) {
    return (
      craftsman.category?.nameEn ??
      craftsman.category?.nameTr ??
      'Category unavailable'
    )
  }

  function populateCraftsmanSelect() {
    const placeholder = document.createElement('option')
    const favoriteCraftsmanIds = new Set(
      favorites.map((favorite) => favorite.craftsmanId)
    )

    placeholder.value = ''
    placeholder.textContent = 'Select a craftsman'
    craftsmanSelect.replaceChildren(placeholder)

    const availableCraftsmen = craftsmen.filter(
      (craftsman) => !favoriteCraftsmanIds.has(craftsman.userId)
    )

    availableCraftsmen.forEach((craftsman) => {
      const option = document.createElement('option')

      option.value = String(craftsman.userId)
      option.textContent = `${craftsman.businessName} — ${getCategoryName(craftsman)}`
      craftsmanSelect.appendChild(option)
    })

    const hasAvailableCraftsmen = availableCraftsmen.length > 0

    craftsmanSelect.disabled = !hasAvailableCraftsmen
    addButton.disabled = !hasAvailableCraftsmen
    noAvailableState.hidden = hasAvailableCraftsmen
  }

  function renderFavorites() {
    favoritesList.replaceChildren()
    emptyState.hidden = favorites.length !== 0

    favorites.forEach((favorite) => {
      const craftsman = getCraftsmanByUserId(favorite.craftsmanId)
      const card = document.createElement('article')
      const cardHeader = document.createElement('div')
      const titleGroup = document.createElement('div')
      const businessName = createTextElement(
        'h3',
        'customer-favorite-business-name',
        craftsman?.businessName ?? `Craftsman #${favorite.craftsmanId}`
      )
      const category = createTextElement(
        'p',
        'customer-favorite-category',
        craftsman ? getCategoryName(craftsman) : 'Craftsman details unavailable'
      )
      const trustBadge = createTextElement(
        'span',
        'customer-favorite-trust-badge',
        craftsman?.trustLevelLabel ?? 'Unavailable'
      )
      const details = document.createElement('div')
      const actions = document.createElement('div')
      const removeButton = createTextElement(
        'button',
        'customer-favorite-remove',
        'Remove from Favorites'
      )

      card.className = 'customer-favorite-card'
      cardHeader.className = 'customer-favorite-card-header'
      details.className = 'customer-favorite-details'
      actions.className = 'customer-favorite-actions'

      titleGroup.append(businessName, category)
      cardHeader.append(titleGroup, trustBadge)

      if (craftsman?.bio) {
        details.appendChild(
          createTextElement('p', 'customer-favorite-bio', craftsman.bio)
        )
      }

      if (craftsman) {
        details.appendChild(
          createTextElement(
            'p',
            'customer-favorite-jobs',
            `${craftsman.totalJobs ?? 0} completed jobs`
          )
        )
      }

      removeButton.type = 'button'

      removeButton.addEventListener('click', async () => {
        const confirmed = window.confirm(
          `Remove "${craftsman?.businessName ?? `Craftsman #${favorite.craftsmanId}`}" from your favorites?`
        )

        if (!confirmed) {
          return
        }

        hideMessages()

        if (!csrfInput?.value) {
          showError(
            'Unable to remove the favorite. Please refresh the page and try again.'
          )
          return
        }

        removeButton.disabled = true
        removeButton.textContent = 'Removing...'

        try {
          const response = await fetch(
            `/api/customer/favorites/${favorite.craftsmanId}`,
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
            throw new Error('Favorite delete request failed')
          }

          await fetchFavorites()
          showSuccess('The craftsman has been removed from your favorites.')
        } catch (removeError) {
          console.error('Failed to remove customer favorite', removeError)
          showError('Unable to remove the favorite. Please try again.')
          removeButton.disabled = false
          removeButton.textContent = 'Remove from Favorites'
        }
      })

      actions.appendChild(removeButton)
      card.append(cardHeader, details, actions)
      favoritesList.appendChild(card)
    })

    populateCraftsmanSelect()
  }

  async function fetchFavorites() {
    const response = await fetch('/api/customer/favorites', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Unable to load favorites')
    }

    const payload = await response.json()

    if (!Array.isArray(payload.favorites)) {
      throw new Error('Favorite collection is missing')
    }

    favorites = payload.favorites
    renderFavorites()
  }

  try {
    const [favoritesResponse, craftsmenResponse] = await Promise.all([
      fetch('/api/customer/favorites', {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      }),
      fetch('/api/craftsmen', {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      }),
    ])

    if (!favoritesResponse.ok || !craftsmenResponse.ok) {
      throw new Error('Unable to load favorite data')
    }

    const [favoritesPayload, craftsmenPayload] = await Promise.all([
      favoritesResponse.json(),
      craftsmenResponse.json(),
    ])

    if (
      !Array.isArray(favoritesPayload.favorites) ||
      !Array.isArray(craftsmenPayload.craftsmen)
    ) {
      throw new Error('Favorite data is incomplete')
    }

    favorites = favoritesPayload.favorites
    craftsmen = craftsmenPayload.craftsmen

    renderFavorites()
    loading.hidden = true
    content.hidden = false
  } catch (loadError) {
    console.error('Failed to load customer favorites', loadError)
    loading.hidden = true
    showError('Unable to load your favorites. Please try again.')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideMessages()

    const craftsmanId = Number(craftsmanSelect.value)

    if (!Number.isInteger(craftsmanId) || craftsmanId < 1) {
      showError('Please select a craftsman.')
      return
    }

    if (!csrfInput?.value) {
      showError(
        'Unable to add the favorite. Please refresh the page and try again.'
      )
      return
    }

    addButton.disabled = true
    addButton.textContent = 'Adding...'

    try {
      const response = await fetch('/api/customer/favorites', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-csrf-token': csrfInput.value,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          craftsmanId,
        }),
      })

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('DUPLICATE_FAVORITE')
        }

        if (response.status === 422) {
          throw new Error('VALIDATION_ERROR')
        }

        throw new Error('Favorite create request failed')
      }

      await fetchFavorites()
      form.reset()
      showSuccess('The craftsman has been added to your favorites.')
    } catch (saveError) {
      console.error('Failed to add customer favorite', saveError)

      if (saveError.message === 'DUPLICATE_FAVORITE') {
        showError('This craftsman is already in your favorites.')
      } else if (saveError.message === 'VALIDATION_ERROR') {
        showError('Please select a valid craftsman.')
      } else {
        showError('Unable to add the favorite. Please try again.')
      }
    } finally {
      addButton.textContent = 'Add to Favorites'

      const favoriteCraftsmanIds = new Set(
        favorites.map((favorite) => favorite.craftsmanId)
      )

      addButton.disabled = !craftsmen.some(
        (craftsman) => !favoriteCraftsmanIds.has(craftsman.userId)
      )
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomerFavorites()
})
