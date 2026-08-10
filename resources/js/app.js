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
      content.append(
        element('h3', 'catalog-card-title', craftsman.businessName || 'Independent craftsman')
      )
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
      content.append(
        element('p', 'craftsman-bio', craftsman.bio || 'Profile details have not been added yet.')
      )
      content.append(element('p', 'jobs-completed', `${craftsman.totalJobs ?? 0} completed jobs`))
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
    container.append(card)
  })
}

async function initSearch() {
  const form = document.getElementById('search-form')
  if (!form) return

  const params = new URLSearchParams(window.location.search)
  const categorySelect = document.getElementById('category-select')
  const regionSelect = document.getElementById('region-select')
  const results = document.getElementById('search-results')

  try {
    const [{ data: categories = [] }, { data: regions = [] }] = await Promise.all([
      fetchJson('/api/catalog/categories'),
      fetchJson('/api/catalog/regions'),
    ])
    clear(categorySelect)
    addOption(categorySelect, '', 'All categories', params.get('categoryId'))
    categories.forEach((category) =>
      addOption(categorySelect, category.id, category.nameEn, params.get('categoryId'))
    )
    clear(regionSelect)
    addOption(regionSelect, '', 'All regions', params.get('regionId'))
    regions.forEach((region) =>
      addOption(regionSelect, region.id, region.nameEn, params.get('regionId'))
    )
  } catch (error) {
    showState(results, error.message || apiMessage, true)
  }

  for (const name of ['minPrice', 'maxPrice']) {
    const input = form.elements.namedItem(name)
    if (input && params.has(name)) input.value = params.get(name)
  }

  await populateSubServices(params.get('categoryId'), params.get('subServiceId'))
  categorySelect.addEventListener('change', () => populateSubServices(categorySelect.value))

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

  if (params.size) await submitSearch(false)
}

async function initSignup() {
  const roleSelect = document.getElementById('role')
  const craftsmanFields = document.getElementById('craftsman-signup-fields')
  const categorySelect = document.getElementById('signup-category-select')
  if (!roleSelect || !craftsmanFields || !categorySelect) return

  const businessInput = document.getElementById('businessName')

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
  loadCategoriesPage()
  loadCategoryDetail()
  loadCraftsmenPage()
  loadRegionsPage()
  initSearch()
  initSignup()
})
