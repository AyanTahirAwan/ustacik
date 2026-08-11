document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('request-service-page')
  if (!page) return

  const craftsmanId = page.dataset.craftsmanId
  const loading = document.getElementById('request-service-loading')
  const pageError = document.getElementById('request-service-error')
  const formError = document.getElementById('request-service-form-error')
  const content = document.getElementById('request-service-content')
  const form = document.getElementById('request-service-form')
  const region = document.getElementById('request-region')
  const description = document.getElementById('request-description')
  const submit = document.getElementById('request-service-submit')
  const csrf = form.querySelector('input[name="_csrf"]')?.value
  let requestId = null

  const setBusy = (busy) => {
    region.disabled = busy
    description.disabled = busy
    submit.disabled = busy
  }

  const showPageError = (message) => {
    loading.hidden = true
    content.hidden = true
    pageError.textContent = message
    pageError.hidden = false
  }

  const generateRequestId = () => {
    if (crypto.randomUUID) return `REQ-${crypto.randomUUID()}`
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return `REQ-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
  }

  const fetchJson = async (url) => {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(response.status === 404 ? 'This craftsman could not be found.' : payload.message || 'Unable to load the request form.')
    return payload
  }

  if (!/^\d+$/.test(craftsmanId)) {
    showPageError('This craftsman could not be found.')
    return
  }

  try {
    const [{ craftsman }, { data: regions = [] }] = await Promise.all([
      fetchJson(`/api/craftsmen/${encodeURIComponent(craftsmanId)}`),
      fetchJson('/api/catalog/regions'),
    ])
    if (!craftsman) throw new Error('This craftsman could not be found.')

    document.getElementById('request-craftsman-name').textContent = craftsman.businessName || 'Independent craftsman'
    document.getElementById('request-craftsman-category').textContent = craftsman.category?.nameEn || 'Category not specified'
    region.replaceChildren(new Option('Choose a region', ''))
    regions.forEach((item) => region.append(new Option(item.nameEn, item.id)))
    loading.hidden = true
    content.hidden = false
    setBusy(false)
  } catch (error) {
    showPageError(error.message || 'Unable to load the request form.')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    formError.hidden = true
    if (!form.reportValidity()) return
    if (!csrf) {
      formError.textContent = 'Unable to send your request. Please refresh the page and try again.'
      formError.hidden = false
      return
    }

    requestId ??= generateRequestId()
    setBusy(true)
    submit.textContent = 'Sending…'
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify({
          requestId,
          craftsmanId: Number(craftsmanId),
          regionId: Number(region.value),
          description: description.value,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.job) {
        throw new Error(payload.errors?.[0]?.message || payload.message || 'Unable to send your request. Please try again.')
      }
      window.location.assign('/customer/requests?created=1')
    } catch (error) {
      formError.textContent = error.message || 'Unable to send your request. Please try again.'
      formError.hidden = false
      setBusy(false)
      submit.textContent = 'Send Request'
    }
  })
})
