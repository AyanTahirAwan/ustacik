import '../css/app.css'

type RatingSummary = {
quality: number
punctuality: number
pricing: number
communication: number
}

type ReviewResponse = {
average: number | null
count: number
ratings: RatingSummary | null
}

type PriceRange = {
id: number
minPrice: number
maxPrice: number
currency: 'TRY' | 'GBP' | 'EUR' | 'USD'
subService?: {
id: number
nameEn?: string
nameTr?: string
}
region?: {
id: number
nameEn?: string
nameTr?: string
}
}

type PriceResponse = {
servicePriceCatalogs: PriceRange[]
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
phoneNormalised?: string
}

const root = document.querySelector<HTMLElement>('#craftsman-detail')

if (!root) {
throw new Error('Craftsman detail root element not found')
}

const craftsmanId = root.dataset.craftsmanId

if (!craftsmanId) {
throw new Error('Craftsman ID is missing')
}

function setText(selector: string, value: string) {
const element = document.querySelector<HTMLElement>(selector)

if (element) {
element.textContent = value
}
}

function formatPrice(value: number, currency: string) {
return `${value.toLocaleString()} ${currency}`
}

function renderCraftsman(craftsman: Craftsman) {
const completedJobs = craftsman.totalJobs ?? 0

const bio =
craftsman.bio ||
'This craftsman has not added an introduction yet.'

setText(
'#craftsman-detail-completed-jobs',
`${completedJobs} Jobs`
)

setText(
'#craftsman-detail-bio',
bio
)

const whatsapp = document.querySelector<HTMLAnchorElement>(
'#craftsman-detail-whatsapp'
)

if (whatsapp && craftsman.phoneNormalised) {
  const phone = craftsman.phoneNormalised.replace(/\D/g, '')

  whatsapp.href = `https://wa.me/${phone}`
  whatsapp.target = '_blank'
  whatsapp.rel = 'noopener noreferrer'
}

console.log('Loaded craftsman:', {
userId: craftsman.userId,
businessName: craftsman.businessName,
category: craftsman.category?.nameEn,
trustLevel: craftsman.trustLevelLabel,
totalJobs: craftsman.totalJobs,
})
}

function renderRatings(data: ReviewResponse) {
const ratings = data.ratings

if (!ratings) {
setText('#craftsman-detail-quality', 'N/A')
setText('#craftsman-detail-punctuality', 'N/A')
setText('#craftsman-detail-pricing', 'N/A')
setText('#craftsman-detail-safety', 'N/A')
return
}

setText(
'#craftsman-detail-quality',
ratings.quality.toFixed(1)
)

setText(
'#craftsman-detail-punctuality',
ratings.punctuality.toFixed(1)
)

setText(
'#craftsman-detail-pricing',
ratings.pricing.toFixed(1)
)

setText(
'#craftsman-detail-safety',
ratings.communication.toFixed(1)
)
}

function renderPriceRanges(data: PriceResponse) {
  const container = document.querySelector<HTMLElement>(
    '#craftsman-detail-price-ranges'
  )

  if (!container) {
    return
  }

  container.innerHTML = ''

  if (data.servicePriceCatalogs.length === 0) {
    const message = document.createElement('p')
    message.textContent = 'No price ranges have been added yet.'
    container.appendChild(message)
    return
  }

  data.servicePriceCatalogs.forEach((price) => {
    const paragraph = document.createElement('p')

    const serviceName =
      price.subService?.nameEn ||
      price.subService?.nameTr ||
      'Service'

    const priceText =
      price.minPrice === price.maxPrice
        ? formatPrice(price.minPrice, price.currency)
        : `${formatPrice(price.minPrice, price.currency)} - ${formatPrice(
            price.maxPrice,
            price.currency
          )}`

    paragraph.textContent = `${serviceName}: ${priceText}`

    container.appendChild(paragraph)
  })
}

async function loadCraftsman(): Promise<Craftsman> {
const response = await fetch(
`/api/craftsmen/${encodeURIComponent(String(craftsmanId))}`,
{
headers: {
Accept: 'application/json',
},
}
)

if (!response.ok) {
throw new Error(
`Craftsman request failed: ${response.status}`
)
}

const data = await response.json() as any

return data.craftsman as Craftsman
}

async function loadReviews(): Promise<ReviewResponse> {
const response = await fetch(
`/api/craftsmen/${encodeURIComponent(String(craftsmanId))}/reviews`,
{
headers: {
Accept: 'application/json',
},
}
)

if (!response.ok) {
throw new Error(
`Reviews request failed: ${response.status}`
)
}

const reviewsData = await response.json() as any
  return reviewsData as ReviewResponse
}

async function loadPriceRanges(): Promise<PriceResponse> {
const response = await fetch(
`/api/catalog/prices?craftsmanId=${encodeURIComponent(String(craftsmanId))}`,
{
headers: {
Accept: 'application/json',
},
}
)

if (!response.ok) {
throw new Error(
`Price ranges request failed: ${response.status}`
)
}

const pricesData = await response.json() as any
  return pricesData as PriceResponse
}

async function load() {
try {
const [craftsman, reviews, prices] = await Promise.all([
loadCraftsman(),
loadReviews(),
loadPriceRanges(),
])

renderCraftsman(craftsman)
renderRatings(reviews)
renderPriceRanges(prices)

} catch (error) {
console.error(
'Failed to load craftsman detail:',
error
)
}
}

load()
