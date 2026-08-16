const MINIMUM_REVIEWS_FOR_AVERAGE = 3

document.addEventListener('DOMContentLoaded', () => {
  const dashboardPage = document.querySelector('#craftsman-dashboard-page')

  if (!dashboardPage) {
    return
  }

  const newJobRequests = dashboardPage.querySelector('[data-dashboard-new-job-requests]')
  const activeJobs = dashboardPage.querySelector('[data-dashboard-active-jobs]')
  const averageRating = dashboardPage.querySelector('[data-dashboard-average-rating]')
  const craftsmanId = Number(dashboardPage.dataset.craftsmanId)

  void loadJobMetrics(newJobRequests, activeJobs)

  if (Number.isSafeInteger(craftsmanId) && craftsmanId > 0) {
    void loadAverageRating(averageRating, craftsmanId)
  } else {
    setUnavailable(averageRating, 'Average rating unavailable')
  }
})

async function loadJobMetrics(newJobRequests, activeJobs) {
  try {
    const response = await fetch('/api/jobs', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Job metrics request failed')
    }

    const payload = await response.json()

    if (!Array.isArray(payload.jobs)) {
      throw new Error('Job metrics response is invalid')
    }

    const pendingCount = payload.jobs.filter((job) => job.status === 'pending').length
    const inProgressCount = payload.jobs.filter((job) => job.status === 'in_progress').length

    setReady(newJobRequests, pendingCount, `${pendingCount} new job requests`)
    setReady(activeJobs, inProgressCount, `${inProgressCount} active jobs`)
  } catch (error) {
    console.error('Failed to load dashboard job metrics')
    setUnavailable(newJobRequests, 'new_jobs_unavailable', 'New job requests unavailable', 'Yeni iş talepleri mevcut değil')
    setUnavailable(activeJobs, 'active_jobs_unavailable', 'Active jobs unavailable', 'Aktif işler mevcut değil')
  }
}

async function loadAverageRating(averageRating, craftsmanId) {
  try {
    const response = await fetch(`/api/craftsmen/${craftsmanId}/reviews`, {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error('Average rating request failed')
    }

    const payload = await response.json()
    const reviewCount = Number(payload.count)
    const rating = payload.average === null ? null : Number(payload.average)

    if (
      rating === null ||
      !Number.isFinite(rating) ||
      !Number.isSafeInteger(reviewCount) ||
      reviewCount < MINIMUM_REVIEWS_FOR_AVERAGE
    ) {
      setUnavailable(averageRating, 'average_rating_unavailable', 'Average rating unavailable', 'Ortalama puan mevcut değil')
      return
    }

    const formattedRating = rating.toFixed(1)
    setReady(
      averageRating,
      `${formattedRating}/5`,
      `${formattedRating} out of 5 from ${reviewCount} reviews`
    )
  } catch (error) {
    console.error('Failed to load dashboard average rating')
    setUnavailable(averageRating, 'average_rating_unavailable', 'Average rating unavailable', 'Ortalama puan mevcut değil')
  }
}

function setReady(element, value, label) {
  element.textContent = String(value)
  element.dataset.state = 'ready'
  element.setAttribute('aria-label', label)
}

const setUnavailable = (element, messageKey, messageEn, messageTr) => {
  const isTr = document.documentElement.lang === 'tr'
  element.textContent = '—'
  element.dataset.state = 'unavailable'
  element.setAttribute('aria-label', isTr ? messageTr : messageEn)
}
