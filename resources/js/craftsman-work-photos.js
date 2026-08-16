import { confirmAction } from './confirmation-modal.js'

const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

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
      image.alt = tr('Craftsman work portfolio', 'Usta iş portföyü')
      image.loading = 'lazy'

      urlText.className = 'craftsman-work-photo-url'
      urlText.textContent = workPhoto.imageUrl

      removeButton.className = 'btn btn-secondary craftsman-work-photo-remove'
      removeButton.type = 'button'
      removeButton.textContent = tr('Remove Photo', 'Fotoğrafı Kaldır')

      removeButton.addEventListener('click', async () => {
        const confirmed = await confirmAction({
          title: tr('Remove work photo?', 'İş fotoğrafı kaldırılsın mı?'),
          message: tr('Remove this photo from your work portfolio? This action cannot be undone.', 'Bu fotoğrafı iş portföyünüzden kaldırmak istiyor musunuz? Bu işlem geri alınamaz.'),
          confirmLabel: tr('Remove Photo', 'Fotoğrafı Kaldır'),
          cancelLabel: tr('Cancel', 'İptal'),
        })

        if (!confirmed) {
          return
        }

        hideMessages()

        if (!csrfInput?.value) {
          showError(tr('Unable to remove the photo. Please refresh the page and try again.', 'Fotoğraf kaldırılamadı. Lütfen sayfayı yenileyip tekrar deneyin.'))
          return
        }

        removeButton.disabled = true
        removeButton.textContent = tr('Removing...', 'Kaldırılıyor...')

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
          showSuccess(tr('The work photo has been removed.', 'İş fotoğrafı kaldırıldı.'))
        } catch (removeError) {
          console.error('Failed to remove work photo', removeError)
          removeButton.disabled = false
          removeButton.textContent = tr('Remove Photo', 'Fotoğrafı Kaldır')
          showError(tr('Unable to remove the work photo. Please try again.', 'İş fotoğrafı kaldırılamadı. Lütfen tekrar deneyin.'))
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
    showError(tr('Unable to load your work photos. Please try again.', 'İş fotoğraflarınız yüklenemedi. Lütfen tekrar deneyin.'))
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    hideMessages()

    if (!csrfInput?.value) {
      showError(tr('Unable to add the photo. Please refresh the page and try again.', 'Fotoğraf eklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.'))
      return
    }

    addButton.disabled = true
    addButton.textContent = tr('Adding...', 'Ekleniyor...')

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
      showSuccess(tr('The work photo has been added successfully.', 'İş fotoğrafı başarıyla eklendi.'))
    } catch (addError) {
      console.error('Failed to add work photo', addError)
      showError(tr('Unable to add the work photo. Please check the image URL and try again.', 'İş fotoğrafı eklenemedi. Lütfen resim URL\'sini kontrol edin ve tekrar deneyin.'))
    } finally {
      addButton.disabled = false
      addButton.textContent = tr('Add Photo', 'Fotoğraf Ekle')
    }
  })
})
