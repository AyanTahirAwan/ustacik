import Alpine from 'alpinejs'

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

Alpine.start()

const searchForm = document.getElementById('search-form')

if (searchForm) {
  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const resultsContainer = document.getElementById('search-results')

    resultsContainer.innerHTML = '<p>Searching...</p>'

    const formData = new FormData(searchForm)
    const params = new URLSearchParams(formData)

    const response = await fetch(`/api/search/services?${params.toString()}`)
    const { data } = await response.json()

    console.log(data)

    renderResults(data)
  })
}

async function loadCategories() {
  const categorySelect = document.getElementById('category-select')

  // Don't run on pages that don't have this dropdown
  if (!categorySelect) {
    return
  }

  try {
    const response = await fetch('/api/catalog/categories')
    const { data: categories } = await response.json()

    categorySelect.innerHTML = '<option value="">All Categories</option>'

    categories.forEach((category) => {
      const option = document.createElement('option')

      option.value = category.id
      option.textContent = category.nameEn

      categorySelect.appendChild(option)
    })
  } catch (error) {
    console.error('Failed to load categories', error)

    categorySelect.innerHTML =
      '<option value="">Unable to load categories</option>'
  }
}

async function loadRegions() {
  const regionSelect = document.getElementById('region-select')

  if (!regionSelect) {
    return
  }

  try {
    const response = await fetch('/api/catalog/regions')
    const { data: regions } = await response.json()

    regionSelect.innerHTML = '<option value="">All Regions</option>'

    regions.forEach((region) => {
      const option = document.createElement('option')

      option.value = region.id
      option.textContent = region.nameEn

      regionSelect.appendChild(option)
    })
  } catch (error) {
    console.error('Failed to load regions', error)

    regionSelect.innerHTML =
      '<option value="">Unable to load regions</option>'
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategories()
  loadRegions()
})

function renderResults(results) {
  const container = document.getElementById('search-results')

  if (!container) {
    return
  }

  if (results.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p>No services found.</p>
      </div>
    `
    return
  }

  container.innerHTML = ''

  results.forEach((result) => {
    container.innerHTML += `
      <div class="card">
        <pre>${JSON.stringify(result, null, 2)}</pre>
      </div>
    `
  })
}
