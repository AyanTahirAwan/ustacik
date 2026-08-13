document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('craftsman-jobs-page')
  if (!page) return

  const form = document.getElementById('craftsman-jobs-form')
  const csrf = form.querySelector('input[name="_csrf"]')?.value
  const loading = document.getElementById('craftsman-jobs-loading')
  const errorState = document.getElementById('craftsman-jobs-error')
  const successState = document.getElementById('craftsman-jobs-success')
  const summary = document.getElementById('craftsman-jobs-summary')
  const list = document.getElementById('craftsman-jobs-list')
  const labels = {
    pending: 'Pending', accepted: 'Accepted', declined: 'Declined', in_progress: 'In Progress',
    completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired', disputed: 'Disputed',
  }

  form.addEventListener('submit', (event) => event.preventDefault())

  const addFact = (container, label, value) => {
    if (!value) return
    const term = document.createElement('dt')
    term.textContent = label
    const detail = document.createElement('dd')
    detail.textContent = value
    container.append(term, detail)
  }

  const render = (jobs) => {
    list.replaceChildren()
    list.hidden = false
    const pending = jobs.filter((job) => job.status === 'pending').length
    summary.textContent = pending
      ? `${pending} pending request${pending === 1 ? '' : 's'} need your response.`
      : jobs.length ? 'You have no pending requests.' : ''
    summary.hidden = !jobs.length

    if (!jobs.length) {
      const empty = document.createElement('div')
      empty.className = 'dashboard-empty craftsman-jobs-empty'
      empty.textContent = 'No job requests have been assigned to you yet.'
      list.append(empty)
      return
    }

    jobs.forEach((job) => {
      const card = document.createElement('article')
      card.className = 'craftsman-job-card'
      const heading = document.createElement('div')
      heading.className = 'craftsman-job-heading'
      const title = document.createElement('h3')
      title.textContent = job.customer?.fullName || 'Customer'
      const status = document.createElement('span')
      status.className = `request-status request-status-${job.status}`
      status.textContent = labels[job.status] || job.status
      heading.append(title, status)

      const meta = document.createElement('dl')
      meta.className = 'craftsman-job-meta'
      addFact(meta, 'Category', job.category?.nameEn || job.category?.name)
      addFact(meta, 'Region', job.region?.nameEn || job.region?.name)
      addFact(meta, 'Requested', job.createdAt ? new Date(job.createdAt).toLocaleDateString() : null)

      const description = document.createElement('p')
      description.className = 'craftsman-job-description'
      description.textContent = job.description || 'No description provided.'
      card.append(heading, meta, description)

      if (['pending', 'accepted', 'in_progress'].includes(job.status)) {
        const actions = document.createElement('div')
        actions.className = 'craftsman-job-actions'
        const addAction = (action, text, className) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = className
          button.dataset.jobId = job.id
          button.dataset.jobAction = action
          button.textContent = text
          actions.append(button)
        }
        if (job.status === 'pending') {
          addAction('accept', 'Accept', 'btn-primary')
          addAction('decline', 'Decline', 'btn-back')
        } else if (job.status === 'accepted') {
          addAction('start', 'Start Work', 'btn-primary')
        } else if (job.status === 'in_progress') {
          addAction('complete', 'Mark as Completed', 'btn-primary')
        }
        card.append(actions)
      }
      list.append(card)
    })
  }

  const loadJobs = async () => {
    errorState.hidden = true
    try {
      const response = await fetch('/api/jobs', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !Array.isArray(payload.jobs)) throw new Error(payload.message || 'Unable to load job requests.')
      render(payload.jobs)
    } catch (error) {
      list.hidden = true
      summary.hidden = true
      errorState.textContent = error.message || 'Unable to load job requests.'
      errorState.hidden = false
    } finally {
      loading.hidden = true
    }
  }

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-job-action]')
    if (!button || button.disabled) return
    if (!csrf) {
      errorState.textContent = 'Unable to update this request. Please refresh the page and try again.'
      errorState.hidden = false
      return
    }

    const action = button.dataset.jobAction
    const card = button.closest('.craftsman-job-card')
    const buttons = card.querySelectorAll('button[data-job-action]')
    buttons.forEach((item) => { item.disabled = true })
    errorState.hidden = true
    successState.hidden = true
    try {
      const response = await fetch(`/api/jobs/${button.dataset.jobId}/${action}`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      const expectedStatuses = {
        accept: 'accepted', decline: 'declined', start: 'in_progress', complete: 'completed',
      }
      const expectedStatus = expectedStatuses[action]
      if (!response.ok || payload.job?.status !== expectedStatus) {
        throw new Error(payload.message || 'This request could not be updated. It may have changed already.')
      }
      const successMessages = {
        accept: 'Job request accepted.',
        decline: 'Job request declined.',
        start: 'Work started. The customer can now see that this job is in progress.',
        complete: 'Job marked as completed.',
      }
      successState.textContent = successMessages[action]
      successState.hidden = false
      await loadJobs()
    } catch (error) {
      errorState.textContent = error.message || 'This request could not be updated.'
      errorState.hidden = false
      buttons.forEach((item) => { item.disabled = false })
    }
  })

  loadJobs()
})
