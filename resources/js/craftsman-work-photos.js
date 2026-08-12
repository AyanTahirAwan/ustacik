import { confirmAction } from './confirmation-modal.js'

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('craftsman-work-photos-page')

  if (!page) {
    return
  }

  const loading = document.getElementById('craftsman-work-photos-loading')
  const content = document.getElementById('craftsman-work-photos-content')
  const error = document.getElementById('craftsman-work-photos-error')
  const errorMessage = document.getElementById('craftsman-work-photos-error-message')
  const success = document.getElementById('craftsman-work-photos-success')
  const successMessage = document.getElementById('craftsman-work-photos-success-message')
  const emptyState = document.getElementById('craftsman-work-photos-empty')
  const list = document.getElementById('craftsman-work-photos-list')

  const form = document.getElementById('craftsman-work-photo-form')
  const imageUrl = document.getElementById('craftsman-work-photo-url')
  const addButton = document.getElementById('craftsman-work-photo-add')
  const csrfInput = form.querySelector('input[name="_csrf"]')

  let workPhotos = []

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

  function renderPhotos() {
    list.replaceChildren()
    emptyState.hidden = workPhotos.length !== 0

    workPhotos.forEach((workPhoto) => {
      const card = document.createElement('article')
      const image = document.createElement('img')
      const urlText = document.createElement('p')
      const removeButton = document.createElement('button')

      card.className = 'craftsman-work-photo-card'

      image.className = 'craftsman-work-photo-image'
      image.src = workPhoto.imageUrl
      image.alt = 'Craftsman work portfolio'
      image.loading = 'lazy'

      urlText.className = 'craftsman-work-photo-url'
      urlText.textContent = workPhoto.imageUrl

      removeButton.className = 'btn btn-secondary craftsman-work-photo-remove'
      removeButton.type = 'button'
      removeButton.textContent = 'Remove Photo'

      removeButton.addEventListener('click', async () => {
        const confirmed = await confirmAction({
          title: 'Remove work photo?',
          message: 'Remove this photo from your work portfolio? This action cannot be undone.',
          confirmLabel: 'Remove Photo',
          cancelLabel: 'Cancel',
        })

        if (!confirmed) {
          return
        }

        hideMessages()

        if (!csrfInput?.value) {
          showError('Unable to remove the photo. Please refresh the page and try again.')
          return
        }

        removeButton.disabled = true
        removeButton.textContent = 'Removing...'

        try {
          const response = await fetch(
            `/api/craftsman/work-photos/${workPhoto.id}`,
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
            throw new Error('Work photo delete failed')
          }

          workPhotos = workPhotos.filter((photo) => photo.id !== workPhoto.id)
          renderPhotos()
          showSuccess('The work photo has been removed.')
        } catch (removeError) {
          console.error('Failed to remove work photo', removeError)
          removeButton.disabled = false
          removeButton.textContent = 'Remove Photo'
          showError('Unable to remove the work photo. Please try again.')
        }
      })

      card.append(image, urlText, removeButton)
      list.appendChild(card)
    })
  }

  async function fetchPhotos() {
    const response = await fetch('/api/craftsman/work-photos', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Work photos request failed')
    }

    const payload = await response.json()

    if (!Array.isArray(payload.workPhotos)) {
      throw new Error('Work photo collection is missing')
    }

    workPhotos = payload.workPhotos
    renderPhotos()
  }

  try {
    await fetchPhotos()
    loading.hidden = true
    content.hidden = false
  } catch (loadError) {
    console.error('Failed to load work photos', loadError)
    loading.hidden = true
    showError('Unable to load your work photos. Please try again.')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideMessages()

    if (!csrfInput?.value) {
      showError('Unable to add the photo. Please refresh the page and try again.')
      return
    }

    addButton.disabled = true
    addButton.textContent = 'Adding...'

    try {
      const response = await fetch('/api/craftsman/work-photos', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-csrf-token': csrfInput.value,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          imageUrl: imageUrl.value,
        }),
      })

      if (!response.ok) {
        throw new Error('Work photo create failed')
      }

      const { workPhoto } = await response.json()

      if (!workPhoto) {
        throw new Error('Created work photo is missing')
      }

      workPhotos = [workPhoto, ...workPhotos]
      renderPhotos()

      form.reset()
      showSuccess('The work photo has been added successfully.')
    } catch (addError) {
      console.error('Failed to add work photo', addError)
      showError('Unable to add the work photo. Please check the image URL and try again.')
    } finally {
      addButton.disabled = false
      addButton.textContent = 'Add Photo'
    }
  })
})
