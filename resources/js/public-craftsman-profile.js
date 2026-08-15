const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

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
        ? tr('This craftsman profile could not be found.', 'Bu usta profili bulunamadı.')
        : tr('We could not load this craftsman profile. Please try again.', 'Bu usta profili yüklenemedi. Lütfen tekrar deneyin.')
      throw new Error(message)
    }
    return payload
  }

  const trustLabel = (value) => {
    const map = {
      unverified: tr('Unverified', 'Doğrulanmamış'),
      registered: tr('Registered', 'Kayıtlı'),
      verified: tr('Verified', 'Doğrulanmış'),
      approved: tr('Approved', 'Onaylı'),
    }
    const allowed = ['unverified', 'registered', 'verified', 'approved']
    const safe = allowed.includes(value) ? value : 'unverified'
    return { value: safe, text: map[safe] }
  }

  const renderNextAction = () => {
    const copy = document.getElementById('public-profile-next-copy')
    const target = document.getElementById('public-profile-next-cta')
    target.replaceChildren()

    if (role === 'guest') {
      copy.textContent = tr(
        'Sign in with a customer account to request this service.',
        'Bu hizmeti talep etmek için müşteri hesabınızla giriş yapın.'
      )
      const link = document.createElement('a')
      link.className = 'btn-primary public-profile-cta'
      link.href = '/login'
      link.textContent = tr('Login to Request Service', 'Hizmet Talep Etmek İçin Giriş Yapın')
      target.append(link)
      return
    }

    if (role === 'customer') {
      copy.textContent = tr(
        'Describe the work you need and send a request directly to this craftsman.',
        'İhtiyacınız olan işi açıklayın ve bu ustaya doğrudan talep gönderin.'
      )
      const link = document.createElement('a')
      link.className = 'btn-primary public-profile-cta'
      link.href = `/craftsmen/${encodeURIComponent(craftsmanId)}/request`
      link.textContent = tr('Request Service', 'Hizmet Talep Et')
      target.append(link)
      return
    }

    copy.textContent = tr(
      'Service requests are available to customer accounts.',
      'Hizmet talepleri yalnızca müşteri hesapları için mevcuttur.'
    )
    const button = document.createElement('button')
    button.className = 'btn-primary public-profile-cta'
    button.type = 'button'
    button.disabled = true
    button.textContent = tr('Customer Action Only', 'Yalnızca Müşteri İşlemi')
    target.append(button)
  }

  const renderPhotos = (photos = [], businessName) => {
    const target = document.getElementById('public-profile-photos')
    target.replaceChildren()
    if (!photos.length) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.textContent = tr('No previous work photos available yet.', 'Henüz iş fotoğrafı eklenmemiş.')
      target.append(empty)
      return
    }

    photos.forEach((photo, index) => {
      const frame = document.createElement('figure')
      frame.className = 'public-profile-photo-frame'
      const image = document.createElement('img')
      image.className = 'public-profile-photo'
      image.src = photo.imageUrl
      image.alt = `${businessName} ${tr('previous work', 'iş fotoğrafı')} ${index + 1}`
      image.loading = 'lazy'
      image.addEventListener('error', () => {
        const unavailable = document.createElement('div')
        unavailable.className = 'public-profile-photo-unavailable'
        unavailable.textContent = tr('Photo unavailable', 'Fotoğraf mevcut değil')
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
      ? tr('Not available', 'Mevcut değil')
      : `${Number(average).toFixed(1)} / 5`
    summary.textContent = average === null
      ? isTr
        ? `${count} değerlendirme · Ortalama, 3 değerlendirmeden sonra gösterilir`
        : `${count} review${count === 1 ? '' : 's'} · Average shown after 3 reviews`
      : isTr
        ? `${count} değerlendirmeden ${Number(average).toFixed(1)} / 5`
        : `${Number(average).toFixed(1)} out of 5 from ${count} reviews`
    target.replaceChildren()

    if (!reviews.length) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.textContent = tr('No customer reviews available yet.', 'Henüz müşteri değerlendirmesi yok.')
      target.append(empty)
      return
    }

    reviews.forEach((review) => {
      const card = document.createElement('article')
      card.className = 'public-profile-review-card'
      const heading = document.createElement('div')
      heading.className = 'public-profile-review-heading'
      const title = document.createElement('h3')
      title.textContent = tr('Customer review', 'Müşteri değerlendirmesi')
      const rating = document.createElement('strong')
      const value = reviewAverage(review)
      rating.textContent = value === null
        ? tr('Rating unavailable', 'Puan mevcut değil')
        : `${value.toFixed(1)} / 5`
      heading.append(title, rating)
      card.append(heading)
      const scores = document.createElement('dl')
      scores.className = 'public-profile-review-scores'
      ;[
        [tr('Punctuality', 'Zamanlama'), review.punctuality],
        [tr('Workmanship', 'İşçilik'), review.workmanship],
        [tr('Price honesty', 'Fiyat dürüstlüğü'), review.priceHonesty],
        [tr('Communication', 'İletişim'), review.communication],
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
        replyTitle.textContent = tr('Craftsman reply', 'Usta yanıtı')
        const replyText = document.createElement('p')
        replyText.textContent = review.craftsmanReply
        reply.append(replyTitle, replyText)
        card.append(reply)
      }
      target.append(card)
    })
  }

  if (!/^\d+$/.test(craftsmanId)) {
    showError(tr('This craftsman profile could not be found.', 'Bu usta profili bulunamadı.'))
    return
  }

  try {
    const [{ craftsman }, reviewsPayload] = await Promise.all([
      fetchJson(`/api/craftsmen/${encodeURIComponent(craftsmanId)}`),
      fetchJson(`/api/craftsmen/${encodeURIComponent(craftsmanId)}/reviews`),
    ])
    if (!craftsman) throw new Error(tr('This craftsman profile could not be found.', 'Bu usta profili bulunamadı.'))

    const trust = trustLabel(craftsman.trustLevelLabel)
    document.getElementById('public-profile-name').textContent =
      craftsman.businessName || tr('Independent craftsman', 'Bağımsız usta')
    document.getElementById('public-profile-category').textContent =
      (isTr ? craftsman.category?.nameTr : craftsman.category?.nameEn) ||
      tr('Not specified', 'Belirtilmemiş')
    document.getElementById('public-profile-bio').textContent =
      craftsman.bio || tr('No business description is available yet.', 'Henüz bir işletme açıklaması eklenmemiş.')
    document.getElementById('public-profile-trust').textContent = trust.text
    document.getElementById('public-profile-jobs').textContent = String(craftsman.totalJobs ?? 0)

    const meta = document.getElementById('public-profile-meta')
    meta.replaceChildren()
    const categoryName = isTr ? craftsman.category?.nameTr : craftsman.category?.nameEn
    if (categoryName) {
      const category = document.createElement('span')
      category.className = 'status-badge'
      category.textContent = categoryName
      meta.append(category)
    }
    const badge = document.createElement('span')
    badge.className = `trust-badge trust-${trust.value}`
    badge.textContent = trust.text
    meta.append(badge)

    renderNextAction()
    renderPhotos(craftsman.workPhotos, craftsman.businessName || tr('Craftsman', 'Usta'))
    renderReviews(reviewsPayload)
    loading.hidden = true
    content.hidden = false
  } catch (error) {
    showError(error.message || tr('We could not load this craftsman profile. Please try again.', 'Bu usta profili yüklenemedi. Lütfen tekrar deneyin.'))
  }
})
