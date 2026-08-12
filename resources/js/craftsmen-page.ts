import '../css/app.css'

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
  workPhotos?: unknown[]
}

const list = document.querySelector<HTMLElement>('#craftsmen-list')



if (!list) {
  throw new Error('Craftsmen list not found')
}


function renderCraftsmen(craftsmen: Craftsman[]) {

  if (!craftsmen.length) {
    list.innerHTML = `
      <div class="card craftsmen-state">
        <h2>No craftsmen found</h2>
        <p>There are currently no craftsmen available.</p>
      </div>
    `

    return
  }

  for (const craftsman of craftsmen) {
    const card = document.createElement('a')

    card.href = `/craftsmen/${craftsman.userId}`

    card.className = 'craftsman-card'

    const name =
      craftsman.businessName ||
      'Craftsman'

    const category =
      craftsman.category?.nameEn ||
      craftsman.category?.nameTr ||
      'Professional service'

    const bio =
      craftsman.bio ||
      'Professional services available in North Cyprus.'

    const jobs =
      craftsman.totalJobs ?? 0

    const trust =
      craftsman.trustLevelLabel ||
      'registered'

    card.innerHTML = `
      <div class="craftsman-card-top">

        <div class="craftsman-card-avatar">
          ${name.slice(0, 2).toUpperCase()}
        </div>

        <div class="craftsman-card-heading">

          <h2>${name}</h2>

          <span class="craftsman-card-category">
            ${category}
          </span>

        </div>

      </div>

      <p class="craftsman-card-bio">
        ${bio}
      </p>

      <div class="craftsman-card-meta">

        <span>
          ${jobs} completed jobs
        </span>

        <span>
          ${trust}
        </span>

      </div>

      <div class="craftsman-card-action">
        View profile →
      </div>
    `

    list.appendChild(card)
  }
}

async function loadCraftsmen() {
  try {
    const response = await fetch(
      '/api/craftsmen',
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(
        `Craftsmen request failed: ${response.status}`
      )
    }

    const data = await response.json()

    const craftsmen = Array.isArray(data.craftsmen)
      ? data.craftsmen
      : []

    renderCraftsmen(craftsmen)

  } catch (err) {
  console.error('Failed to load craftsmen:', err)
}
}

loadCraftsmen()