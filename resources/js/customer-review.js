const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('customer-review-page')
  if (!page) return

  const jobId = page.dataset.jobId
  const loading = document.getElementById('customer-review-loading')
  const errorState = document.getElementById('customer-review-error')
  const content = document.getElementById('customer-review-content')
  const form = document.getElementById('customer-review-form')
  const submit = form.querySelector('button[type="submit"]')
  const csrf = form.querySelector('input[name="_csrf"]')?.value
  let job = null

  const showError = (message) => {
    errorState.textContent = message
    errorState.hidden = false
  }

  if (!/^\d+$/.test(jobId)) {
    loading.hidden = true
    showError(tr('This completed job could not be found.', 'Bu tamamlanan iş bulunamadı.'))
    return
  }

  try {
    const response = await fetch('/api/jobs', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(payload.jobs)) throw new Error(tr('Unable to load this completed job.', 'Bu tamamlanan iş yüklenemedi.'))
    job = payload.jobs.find((item) => String(item.id) === jobId)
    if (!job) throw new Error(tr('This completed job could not be found in your requests.', 'Bu iş taleplerinizde bulunamadı.'))
    if (job.status !== 'completed') throw new Error(tr('A review can only be left after the job is completed.', 'Değerlendirme yalnızca iş tamamlandıktan sonra yapılabilir.'))
    if (job.reviewed) throw new Error(tr('This job has already been reviewed.', 'Bu iş zaten değerlendirildi.'))

    document.getElementById('customer-review-craftsman').textContent = job.craftsman?.businessName || tr('Craftsman', 'Usta')
    document.getElementById('customer-review-category').textContent = (isTr ? job.category?.nameTr : job.category?.nameEn) || tr('Not specified', 'Belirtilmemiş')
    loading.hidden = true
    content.hidden = false
  } catch (error) {
    loading.hidden = true
    showError(error.message || tr('Unable to load this completed job.', 'Bu tamamlanan iş yüklenemedi.'))
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!job || !csrf || submit.disabled) return
    errorState.hidden = true
    const values = new FormData(form)
    const body = {
      jobId: Number(jobId),
      punctuality: Number(values.get('punctuality')),
      workmanship: Number(values.get('workmanship')),
      priceHonesty: Number(values.get('priceHonesty')),
      communication: Number(values.get('communication')),
    }
    const comment = String(values.get('comment') || '').trim()
    if (comment) body.comment = comment
    if ([body.punctuality, body.workmanship, body.priceHonesty, body.communication]
      .some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 5)) {
      showError(tr('Choose a rating from 1 to 5 for every category.', '1 ile 5 arasında her kategori için bir puan seçin.'))
      return
    }

    submit.disabled = true
    submit.textContent = tr('Submitting…', 'Gönderiliyor…')
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.review) {
        const fallback = response.status === 401 || response.status === 403
          ? tr('You are not allowed to review this job.', 'Bu işi değerlendirme izniniz yok.')
          : response.status === 404
            ? tr('This completed job could not be found.', 'Bu tamamlanan iş bulunamadı.')
            : tr('Your review could not be submitted. Check the ratings and try again.', 'Değerlendirmeniz gönderilemedi. Puanları kontrol edin ve tekrar deneyin.')
        throw new Error(payload.message || fallback)
      }
      window.location.assign('/customer/requests?reviewed=1')
    } catch (error) {
      showError(error.message || tr('Your review could not be submitted.', 'Değerlendirmeniz gönderilemedi.'))
      submit.disabled = false
      submit.textContent = tr('Submit Review', 'Değerlendirme Gönder')
    }
  })
})
