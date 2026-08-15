const isTr = window.APP_LOCALE === 'tr'
const tr = (en, trText) => (isTr ? trText : en)

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.getElementById('craftsman-subscription-page')

  if (!page) {
    return
  }

  const loading = document.getElementById('craftsman-subscription-loading')
  const content = document.getElementById('craftsman-subscription-content')
  const error = document.getElementById('craftsman-subscription-error')
  const errorMessage = document.getElementById('craftsman-subscription-error-message')
  const emptyState = document.getElementById('craftsman-subscription-empty')
  const details = document.getElementById('craftsman-subscription-details')

  const statusBadge = document.getElementById('craftsman-subscription-status')
  const plan = document.getElementById('craftsman-subscription-plan')
  const statusText = document.getElementById('craftsman-subscription-status-text')
  const start = document.getElementById('craftsman-subscription-start')
  const end = document.getElementById('craftsman-subscription-end')
  const fee = document.getElementById('craftsman-subscription-fee')

  function formatLabel(value) {
    if (!value) {
      return tr('Unavailable', 'Mevcut değil')
    }

    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatDate(value) {
    if (!value) {
      return tr('No end date', 'Bitiş tarihi yok')
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return tr('Unavailable', 'Mevcut değil')
    }

    return new Intl.DateTimeFormat(isTr ? 'tr' : 'en', {
      dateStyle: 'medium',
    }).format(date)
  }

  function renderSubscription(subscription) {
    const status = formatLabel(subscription.status)

    plan.textContent = formatLabel(subscription.planType)
    statusText.textContent = status
    start.textContent = formatDate(subscription.periodStart)
    end.textContent = formatDate(subscription.periodEnd)
    
    const formatter = new Intl.NumberFormat(isTr ? 'tr' : 'en')
    fee.textContent = subscription.monthlyFee ? formatter.format(subscription.monthlyFee) : '0'

    statusBadge.textContent = status
    statusBadge.dataset.status = subscription.status
  }

  try {
    const response = await fetch('/api/craftsman/subscription', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (response.status === 404) {
      loading.hidden = true
      content.hidden = false
      details.hidden = true
      statusBadge.hidden = true
      emptyState.hidden = false
      return
    }

    if (!response.ok) {
      throw new Error('Subscription request failed')
    }

    const { subscription } = await response.json()

    if (!subscription) {
      throw new Error('Subscription is missing')
    }

    renderSubscription(subscription)

    loading.hidden = true
    content.hidden = false
  } catch (loadError) {
    console.error('Failed to load craftsman subscription', loadError)

    loading.hidden = true
    errorMessage.textContent =
      tr('Unable to load your subscription information. Please try again.', 'Abonelik bilgileriniz yüklenemedi. Lütfen tekrar deneyin.')
    error.hidden = false
  }
})
