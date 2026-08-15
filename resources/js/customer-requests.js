const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('customer-requests-page')
  if (!page) return

  const loading = document.getElementById('customer-requests-loading')
  const errorState = document.getElementById('customer-requests-error')
  const success = document.getElementById('customer-requests-success')
  const list = document.getElementById('customer-requests-list')

  const labels = {
    pending: tr('Pending', 'Beklemede'),
    accepted: tr('Accepted', 'Kabul Edildi'),
    declined: tr('Declined', 'Reddedildi'),
    in_progress: tr('In Progress', 'Devam Ediyor'),
    completed: tr('Completed', 'Tamamlandı'),
    cancelled: tr('Cancelled', 'İptal Edildi'),
    expired: tr('Expired', 'Süresi Doldu'),
    disputed: tr('Disputed', 'İtirazda'),
  }
  const contactStatuses = new Set(['accepted', 'in_progress', 'completed'])

  const contactCraftsman = async (job, button, feedback) => {
    button.disabled = true
    feedback.hidden = true
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/contact`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || typeof payload.whatsappUrl !== 'string') {
        throw new Error('CONTACT_UNAVAILABLE')
      }

      const whatsappUrl = new URL(payload.whatsappUrl)
      if (whatsappUrl.protocol !== 'https:' || whatsappUrl.hostname !== 'wa.me') {
        throw new Error('CONTACT_UNAVAILABLE')
      }
      window.location.assign(whatsappUrl.href)
    } catch {
      feedback.textContent = tr(
        'WhatsApp contact is currently unavailable. Please try again later.',
        'WhatsApp iletişimi şu anda mevcut değil. Lütfen daha sonra tekrar deneyin.'
      )
      feedback.hidden = false
      button.disabled = false
    }
  }

  const notice = new URLSearchParams(window.location.search)
  if (notice.get('created') === '1') success.hidden = false
  if (notice.get('reviewed') === '1') {
    success.textContent = tr('Thank you. Your review was submitted successfully.', 'Teşekkürler. Değerlendirmeniz başarıyla gönderildi.')
    success.hidden = false
  }
  if (notice.get('reviewError') === 'not-completed') {
    errorState.textContent = tr('A review can only be left after the job is completed.', 'Değerlendirme yalnızca iş tamamlandıktan sonra yapılabilir.')
    errorState.hidden = false
  }

  try {
    const response = await fetch('/api/jobs', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(payload.jobs))
      throw new Error(payload.message || tr('Unable to load your requests.', 'Talepleriniz yüklenemedi.'))

    loading.hidden = true
    list.hidden = false
    list.replaceChildren()
    if (!payload.jobs.length) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      const message = document.createElement('p')
      message.textContent = tr('You have not sent any service requests yet.', 'Henüz hiç hizmet talebi göndermediniz.')
      const link = document.createElement('a')
      link.className = 'card-link'
      link.href = '/search'
      link.textContent = tr('Find a service →', 'Hizmet bul →')
      empty.append(message, link)
      list.append(empty)
      return
    }

    payload.jobs.forEach((job) => {
      const card = document.createElement('article')
      card.className = 'customer-request-item'
      const heading = document.createElement('div')
      heading.className = 'customer-request-item-heading'
      const title = document.createElement('h2')
      title.textContent = job.craftsman?.businessName || tr('Craftsman request', 'Usta talebi')
      const status = document.createElement('span')
      status.className = `request-status request-status-${job.status}`
      status.textContent = labels[job.status] || job.status
      heading.append(title, status)

      const meta = document.createElement('dl')
      meta.className = 'customer-request-meta'
      const rows = [
        [tr('Category', 'Kategori'), isTr ? job.category?.nameTr : job.category?.nameEn],
        [tr('Region', 'Bölge'), isTr ? job.region?.nameTr : job.region?.nameEn],
        [tr('Requested', 'Talep tarihi'), job.createdAt ? new Date(job.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-GB') : null],
      ]
      rows.forEach(([label, value]) => {
        if (!value) return
        const term = document.createElement('dt')
        term.textContent = label
        const detail = document.createElement('dd')
        detail.textContent = value
        meta.append(term, detail)
      })

      const description = document.createElement('p')
      description.className = 'customer-request-item-description'
      description.textContent = job.description
      card.append(heading, meta, description)

      const contactNote = document.createElement('p')
      contactNote.className = 'customer-request-contact-note'
      if (job.status === 'pending') {
        contactNote.textContent = tr(
          'Contact becomes available after the craftsman accepts your request.',
          'İletişim, usta talebinizi kabul ettikten sonra kullanılabilir hale gelir.'
        )
        card.append(contactNote)
      } else if (contactStatuses.has(job.status)) {
        contactNote.textContent = tr(
          'Your request was accepted. You can now contact the craftsman.',
          'Talebiniz kabul edildi. Artık ustayla iletişime geçebilirsiniz.'
        )
        card.append(contactNote)
      }

      if (contactStatuses.has(job.status)) {
        const actions = document.createElement('div')
        actions.className = 'customer-request-item-actions'

        if (contactStatuses.has(job.status)) {
          const contactButton = document.createElement('button')
          contactButton.type = 'button'
          contactButton.className = 'btn-primary customer-request-contact'
          contactButton.textContent = tr('Contact on WhatsApp', "WhatsApp'tan İletişime Geç")
          const feedback = document.createElement('p')
          feedback.className = 'customer-request-contact-error'
          feedback.setAttribute('role', 'status')
          feedback.hidden = true
          contactButton.addEventListener('click', () =>
            contactCraftsman(job, contactButton, feedback)
          )
          actions.append(contactButton, feedback)
        }

        if (job.status === 'completed') {
          if (job.reviewed) {
            const reviewed = document.createElement('span')
            reviewed.className = 'request-reviewed'
            reviewed.textContent = tr('Reviewed', 'Değerlendirildi')
            actions.append(reviewed)
          } else {
            const reviewLink = document.createElement('a')
            reviewLink.className = 'btn-primary'
            reviewLink.href = `/customer/requests/${encodeURIComponent(job.id)}/review`
            reviewLink.textContent = tr('Leave Review', 'Değerlendirme Yap')
            actions.append(reviewLink)
          }
        }
        card.append(actions)
      }
      list.append(card)
    })
  } catch (error) {
    loading.hidden = true
    errorState.textContent = error.message || tr('Unable to load your requests.', 'Talepleriniz yüklenemedi.')
    errorState.hidden = false
  }
})
