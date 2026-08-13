document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('public-craftsman-profile')
  if (!page) return

  const craftsmanId = page.dataset.craftsmanId
  const role = page.dataset.userRole || 'guest'
  const loading = document.getElementById('public-profile-loading')
  const errorState = document.getElementById('public-profile-error')
  const content = document.getElementById('public-profile-content')

  const showError = (message) => {
    loading.hidden = true
    content.hidden = true
    errorState.querySelector('p').textContent = message
    errorState.hidden = false
  }

  const fetchJson = async (url) => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = response.status === 404
        ? 'This craftsman profile could not be found.'
        : 'We could not load this craftsman profile. Please try again.'
      throw new Error(message)
    }
    return payload
  }

  const trustLabel = (value) => {
    const allowed = ['unverified', 'registered', 'verified', 'approved']
    const label = allowed.includes(value) ? value : 'unverified'
    return { value: label, text: label.charAt(0).toUpperCase() + label.slice(1) }
  }

  const renderNextAction = () => {
    const copy = document.getElementById('public-profile-next-copy')
    const target = document.getElementById('public-profile-next-cta')
    target.replaceChildren()

    if (role === 'guest') {
      copy.textContent = 'Sign in with a customer account to request this service.'
      const link = document.createElement('a')
      link.className = 'btn-primary public-profile-cta'
      link.href = '/login'
      link.textContent = 'Login to Request Service'
      target.append(link)
      return
    }

    if (role === 'customer') {
      copy.textContent = 'Describe the work you need and send a request directly to this craftsman.'
      const link = document.createElement('a')
      link.className = 'btn-primary public-profile-cta'
      link.href = `/craftsmen/${encodeURIComponent(craftsmanId)}/request`
      link.textContent = 'Request Service'
      target.append(link)
      return
    }

    copy.textContent = 'Service requests are available to customer accounts.'
    const button = document.createElement('button')
    button.className = 'btn-primary public-profile-cta'
    button.type = 'button'
    button.disabled = true
    button.textContent = 'Customer Action Only'
    target.append(button)
  }

  const renderPhotos = (photos = [], businessName) => {
    const target = document.getElementById('public-profile-photos')
    target.replaceChildren()
    if (!photos.length) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.textContent = 'No previous work photos available yet.'
      target.append(empty)
      return
    }

    photos.forEach((photo, index) => {
      const frame = document.createElement('figure')
      frame.className = 'public-profile-photo-frame'
      const image = document.createElement('img')
      image.className = 'public-profile-photo'
      image.src = photo.imageUrl
      image.alt = `${businessName} previous work ${index + 1}`
      image.loading = 'lazy'
      image.addEventListener('error', () => {
        const unavailable = document.createElement('div')
        unavailable.className = 'public-profile-photo-unavailable'
        unavailable.textContent = 'Photo unavailable'
        frame.replaceChildren(unavailable)
      }, { once: true })
      frame.append(image)
      target.append(frame)
    })
  }

  const reviewAverage = (review) => {
    const scores = [review.punctuality, review.workmanship, review.priceHonesty, review.communication]
      .map(Number)
      .filter(Number.isFinite)
    return scores.length === 4 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
  }

  const renderReviews = ({ reviews = [], average = null, count = 0 }) => {
    const target = document.getElementById('public-profile-reviews')
    const summary = document.getElementById('public-profile-review-summary')
    document.getElementById('public-profile-review-count').textContent = String(count)
    document.getElementById('public-profile-average').textContent = average === null
      ? 'Not available'
      : `${Number(average).toFixed(1)} / 5`
    summary.textContent = average === null
      ? `${count} review${count === 1 ? '' : 's'} · Average shown after 3 reviews`
      : `${Number(average).toFixed(1)} out of 5 from ${count} reviews`
    target.replaceChildren()

    if (!reviews.length) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.textContent = 'No customer reviews available yet.'
      target.append(empty)
      return
    }

    reviews.forEach((review) => {
      const card = document.createElement('article')
      card.className = 'public-profile-review-card'
      const heading = document.createElement('div')
      heading.className = 'public-profile-review-heading'
      const title = document.createElement('h3')
      title.textContent = 'Customer review'
      const rating = document.createElement('strong')
      const value = reviewAverage(review)
      rating.textContent = value === null ? 'Rating unavailable' : `${value.toFixed(1)} / 5`
      heading.append(title, rating)
      card.append(heading)
      const scores = document.createElement('dl')
      scores.className = 'public-profile-review-scores'
      ;[
        ['Punctuality', review.punctuality],
        ['Workmanship', review.workmanship],
        ['Price honesty', review.priceHonesty],
        ['Communication', review.communication],
      ].forEach(([label, score]) => {
        const term = document.createElement('dt')
        term.textContent = label
        const detail = document.createElement('dd')
        detail.textContent = `${score} / 5`
        scores.append(term, detail)
      })
      card.append(scores)
      if (review.comment) {
        const comment = document.createElement('p')
        comment.textContent = review.comment
        card.append(comment)
      }
      if (review.craftsmanReply) {
        const reply = document.createElement('div')
        reply.className = 'public-profile-review-reply'
        const replyTitle = document.createElement('strong')
        replyTitle.textContent = 'Craftsman reply'
        const replyText = document.createElement('p')
        replyText.textContent = review.craftsmanReply
        reply.append(replyTitle, replyText)
        card.append(reply)
      }
      target.append(card)
    })
  }

  if (!/^\d+$/.test(craftsmanId)) {
    showError('This craftsman profile could not be found.')
    return
  }

  try {
    const [{ craftsman }, reviewsPayload] = await Promise.all([
      fetchJson(`/api/craftsmen/${encodeURIComponent(craftsmanId)}`),
      fetchJson(`/api/craftsmen/${encodeURIComponent(craftsmanId)}/reviews`),
    ])
    if (!craftsman) throw new Error('This craftsman profile could not be found.')

    const trust = trustLabel(craftsman.trustLevelLabel)
    document.getElementById('public-profile-name').textContent = craftsman.businessName || 'Independent craftsman'
    document.getElementById('public-profile-category').textContent = craftsman.category?.nameEn || 'Not specified'
    document.getElementById('public-profile-bio').textContent = craftsman.bio || 'No business description is available yet.'
    document.getElementById('public-profile-trust').textContent = trust.text
    document.getElementById('public-profile-jobs').textContent = String(craftsman.totalJobs ?? 0)

    const meta = document.getElementById('public-profile-meta')
    meta.replaceChildren()
    if (craftsman.category?.nameEn) {
      const category = document.createElement('span')
      category.className = 'status-badge'
      category.textContent = craftsman.category.nameEn
      meta.append(category)
    }
    const badge = document.createElement('span')
    badge.className = `trust-badge trust-${trust.value}`
    badge.textContent = trust.text
    meta.append(badge)

    renderNextAction()
    renderPhotos(craftsman.workPhotos, craftsman.businessName || 'Craftsman')
    renderReviews(reviewsPayload)
    loading.hidden = true
    content.hidden = false
  } catch (error) {
    showError(error.message || 'We could not load this craftsman profile. Please try again.')
  }
})
