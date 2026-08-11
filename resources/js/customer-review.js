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
    showError('This completed job could not be found.')
    return
  }

  try {
    const response = await fetch('/api/jobs', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(payload.jobs)) throw new Error('Unable to load this completed job.')
    job = payload.jobs.find((item) => String(item.id) === jobId)
    if (!job) throw new Error('This completed job could not be found in your requests.')
    if (job.status !== 'completed') throw new Error('A review can only be left after the job is completed.')
    if (job.reviewed) throw new Error('This job has already been reviewed.')

    document.getElementById('customer-review-craftsman').textContent = job.craftsman?.businessName || 'Craftsman'
    document.getElementById('customer-review-category').textContent = job.category?.nameEn || 'Not specified'
    loading.hidden = true
    content.hidden = false
  } catch (error) {
    loading.hidden = true
    showError(error.message || 'Unable to load this completed job.')
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
      showError('Choose a rating from 1 to 5 for every category.')
      return
    }

    submit.disabled = true
    submit.textContent = 'Submitting…'
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
          ? 'You are not allowed to review this job.'
          : response.status === 404
            ? 'This completed job could not be found.'
            : 'Your review could not be submitted. Check the ratings and try again.'
        throw new Error(payload.message || fallback)
      }
      window.location.assign('/customer/requests?reviewed=1')
    } catch (error) {
      showError(error.message || 'Your review could not be submitted.')
      submit.disabled = false
      submit.textContent = 'Submit Review'
    }
  })
})
