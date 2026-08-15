const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

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
    if (!response.ok) throw new Error(response.status === 404 ? tr('This craftsman could not be found.', 'Bu usta bulunamadı.') : payload.message || tr('Unable to load the request form.', 'Talep formu yüklenemedi.'))
    return payload
  }

  if (!/^\d+$/.test(craftsmanId)) {
    showPageError(tr('This craftsman could not be found.', 'Bu usta bulunamadı.'))
    return
  }

  try {
    const [{ craftsman }, { data: regions = [] }] = await Promise.all([
      fetchJson(`/api/craftsmen/${encodeURIComponent(craftsmanId)}`),
      fetchJson('/api/catalog/regions'),
    ])
    if (!craftsman) throw new Error(tr('This craftsman could not be found.', 'Bu usta bulunamadı.'))

    document.getElementById('request-craftsman-name').textContent = craftsman.businessName || tr('Independent craftsman', 'Bağımsız usta')
    document.getElementById('request-craftsman-category').textContent = (isTr ? craftsman.category?.nameTr : craftsman.category?.nameEn) || tr('Category not specified', 'Kategori belirtilmemiş')
    region.replaceChildren(new Option(tr('Choose a region', 'Bir bölge seçin'), ''))
    regions.forEach((item) => region.append(new Option(isTr ? item.nameTr : item.nameEn, item.id)))
    loading.hidden = true
    content.hidden = false
    setBusy(false)
  } catch (error) {
    showPageError(error.message || tr('Unable to load the request form.', 'Talep formu yüklenemedi.'))
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    formError.hidden = true
    if (!form.reportValidity()) return
    if (!csrf) {
      formError.textContent = tr('Unable to send your request. Please refresh the page and try again.', 'Talebiniz gönderilemedi. Lütfen sayfayı yenileyip tekrar deneyin.')
      formError.hidden = false
      return
    }

    requestId ??= generateRequestId()
    setBusy(true)
    submit.textContent = tr('Sending…', 'Gönderiliyor…')
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
        throw new Error(payload.errors?.[0]?.message || payload.message || tr('Unable to send your request. Please try again.', 'Talebiniz gönderilemedi. Lütfen tekrar deneyin.'))
      }
      window.location.assign('/customer/requests?created=1')
    } catch (error) {
      formError.textContent = error.message || tr('Unable to send your request. Please try again.', 'Talebiniz gönderilemedi. Lütfen tekrar deneyin.')
      formError.hidden = false
      setBusy(false)
      submit.textContent = tr('Send Request', 'Talebi Gönder')
    }
  })
})
