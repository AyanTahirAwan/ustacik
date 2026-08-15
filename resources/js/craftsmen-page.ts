import '../css/app.css'

type Category = {
  id: number
  nameEn?: string
  nameTr?: string
}

type Craftsman = {
  userId: number
  businessName?: string

  category?: {
    id: number
    nameEn?: string
    nameTr?: string
  }

  bio?: string
  trustLevel?: number
  trustLevelLabel?: string
  totalJobs?: number

  prices?: CraftsmanPrice[]
}

type CraftsmenResponse = {
  craftsmen: Craftsman[]
}

type CategoriesResponse = {
  data: Category[]
}

type CraftsmanPrice = {
  minPrice: number
  maxPrice: number
  currency: 'TRY' | 'GBP' | 'EUR' | 'USD'
}

const list = document.querySelector<HTMLElement>('#craftsmen-list')
const loading = document.querySelector<HTMLElement>('#craftsmen-loading')
const error = document.querySelector<HTMLElement>('#craftsmen-error')
const empty = document.querySelector<HTMLElement>('#craftsmen-empty')

const categorySelect =
  document.querySelector<HTMLSelectElement>('#craftsmen-category')

const clearButton =
  document.querySelector<HTMLButtonElement>('#craftsmen-clear-filters')

if (
  !list ||
  !loading ||
  !error ||
  !empty ||
  !categorySelect ||
  !clearButton
) {
  throw new Error('Craftsmen page elements are missing')
}


function setLoading(value: boolean) {
  loading!.hidden = !value
}


function setError(value: boolean) {
  error!.hidden = !value
}


function setEmpty(value: boolean) {
  empty!.hidden = !value
}


function formatJobs(totalJobs: number | undefined) {
  return `${totalJobs ?? 0} Jobs`
}


function getCategoryName(category?: Craftsman['category']) {
  if (!category) {
    return 'General Services'
  }

  return (
    category.nameEn ||
    category.nameTr ||
    'General Services'
  )
}


function formatPrice(
  amount: number,
  currency: CraftsmanPrice['currency']
) {
  return `${currency} ${amount}`
}


function getPriceRange(craftsman: Craftsman) {
  const prices = craftsman.prices ?? []

  if (prices.length === 0) {
    return 'Price available on request'
  }

  const minPrice = Math.min(
    ...prices.map((price) => price.minPrice)
  )

  const maxPrice = Math.max(
    ...prices.map((price) => price.maxPrice)
  )

  const currency = prices[0].currency

  if (minPrice === maxPrice) {
    return formatPrice(minPrice, currency)
  }

  return `${formatPrice(minPrice, currency)} - ${formatPrice(
    maxPrice,
    currency
  )}`
}


function escapeHtml(value: string) {
  const div = document.createElement('div')

  div.textContent = value

  return div.innerHTML
}


function renderCraftsmen(craftsmen: Craftsman[]) {
  list!.innerHTML = ''

  setEmpty(craftsmen.length === 0)

  craftsmen.forEach((craftsman) => {
    const card = document.createElement('a')

    card.className = 'craftsman-listing-card'

    card.href =
      `/craftsmen/${encodeURIComponent(craftsman.userId)}`

    const businessName =
      craftsman.businessName ||
      'Local Craftsman'

    const categoryName =
      getCategoryName(craftsman.category)

    const bio =
      craftsman.bio ||
      'Experienced professional available for services across North Cyprus.'

    card.innerHTML = `
      <div class="craftsman-listing-content">

        <h2>
          ${escapeHtml(businessName)}
        </h2>

        <ul class="craftsman-listing-meta">

          <li>
            ${escapeHtml(categoryName)}
          </li>

          <li>
            ${escapeHtml(formatJobs(craftsman.totalJobs))}
          </li>

          <li>
  ${escapeHtml(getPriceRange(craftsman))}
</li>

        </ul>

        <p class="craftsman-listing-description">
          ${escapeHtml(bio)}
        </p>

      </div>
    `

    list!.appendChild(card)
  })
}


async function loadCategories() {
  const response = await fetch(
    '/api/catalog/categories',
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      `Categories request failed: ${response.status}`
    )
  }

  const data =
    await response.json() as CategoriesResponse

  categorySelect!.innerHTML = `
    <option value="">
      All categories
    </option>
  `

data.data.forEach((category) => {    const option = document.createElement('option')

    option.value = String(category.id)

    option.textContent =
      category.nameEn ||
      category.nameTr ||
      `Category ${category.id}`

    categorySelect!.appendChild(option)
  })
}


async function loadCraftsmen() {
  try {
    setLoading(true)
    setError(false)
    setEmpty(false)

    const categoryId = categorySelect!.value

    const params = new URLSearchParams()

    if (categoryId) {
      params.set('categoryId', categoryId)
    }

    const queryString = params.toString()

    const url = queryString
      ? `/api/craftsmen?${queryString}`
      : '/api/craftsmen'

    console.log('CATEGORY ID:', categoryId)
    console.log('REQUEST URL:', url)

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Craftsmen request failed: ${response.status}`)
    }

    const data = await response.json() as CraftsmenResponse

    renderCraftsmen(data.craftsmen)
  } catch (requestError) {
    console.error('Failed to load craftsmen:', requestError)

    list!.innerHTML = ''
    setError(true)
  } finally {
    setLoading(false)
  }
}


categorySelect!.addEventListener('change', () => {
  loadCraftsmen()
})


clearButton!.addEventListener('click', () => {
  categorySelect!.value = ''

  loadCraftsmen()
})


async function init() {
  try {
    await loadCategories()
  } catch (requestError) {
    console.error(
      'Failed to load categories:',
      requestError
    )
  }

  await loadCraftsmen()
}


init()