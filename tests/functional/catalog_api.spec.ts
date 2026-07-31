import Category from '#models/category'
import Region from '#models/region'
import ServicePriceCatalog from '#models/service_price_catalog'
import SubService from '#models/sub_service'
import User from '#models/user'
import { test } from '@japa/runner'

async function createCatalogData() {
  const craftsman = await User.create({
    fullName: 'Test Craftsman',
    email: 'craftsman@example.com',
    password: 'password123',
  })
  const plumbing = await Category.create({ name: 'Plumbing', slug: 'plumbing' })
  const electrical = await Category.create({ name: 'Electrical', slug: 'electrical' })
  const leakRepair = await SubService.create({
    categoryId: plumbing.id,
    name: 'Leak Repair',
    slug: 'leak-repair',
  })
  const pipeInstallation = await SubService.create({
    categoryId: plumbing.id,
    name: 'Pipe Installation',
    slug: 'pipe-installation',
  })
  const wiring = await SubService.create({
    categoryId: electrical.id,
    name: 'Wiring',
    slug: 'wiring',
  })
  const lefkosa = await Region.create({ name: 'Lefkosa', slug: 'lefkosa' })
  const girne = await Region.create({ name: 'Girne', slug: 'girne' })

  await ServicePriceCatalog.createMany([
    {
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      price: 100,
      currency: 'TRY',
    },
    {
      craftsmanId: craftsman.id,
      subServiceId: pipeInstallation.id,
      regionId: lefkosa.id,
      price: 250,
      currency: 'TRY',
    },
    {
      craftsmanId: craftsman.id,
      subServiceId: wiring.id,
      regionId: girne.id,
      price: 450,
      currency: 'TRY',
    },
  ])

  return { electrical, girne, lefkosa, leakRepair, pipeInstallation, plumbing, wiring }
}

test.group('Catalog API', () => {
  test('lists categories', async ({ assert, client }) => {
    const { electrical, plumbing } = await createCatalogData()

    const response = await client.get('/api/catalog/categories')

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((category: { id: number }) => category.id).sort(),
      [plumbing.id, electrical.id].sort()
    )
  })

  test('lists regions', async ({ assert, client }) => {
    const { girne, lefkosa } = await createCatalogData()

    const response = await client.get('/api/catalog/regions')

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((region: { id: number }) => region.id).sort(),
      [lefkosa.id, girne.id].sort()
    )
  })

  test('lists only sub-services for the requested category', async ({ assert, client }) => {
    const { leakRepair, pipeInstallation, plumbing } = await createCatalogData()

    const response = await client.get(`/api/catalog/categories/${plumbing.id}/sub-services`)

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((subService: { id: number }) => subService.id).sort(),
      [leakRepair.id, pipeInstallation.id].sort()
    )
  })

  test('searches all service prices without filters', async ({ assert, client }) => {
    await createCatalogData()

    const response = await client.get('/api/search/services')

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((catalog: { price: number }) => catalog.price),
      [100, 250, 450]
    )
  })

  test('filters search results by category', async ({ assert, client }) => {
    const { plumbing } = await createCatalogData()

    const response = await client.get('/api/search/services').qs({ categoryId: plumbing.id })

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((catalog: { price: number }) => catalog.price),
      [100, 250]
    )
  })

  test('filters search results by sub-service', async ({ assert, client }) => {
    const { pipeInstallation } = await createCatalogData()

    const response = await client
      .get('/api/search/services')
      .qs({ subServiceId: pipeInstallation.id })

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((catalog: { price: number }) => catalog.price),
      [250]
    )
  })

  test('filters search results by region', async ({ assert, client }) => {
    const { lefkosa } = await createCatalogData()

    const response = await client.get('/api/search/services').qs({ regionId: lefkosa.id })

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((catalog: { price: number }) => catalog.price),
      [100, 250]
    )
  })

  test('filters search results by minimum price', async ({ assert, client }) => {
    await createCatalogData()

    const response = await client.get('/api/search/services').qs({ minPrice: 200 })

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((catalog: { price: number }) => catalog.price),
      [250, 450]
    )
  })

  test('filters search results by maximum price', async ({ assert, client }) => {
    await createCatalogData()

    const response = await client.get('/api/search/services').qs({ maxPrice: 250 })

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((catalog: { price: number }) => catalog.price),
      [100, 250]
    )
  })

  test('filters search results by combined filters', async ({ assert, client }) => {
    const { lefkosa, plumbing } = await createCatalogData()

    const response = await client.get('/api/search/services').qs({
      categoryId: plumbing.id,
      regionId: lefkosa.id,
      minPrice: 200,
      maxPrice: 300,
    })

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((catalog: { price: number }) => catalog.price),
      [250]
    )
  })

  test('rejects negative prices', async ({ client }) => {
    const response = await client.get('/api/search/services').qs({ minPrice: -1 })

    response.assertStatus(422)
  })

  test('rejects a maximum price below the minimum price', async ({ client }) => {
    const response = await client
      .get('/api/search/services')
      .qs({ minPrice: 300, maxPrice: 200 })

    response.assertStatus(422)
  })
})
