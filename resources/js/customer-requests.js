document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('customer-requests-page')
  if (!page) return

  const loading = document.getElementById('customer-requests-loading')
  const errorState = document.getElementById('customer-requests-error')
  const success = document.getElementById('customer-requests-success')
  const list = document.getElementById('customer-requests-list')
  const labels = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    disputed: 'Disputed',
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
      feedback.textContent = 'WhatsApp contact is currently unavailable. Please try again later.'
      feedback.hidden = false
      button.disabled = false
    }
  }

  const notice = new URLSearchParams(window.location.search)
  if (notice.get('created') === '1') success.hidden = false
  if (notice.get('reviewed') === '1') {
    success.textContent = 'Thank you. Your review was submitted successfully.'
    success.hidden = false
  }
  if (notice.get('reviewError') === 'not-completed') {
    errorState.textContent = 'A review can only be left after the job is completed.'
    errorState.hidden = false
  }

  try {
    const response = await fetch('/api/jobs', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(payload.jobs))
      throw new Error(payload.message || 'Unable to load your requests.')

    loading.hidden = true
    list.hidden = false
    list.replaceChildren()
    if (!payload.jobs.length) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      const message = document.createElement('p')
      message.textContent = 'You have not sent any service requests yet.'
      const link = document.createElement('a')
      link.className = 'card-link'
      link.href = '/search'
      link.textContent = 'Find a service →'
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
      title.textContent = job.craftsman?.businessName || 'Craftsman request'
      const status = document.createElement('span')
      status.className = `request-status request-status-${job.status}`
      status.textContent = labels[job.status] || job.status
      heading.append(title, status)

      const meta = document.createElement('dl')
      meta.className = 'customer-request-meta'
      const rows = [
        ['Category', job.category?.nameEn],
        ['Region', job.region?.nameEn],
        ['Requested', job.createdAt ? new Date(job.createdAt).toLocaleDateString() : null],
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
        contactNote.textContent =
          'Contact becomes available after the craftsman accepts your request.'
        card.append(contactNote)
      } else if (contactStatuses.has(job.status)) {
        contactNote.textContent = 'Your request was accepted. You can now contact the craftsman.'
        card.append(contactNote)
      }

      if (contactStatuses.has(job.status)) {
        const actions = document.createElement('div')
        actions.className = 'customer-request-item-actions'

        if (contactStatuses.has(job.status)) {
          const contactButton = document.createElement('button')
          contactButton.type = 'button'
          contactButton.className = 'btn-primary customer-request-contact'
          contactButton.textContent = 'Contact on WhatsApp'
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
            reviewed.textContent = 'Reviewed'
            actions.append(reviewed)
          } else {
            const reviewLink = document.createElement('a')
            reviewLink.className = 'btn-primary'
            reviewLink.href = `/customer/requests/${encodeURIComponent(job.id)}/review`
            reviewLink.textContent = 'Leave Review'
            actions.append(reviewLink)
          }
        }
        card.append(actions)
      }
      list.append(card)
    })
  } catch (error) {
    loading.hidden = true
    errorState.textContent = error.message || 'Unable to load your requests.'
    errorState.hidden = false
  }
})
