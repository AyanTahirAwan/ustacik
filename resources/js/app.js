import Alpine from 'alpinejs'

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => (this.isVisible = true), 80)
      setTimeout(() => this.dismiss(), 5000)
    },
  }
})

Alpine.start()

const apiMessage = 'We could not load this information. Please try again.'

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const validationMessage = payload.errors?.[0]?.message
    throw new Error(validationMessage || payload.message || apiMessage)
  }

  return payload
}

function initNavigation() {
  const header = document.querySelector('[data-site-header]')
  const menuToggle = document.querySelector('[data-site-menu-toggle]')
  const userMenus = [...document.querySelectorAll('[data-dropdown-menu]')]

  const closeUserMenus = (except = null) => {
    userMenus.forEach((menu) => {
      if (menu !== except) {
        menu.open = false
        menu.querySelector('summary')?.setAttribute('aria-expanded', 'false')
      }
    })
  }

  if (header && menuToggle) {
    menuToggle.addEventListener('click', () => {
      const open = header.toggleAttribute('data-menu-open')
      menuToggle.setAttribute('aria-expanded', String(open))
      if (!open) closeUserMenus()
    })
  }

  userMenus.forEach((menu) => {
    const trigger = menu.querySelector('summary')
    const items = [...menu.querySelectorAll('[role="menuitem"]')]

    menu.addEventListener('toggle', () => {
      if (menu.open) closeUserMenus(menu)
      trigger.setAttribute('aria-expanded', String(menu.open))
    })

    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menu.open = false
        trigger.setAttribute('aria-expanded', 'false')
        trigger.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      if (!menu.open) menu.open = true
      const currentIndex = items.indexOf(document.activeElement)
      const nextIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : event.key === 'ArrowDown'
              ? (currentIndex + 1 + items.length) % items.length
              : (currentIndex - 1 + items.length) % items.length
      items[nextIndex]?.focus()
    })
  })

  document.addEventListener('click', (event) => {
    userMenus.forEach((menu) => {
      if (!menu.contains(event.target)) {
        menu.open = false
        menu.querySelector('summary')?.setAttribute('aria-expanded', 'false')
      }
    })
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    closeUserMenus()
    if (header?.hasAttribute('data-menu-open')) {
      header.removeAttribute('data-menu-open')
      menuToggle?.setAttribute('aria-expanded', 'false')
      menuToggle?.focus()
    }
  })

  const workspace = document.querySelector('.craftsman-workspace-menu')
  if (workspace) {
    const mobileWorkspace = window.matchMedia('(max-width: 768px)')
    const trigger = workspace.querySelector('summary')
    const items = [...workspace.querySelectorAll('.dashboard-nav a')]
    const setWorkspaceOpen = (open) => {
      workspace.open = open
      trigger?.setAttribute('aria-expanded', String(open))
    }
    const syncWorkspace = (event) => {
      setWorkspaceOpen(!event.matches)
    }

    workspace.addEventListener('toggle', () => {
      trigger?.setAttribute('aria-expanded', String(workspace.open))
    })

    trigger?.addEventListener('click', (event) => {
      if (!mobileWorkspace.matches) event.preventDefault()
    })

    workspace.addEventListener('keydown', (event) => {
      if (!mobileWorkspace.matches) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setWorkspaceOpen(false)
        trigger?.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      if (!workspace.open) setWorkspaceOpen(true)
      const currentIndex = items.indexOf(document.activeElement)
      const nextIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : event.key === 'ArrowDown'
              ? currentIndex < 0
                ? 0
                : (currentIndex + 1) % items.length
              : currentIndex < 0
                ? items.length - 1
                : (currentIndex - 1 + items.length) % items.length
      items[nextIndex]?.focus()
    })

    document.addEventListener('click', (event) => {
      if (mobileWorkspace.matches && !workspace.contains(event.target)) {
        setWorkspaceOpen(false)
      }
    })

    syncWorkspace(mobileWorkspace)
    mobileWorkspace.addEventListener('change', syncWorkspace)
  }
}

function clear(element) {
  element.replaceChildren()
}

function element(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function showState(container, message, isError = false) {
  clear(container)
  const state = element('div', `empty-state${isError ? ' error-state' : ''}`)
  state.append(element('p', '', message))
  container.append(state)
}

async function loadCategoriesPage() {
  const container = document.getElementById('categories-list')
  if (!container) return

  try {
    const { data = [] } = await fetchJson('/api/catalog/categories')
    if (!data.length) return showState(container, 'No service categories are available yet.')

    clear(container)
    data.forEach((category) => {
      const card = element('a', 'catalog-card')
      card.href = `/categories/${category.id}`
      card.append(element('h3', 'catalog-card-title', category.nameEn))
      if (category.nameTr && category.nameTr !== category.nameEn) {
        card.append(element('p', 'catalog-translation', category.nameTr))
      }
      card.append(element('span', 'card-link', 'View services →'))
      container.append(card)
    })
  } catch (error) {
    showState(container, error.message || apiMessage, true)
  }
}

async function loadCategoryDetail() {
  const detail = document.getElementById('category-detail')
  const container = document.getElementById('sub-services-list')
  if (!detail || !container) return

  const categoryId = detail.dataset.categoryId

  try {
    const [{ data: categories = [] }, { data: services = [] }] = await Promise.all([
      fetchJson('/api/catalog/categories'),
      fetchJson(`/api/catalog/categories/${encodeURIComponent(categoryId)}/sub-services`),
    ])
    const category = categories.find((item) => String(item.id) === categoryId)
    const title = document.getElementById('category-title')

    if (!category) {
      if (title) title.textContent = 'Category not found'
      return showState(container, 'This category does not exist or is no longer available.', true)
    }

    if (title) title.textContent = category.nameEn
    document.title = `${category.nameEn} — Ustacik`

    if (!services.length)
      return showState(container, 'No services have been added to this category yet.')

    clear(container)
    services.forEach((service) => {
      const card = element('article', 'catalog-card')
      card.append(element('h3', 'catalog-card-title', service.nameEn))
      if (service.nameTr && service.nameTr !== service.nameEn) {
        card.append(element('p', 'catalog-translation', service.nameTr))
      }
      const link = element('a', 'card-link', 'Find this service →')
      link.href = `/search?categoryId=${category.id}&subServiceId=${service.id}`
      card.append(link)
      container.append(card)
    })
  } catch (error) {
    showState(container, error.message || apiMessage, true)
  }
}

async function loadRegionsPage() {
  const container = document.getElementById('regions-list')
  if (!container) return

  try {
    const { data = [] } = await fetchJson('/api/catalog/regions')
    if (!data.length) return showState(container, 'No service regions are available yet.')

    clear(container)
    data.forEach((region) => {
      const card = element('article', 'catalog-card')
      card.append(element('h3', 'catalog-card-title', region.nameEn))
      if (region.nameTr && region.nameTr !== region.nameEn) {
        card.append(element('p', 'catalog-translation', region.nameTr))
      }
      const link = element('a', 'card-link', 'Find services here →')
      link.href = `/search?regionId=${region.id}`
      card.append(link)
      container.append(card)
    })
  } catch (error) {
    showState(container, error.message || apiMessage, true)
  }
}

async function loadCraftsmenPage() {
  const container = document.getElementById('craftsmen-list')
  if (!container) return

  try {
    const { craftsmen = [] } = await fetchJson('/api/craftsmen')
    if (!craftsmen.length) return showState(container, 'No craftsman profiles are available yet.')

    clear(container)
    craftsmen.forEach((craftsman) => {
      const card = element('article', 'craftsman-card')
      const photo = craftsman.workPhotos?.[0]
      const media = element('div', 'craftsman-media')
      if (photo?.imageUrl) {
        const image = element('img', 'craftsman-photo')
        image.src = photo.imageUrl
        image.alt = `${craftsman.businessName} work sample`
        image.loading = 'lazy'
        media.append(image)
      } else {
        const fallback = element('div', 'craftsman-photo craftsman-photo-fallback')
        fallback.setAttribute('aria-hidden', 'true')
        fallback.textContent = craftsman.businessName?.charAt(0)?.toUpperCase() || 'U'
        media.append(fallback)
      }

      const content = element('div', 'craftsman-content')
      const heading = element(
        'h3',
        'craftsman-name',
        craftsman.businessName || 'Independent craftsman'
      )
      content.append(heading)
      const meta = element('div', 'craftsman-meta')
      if (craftsman.category?.nameEn)
        meta.append(element('span', 'status-badge', craftsman.category.nameEn))
      meta.append(
        element(
          'span',
          `trust-badge trust-${craftsman.trustLevelLabel}`,
          craftsman.trustLevelLabel || 'unverified'
        )
      )
      content.append(meta)
      content.append(element('p', 'craftsman-bio', craftsman.bio || 'Profile details coming soon.'))
      const stats = element('div', 'craftsman-stats')
      stats.append(element('span', 'jobs-completed', `${craftsman.totalJobs ?? 0} completed jobs`))
      const profileLink = element('a', 'card-link marketplace-card-action', 'View Profile →')
      profileLink.href = `/craftsmen/${encodeURIComponent(craftsman.userId)}`
      content.append(stats, profileLink)
      card.append(media, content)
      container.append(card)
    })
  } catch (error) {
    showState(container, error.message || apiMessage, true)
  }
}

function addOption(select, value, label, selectedValue) {
  const option = document.createElement('option')
  option.value = value
  option.textContent = label
  option.selected = String(value) === String(selectedValue)
  select.append(option)
}

async function populateSubServices(categoryId, selectedValue = '') {
  const select = document.getElementById('sub-service-select')
  if (!select) return
  clear(select)

  if (!categoryId) {
    addOption(select, '', 'Choose a category first', '')
    select.disabled = true
    return
  }

  select.disabled = true
  addOption(select, '', 'Loading services…', '')
  try {
    const { data = [] } = await fetchJson(`/api/catalog/categories/${categoryId}/sub-services`)
    clear(select)
    addOption(select, '', 'All services', selectedValue)
    data.forEach((service) => addOption(select, service.id, service.nameEn, selectedValue))
    select.value = selectedValue || ''
    select.disabled = false
  } catch {
    clear(select)
    addOption(select, '', 'Unable to load services', '')
  }
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results')
  if (!container) return
  if (!results.length)
    return showState(container, 'No services match these filters. Try broadening your search.')

  clear(container)
  results.forEach((result) => {
    const card = element('article', 'result-card')
    card.append(element('h3', 'catalog-card-title', result.subService?.nameEn || 'Service'))
    card.append(
      element('p', 'result-business', result.craftsman?.businessName || 'Independent craftsman')
    )
    const details = element('dl', 'result-details')
    const rows = [
      ['Category', result.subService?.category?.nameEn],
      ['Region', result.region?.nameEn],
      ['Price', `${result.minPrice}–${result.maxPrice} ${result.currency}`],
    ]
    rows.forEach(([label, value]) => {
      if (value === undefined || value === null) return
      details.append(element('dt', '', label), element('dd', '', value))
    })
    card.append(details)
    if (result.craftsman?.userId) {
      const profileLink = element('a', 'card-link marketplace-card-action', 'View Craftsman →')
      profileLink.href = `/craftsmen/${encodeURIComponent(result.craftsman.userId)}`
      card.append(profileLink)
    }
    container.append(card)
  })
}

async function initSearch() {
  const form = document.getElementById('search-form')
  if (!form) return

  const params = new URLSearchParams(window.location.search)
  const selectedCategoryId = params.get('categoryId') || ''
  const selectedSubServiceId = params.get('subServiceId') || ''
  const selectedRegionId = params.get('regionId') || ''
  const categorySelect = document.getElementById('category-select')
  const subServiceSelect = document.getElementById('sub-service-select')
  const regionSelect = document.getElementById('region-select')
  const results = document.getElementById('search-results')
  const activeFilters = document.getElementById('active-filters')
  const activeFilterValues = document.getElementById('active-filter-values')

  const selectedLabel = (select) =>
    select.value ? select.selectedOptions[0]?.textContent?.trim() : ''
  const updateActiveFilters = () => {
    const values = [
      selectedLabel(categorySelect),
      selectedLabel(subServiceSelect),
      selectedLabel(regionSelect),
    ].filter(Boolean)
    const minPrice = form.elements.namedItem('minPrice')?.value
    const maxPrice = form.elements.namedItem('maxPrice')?.value
    if (minPrice && maxPrice) values.push(`${minPrice}–${maxPrice}`)
    else if (minPrice) values.push(`From ${minPrice}`)
    else if (maxPrice) values.push(`Up to ${maxPrice}`)

    activeFilterValues.textContent = values.join(' · ')
    activeFilters.hidden = values.length === 0
  }

  try {
    const { data: categories = [] } = await fetchJson('/api/catalog/categories')
    clear(categorySelect)
    addOption(categorySelect, '', 'All categories', selectedCategoryId)
    categories.forEach((category) =>
      addOption(categorySelect, category.id, category.nameEn, selectedCategoryId)
    )
    categorySelect.value = selectedCategoryId

    await populateSubServices(categorySelect.value, selectedSubServiceId)

    const { data: regions = [] } = await fetchJson('/api/catalog/regions')
    clear(regionSelect)
    addOption(regionSelect, '', 'All regions', selectedRegionId)
    regions.forEach((region) => addOption(regionSelect, region.id, region.nameEn, selectedRegionId))
    regionSelect.value = selectedRegionId
  } catch (error) {
    showState(results, error.message || apiMessage, true)
  }

  for (const name of ['minPrice', 'maxPrice']) {
    const input = form.elements.namedItem(name)
    if (input && params.has(name)) input.value = params.get(name)
  }

  categorySelect.addEventListener('change', () => populateSubServices(categorySelect.value, ''))
  form.addEventListener('change', updateActiveFilters)
  form.addEventListener('input', updateActiveFilters)

  async function submitSearch(updateUrl = true) {
    const query = new URLSearchParams(new FormData(form))
    for (const [key, value] of [...query]) if (!value) query.delete(key)
    if (updateUrl) window.history.replaceState({}, '', query.size ? `/search?${query}` : '/search')
    showState(results, 'Searching…')
    try {
      const { data = [] } = await fetchJson(`/api/search/services?${query}`)
      renderSearchResults(data)
    } catch (error) {
      showState(results, error.message || apiMessage, true)
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    submitSearch()
  })

  updateActiveFilters()
  if (params.size) await submitSearch(false)
}

async function initSignup() {
  const roleSelect = document.getElementById('role')
  const craftsmanFields = document.getElementById('craftsman-signup-fields')
  const categorySelect = document.getElementById('signup-category-select')
  if (!roleSelect || !craftsmanFields || !categorySelect) return

  const businessInput = document.getElementById('businessName')
  const requestedRole = new URLSearchParams(window.location.search).get('role')
  if (requestedRole === 'customer' || requestedRole === 'craftsman')
    roleSelect.value = requestedRole

  function updateVisibility() {
    const isCraftsman = roleSelect.value === 'craftsman'
    craftsmanFields.hidden = !isCraftsman
    businessInput.required = isCraftsman
    categorySelect.required = isCraftsman
  }

  roleSelect.addEventListener('change', updateVisibility)
  updateVisibility()

  try {
    const { data: categories = [] } = await fetchJson('/api/catalog/categories')
    clear(categorySelect)
    addOption(categorySelect, '', 'Choose a category', '')
    categories.forEach((category) =>
      addOption(categorySelect, category.id, category.nameEn, categorySelect.dataset.oldValue)
    )
  } catch {
    clear(categorySelect)
    addOption(categorySelect, '', 'Unable to load categories', '')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation()
  loadCategoriesPage()
  loadCategoryDetail()
  loadCraftsmenPage()
  loadRegionsPage()
  initSearch()
  initSignup()

  const notificationCount = document.querySelector('[data-notification-count]')
  if (notificationCount) {
    fetchJson('/api/notifications')
      .then(({ unreadCount = 0 }) => {
        notificationCount.textContent = String(unreadCount)
        notificationCount.hidden = unreadCount === 0
      })
      .catch(() => {})
  }
})
