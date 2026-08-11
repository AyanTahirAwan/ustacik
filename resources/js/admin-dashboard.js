const TRUST_LEVELS = [
  { value: 0, label: 'Unverified', key: 'unverified' },
  { value: 1, label: 'Registered', key: 'registered' },
  { value: 2, label: 'Verified', key: 'verified' },
  { value: 3, label: 'Approved', key: 'approved' },
]

const TRUST_DISPLAY_ORDER = [3, 2, 1, 0]

const TRUST_STAMPS = {
  unverified: 'UNV',
  registered: "REG'D",
  verified: "VER'D",
  approved: "APP'D",
}

const RANGE_LABELS = {
  30: 'last 30 days',
  90: 'last 90 days',
  year: 'this year',
  all: 'all time',
}

document.addEventListener('DOMContentLoaded', () => {
  const accountMenu = document.querySelector('.admin-account-menu')
  const accountMenuTrigger = accountMenu?.querySelector('summary')

  document.addEventListener('click', (event) => {
    if (accountMenu?.open && !accountMenu.contains(event.target)) {
      accountMenu.open = false
    }
  })

  accountMenu?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && accountMenu.open) {
      event.preventDefault()
      accountMenu.open = false
      accountMenuTrigger?.focus()
    }
  })

  const page = document.getElementById('admin-dashboard')

  if (!page) {
    return
  }

  const elements = {
    loading: document.getElementById('admin-dashboard-loading'),
    error: document.getElementById('admin-dashboard-error'),
    retry: document.getElementById('admin-dashboard-retry'),
    content: document.getElementById('admin-dashboard-content'),
    dateRange: document.getElementById('admin-date-range'),
    cohortNote: document.getElementById('admin-cohort-note'),
    totalCraftsmen: document.getElementById('kpi-total-craftsmen'),
    totalCraftsmenNote: document.getElementById('kpi-total-craftsmen-note'),
    approvedTier: document.getElementById('kpi-approved-tier'),
    approvedTierNote: document.getElementById('kpi-approved-tier-note'),
    jobsCompleted: document.getElementById('kpi-jobs-completed'),
    openDisputes: document.getElementById('kpi-open-disputes'),
    openDisputesNote: document.getElementById('kpi-open-disputes-note'),
    trustSummary: document.getElementById('trust-distribution-summary'),
    trustBar: document.getElementById('trust-distribution-bar'),
    trustLegend: document.getElementById('trust-distribution-legend'),
    trustEmpty: document.getElementById('trust-distribution-empty'),
    filters: document.getElementById('craftsmen-filters'),
    search: document.getElementById('craftsmen-search'),
    category: document.getElementById('craftsmen-category'),
    trust: document.getElementById('craftsmen-trust'),
    tableSummary: document.getElementById('craftsmen-table-summary'),
    tableEmpty: document.getElementById('craftsmen-table-empty'),
    tableContainer: document.getElementById('craftsmen-table-container'),
    tableBody: document.getElementById('craftsmen-table-body'),
    jobsList: document.getElementById('jobs-by-category-list'),
    jobsEmpty: document.getElementById('jobs-by-category-empty'),
    disputesSummary: document.getElementById('recent-disputes-summary'),
    disputesList: document.getElementById('recent-disputes-list'),
    disputesEmpty: document.getElementById('recent-disputes-empty'),
  }

  const state = {
    users: [],
    jobs: [],
    disputes: [],
    categories: [],
  }

  const numberFormatter = new Intl.NumberFormat('en')
  const dateFormatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  })

  function formatNumber(value) {
    return numberFormatter.format(value)
  }

  function formatDate(value) {
    if (value === null || value === undefined || String(value).trim() === '') {
      return '—'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return dateFormatter.format(date)
  }

  function formatLabel(value) {
    if (!value) {
      return 'Unavailable'
    }

    return String(value)
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase())
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName)

    if (className) {
      element.className = className
    }

    if (text !== undefined) {
      element.textContent = text
    }

    return element
  }

  function getRange() {
    return elements.dateRange.value
  }

  function getRangeStart() {
    const range = getRange()
    const now = new Date()

    if (range === 'all') {
      return null
    }

    if (range === 'year') {
      return new Date(now.getFullYear(), 0, 1)
    }

    const days = Number(range)
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  }

  function isInSelectedRange(value) {
    const rangeStart = getRangeStart()

    if (!rangeStart) {
      return true
    }

    const date = new Date(value)
    return !Number.isNaN(date.getTime()) && date >= rangeStart
  }

  function getCraftsmenCohort() {
    return state.users.filter((user) => isInSelectedRange(user.createdAt))
  }

  function getDisputesInRange() {
    return state.disputes.filter((dispute) => isInSelectedRange(dispute.createdAt))
  }

  function getCategoryMap() {
    return new Map(state.categories.map((category) => [String(category.id), category]))
  }

  function getCategoryName(categoryId, categoryMap = getCategoryMap()) {
    const category = categoryMap.get(String(categoryId))

    if (!category) {
      return categoryId === null || categoryId === undefined
        ? 'Unassigned'
        : `Category #${categoryId}`
    }

    return category.nameEn || category.nameTr || `Category #${category.id}`
  }

  function getTrustLevel(value) {
    return TRUST_LEVELS.find((level) => level.value === Number(value)) || TRUST_LEVELS[0]
  }

  function getBusinessName(user) {
    return user.craftsman?.businessName || '—'
  }

  function getInitials(value) {
    if (value === '—') {
      return '—'
    }

    return value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.slice(0, 1))
      .join('')
      .toLocaleUpperCase()
  }

  function renderKpis(craftsmen) {
    const approvedCount = craftsmen.filter(
      (user) => Number(user.craftsman?.trustLevel) === 3
    ).length
    const approvedPercentage = craftsmen.length
      ? Math.round((approvedCount / craftsmen.length) * 100)
      : 0
    const allTimeJobs = state.users.reduce(
      (total, user) => total + (Number(user.craftsman?.totalJobs) || 0),
      0
    )
    const disputes = getDisputesInRange()
    const openDisputes = disputes.filter((dispute) => dispute.status === 'OPEN').length
    const rangeLabel = RANGE_LABELS[getRange()]

    elements.totalCraftsmen.textContent = formatNumber(craftsmen.length)
    elements.totalCraftsmenNote.textContent =
      getRange() === 'all' ? 'All registered craftsmen' : `Joined in the ${rangeLabel}`
    elements.approvedTier.textContent = `${approvedPercentage}%`
    elements.approvedTierNote.textContent =
      getRange() === 'all' ? 'Current trust snapshot' : 'Current trust • selected joined cohort'
    elements.jobsCompleted.textContent = formatNumber(allTimeJobs)
    elements.openDisputes.textContent = formatNumber(openDisputes)
    elements.openDisputesNote.textContent =
      getRange() === 'all'
        ? 'Currently open • all time'
        : `Opened in the ${rangeLabel} • still open`
    elements.cohortNote.textContent =
      getRange() === 'all' ? 'Current platform snapshot' : `Craftsmen joined in the ${rangeLabel}`
  }

  function renderTrustDistribution(craftsmen) {
    elements.trustBar.replaceChildren()
    elements.trustLegend.replaceChildren()

    const counts = TRUST_DISPLAY_ORDER.map((value) => {
      const level = TRUST_LEVELS.find((candidate) => candidate.value === value)

      return {
        ...level,
        count: craftsmen.filter((user) => Number(user.craftsman?.trustLevel) === value).length,
      }
    })
    const total = craftsmen.length
    const ariaParts = []

    counts.forEach((level) => {
      const percentage = total ? (level.count / total) * 100 : 0
      const roundedPercentage = total ? Math.round(percentage) : 0
      const segment = createElement('span', `admin-trust-segment admin-trust-${level.key}`)
      segment.style.width = `${percentage}%`
      elements.trustBar.appendChild(segment)

      const legendItem = createElement('span', 'admin-trust-legend-item')
      const dot = createElement('span', `admin-trust-dot admin-trust-${level.key}`)
      const labelText = createElement(
        'span',
        '',
        `${level.label} — ${formatNumber(level.count)} (${roundedPercentage}%)`
      )

      dot.setAttribute('aria-hidden', 'true')
      legendItem.append(dot, labelText)
      elements.trustLegend.appendChild(legendItem)
      ariaParts.push(`${level.label}: ${level.count}, ${roundedPercentage} percent`)
    })

    elements.trustSummary.textContent =
      total === 1 ? '1 craftsman' : `${formatNumber(total)} craftsmen`
    elements.trustBar.setAttribute(
      'aria-label',
      total ? ariaParts.join('. ') : 'No craftsman trust data available'
    )
    elements.trustEmpty.hidden = total !== 0
    elements.trustBar.hidden = total === 0
    elements.trustLegend.hidden = total === 0
  }

  function renderCategoryFilter() {
    const currentValue = elements.category.value
    const firstOption = elements.category.options[0]

    firstOption.textContent = state.categories.length ? 'All categories' : 'No categories available'
    elements.category.replaceChildren(firstOption)
    elements.category.disabled = state.categories.length === 0

    const sortedCategories = [...state.categories].sort((first, second) =>
      getCategoryName(first.id).localeCompare(getCategoryName(second.id))
    )

    sortedCategories.forEach((category) => {
      const option = document.createElement('option')
      option.value = String(category.id)
      option.textContent = getCategoryName(category.id)
      elements.category.appendChild(option)
    })

    elements.category.value = currentValue
  }

  function createPill(value, type = value) {
    return createElement(
      'span',
      `admin-pill admin-pill-${String(type).toLowerCase()}`,
      formatLabel(value)
    )
  }

  function createUnavailableCell() {
    const cell = createElement('td', 'admin-data-unavailable', '—')
    cell.title = 'Aggregate data unavailable'
    return cell
  }

  function renderCraftsmenTable() {
    const craftsmen = getCraftsmenCohort()
    const categoryMap = getCategoryMap()
    const searchQuery = elements.search.value.trim().toLocaleLowerCase()
    const categoryValue = elements.category.value
    const trustValue = elements.trust.value

    const filteredCraftsmen = craftsmen.filter((user) => {
      const businessName = getBusinessName(user).toLocaleLowerCase()
      const matchesSearch = !searchQuery || businessName.includes(searchQuery)
      const matchesCategory = !categoryValue || String(user.craftsman?.categoryId) === categoryValue
      const matchesTrust = !trustValue || String(user.craftsman?.trustLevel ?? 0) === trustValue

      return matchesSearch && matchesCategory && matchesTrust
    })

    elements.tableBody.replaceChildren()

    filteredCraftsmen.forEach((user) => {
      const row = document.createElement('tr')
      const craftsmanCell = document.createElement('td')
      const identity = createElement('div', 'admin-craftsman-identity')
      const businessName = getBusinessName(user)
      const avatar = createElement('span', 'admin-craftsman-avatar', getInitials(businessName))
      const identityText = document.createElement('div')
      const name = createElement('span', 'admin-craftsman-name', businessName)
      const joined = createElement(
        'span',
        'admin-craftsman-joined',
        `Joined ${formatDate(user.createdAt)}`
      )

      avatar.setAttribute('aria-hidden', 'true')
      identityText.append(name, joined)
      identity.append(avatar, identityText)
      craftsmanCell.appendChild(identity)

      const categoryCell = createElement(
        'td',
        '',
        getCategoryName(user.craftsman?.categoryId, categoryMap)
      )
      const regionCell = createUnavailableCell()
      regionCell.title = 'A canonical craftsman region is unavailable'

      const trustCell = document.createElement('td')
      const trustLevel = getTrustLevel(user.craftsman?.trustLevel)
      const trustCellContent = createElement('div', 'admin-trust-cell')
      const trustStamp = createElement(
        'span',
        `admin-trust-stamp admin-trust-stamp-${trustLevel.key}`,
        TRUST_STAMPS[trustLevel.key]
      )
      const trustLabel = createElement('span', 'admin-trust-cell-label', trustLevel.label)
      trustCellContent.append(trustStamp, trustLabel)
      trustCell.appendChild(trustCellContent)

      const jobsCell = createElement(
        'td',
        'admin-jobs-cell',
        formatNumber(Number(user.craftsman?.totalJobs) || 0)
      )
      const ratingCell = createUnavailableCell()
      const honestyCell = createUnavailableCell()
      const statusCell = document.createElement('td')
      statusCell.appendChild(createPill(user.status || 'Unavailable', user.status))

      row.append(
        craftsmanCell,
        categoryCell,
        regionCell,
        trustCell,
        jobsCell,
        ratingCell,
        honestyCell,
        statusCell
      )
      elements.tableBody.appendChild(row)
    })

    elements.tableSummary.textContent = `Showing ${formatNumber(
      filteredCraftsmen.length
    )} of ${formatNumber(craftsmen.length)}`
    elements.tableEmpty.textContent =
      state.users.length === 0
        ? 'No craftsmen are registered yet.'
        : 'No craftsmen match the selected filters and joined-date range.'
    elements.tableEmpty.hidden = filteredCraftsmen.length !== 0
    elements.tableContainer.hidden = filteredCraftsmen.length === 0
  }

  function renderJobsByCategory() {
    elements.jobsList.replaceChildren()

    const completedJobs = state.jobs.filter((job) => job.status === 'completed')
    const categoryMap = getCategoryMap()
    const counts = new Map()

    completedJobs.forEach((job) => {
      const key = String(job.categoryId ?? 'unassigned')
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    const groupedJobs = [...counts.entries()]
      .map(([categoryId, count]) => ({
        categoryId,
        count,
        name: categoryId === 'unassigned' ? 'Unassigned' : getCategoryName(categoryId, categoryMap),
      }))
      .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))

    const highestCount = groupedJobs[0]?.count || 0

    groupedJobs.forEach((group) => {
      const row = createElement('div', 'admin-category-bar-row')
      const name = createElement('span', '', group.name)
      const count = createElement('strong', '', formatNumber(group.count))
      const track = createElement('div', 'admin-category-bar-track')
      const fill = createElement('div', 'admin-category-bar-fill')

      fill.style.setProperty('--bar-size', `${(group.count / highestCount) * 100}%`)
      track.appendChild(fill)
      row.append(name, track, count)
      elements.jobsList.appendChild(row)
    })

    elements.jobsEmpty.textContent =
      state.jobs.length === 0
        ? 'No job records are available yet.'
        : 'No jobs are currently marked completed.'
    elements.jobsEmpty.hidden = groupedJobs.length !== 0
    elements.jobsList.hidden = groupedJobs.length === 0
  }

  function renderRecentDisputes() {
    elements.disputesList.replaceChildren()

    const disputes = getDisputesInRange().slice(0, 4)

    disputes.forEach((dispute) => {
      const item = createElement('article', 'admin-dispute-item')
      const craftsmanName = dispute.craftsman?.businessName || 'Craftsman unavailable'
      const top = createElement('div', 'admin-dispute-top')
      const people = createElement('span', 'admin-dispute-people', craftsmanName)
      const reason = createElement(
        'span',
        'admin-dispute-reason',
        formatLabel(dispute.reasonCategory)
      )
      const description = createElement(
        'p',
        'admin-dispute-description',
        dispute.customerNotes ||
          dispute.job?.description ||
          'No additional description was provided.'
      )

      top.append(people, reason)
      item.append(top, description)
      elements.disputesList.appendChild(item)
    })

    const rangeLabel = RANGE_LABELS[getRange()]
    elements.disputesSummary.textContent =
      getRange() === 'all' ? 'Newest first' : `Opened in the ${rangeLabel}`
    elements.disputesEmpty.hidden = disputes.length !== 0
    elements.disputesList.hidden = disputes.length === 0
  }

  function renderDashboard() {
    const craftsmen = getCraftsmenCohort()

    renderKpis(craftsmen)
    renderTrustDistribution(craftsmen)
    renderCraftsmenTable()
    renderJobsByCategory()
    renderRecentDisputes()
  }

  async function fetchCollection(url, key) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error(`${key} request failed`)
    }

    const payload = await response.json()

    if (!Array.isArray(payload[key])) {
      throw new Error(`${key} collection is missing`)
    }

    return payload[key]
  }

  async function loadDashboard() {
    page.setAttribute('aria-busy', 'true')
    elements.loading.hidden = false
    elements.error.hidden = true
    elements.content.hidden = true

    try {
      const [users, jobs, disputes, categories] = await Promise.all([
        fetchCollection('/api/admin/users?role=craftsman', 'users'),
        fetchCollection('/api/jobs', 'jobs'),
        fetchCollection('/api/admin/disputes', 'disputes'),
        fetchCollection('/api/admin/categories', 'categories'),
      ])

      state.users = users
      state.jobs = jobs
      state.disputes = disputes
      state.categories = categories

      renderCategoryFilter()
      renderDashboard()
      elements.content.hidden = false
    } catch (error) {
      console.error('Failed to load admin dashboard', error)
      elements.error.hidden = false
    } finally {
      page.setAttribute('aria-busy', 'false')
      elements.loading.hidden = true
    }
  }

  elements.dateRange.addEventListener('change', renderDashboard)
  elements.search.addEventListener('input', renderCraftsmenTable)
  elements.category.addEventListener('change', renderCraftsmenTable)
  elements.trust.addEventListener('change', renderCraftsmenTable)
  elements.filters.addEventListener('submit', (event) => event.preventDefault())
  elements.retry.addEventListener('click', loadDashboard)

  loadDashboard()
})
