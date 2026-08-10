import Category from '#models/category'
import Craftsman from '#models/craftsman'
import CustomerAddress from '#models/customer_address'
import Region from '#models/region'
import ServicePriceCatalog from '#models/service_price_catalog'
import SubService from '#models/sub_service'
import testUtils from '@adonisjs/core/services/test_utils'
import { createCraftsman, createPriceEntry, seedCatalog } from './helpers.js'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Public catalog endpoint tests — search validation, sub-services listing
 * and empty-collection responses.
 * -------------------------------------------------------------------------
 */

// -------------------------------------------------------------------------
// GET /api/search/services — validation
// -------------------------------------------------------------------------

test.group('Public Catalog — Search Validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('maxPrice lower than minPrice returns 422', async ({ assert, client }) => {
    const response = await client
      .get('/api/search/services?minPrice=200&maxPrice=100')
      .accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('negative minPrice returns 422', async ({ assert, client }) => {
    const response = await client.get('/api/search/services?minPrice=-5').accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('invalid categoryId format returns 422', async ({ assert, client }) => {
    const response = await client.get('/api/search/services?categoryId=abc').accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('decimal IDs are rejected with 422', async ({ assert, client }) => {
    const response = await client.get('/api/search/services?subServiceId=1.5').accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('empty search results are returned as an empty array', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const response = await client.get('/api/search/services?regionId=99999').accept('json')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.equal(response.body().data.length, 0)
  })
})

// -------------------------------------------------------------------------
// GET /api/catalog/categories/:categoryId/sub-services
// -------------------------------------------------------------------------

test.group('Public Catalog — Sub-Services', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('valid category returns its sub-services', async ({ assert, client }) => {
    const { plumbing, leakRepair } = await seedCatalog()

    const response = await client
      .get(`/api/catalog/categories/${plumbing.id}/sub-services`)
      .accept('json')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.equal(response.body().data.length, 1)
    assert.equal(response.body().data[0].id, leakRepair.id)
    assert.equal(response.body().data[0].categoryId, plumbing.id)
  })

  test('non-existent category returns an empty array', async ({ assert, client }) => {
    await seedCatalog()

    const response = await client.get('/api/catalog/categories/99999/sub-services').accept('json')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.equal(response.body().data.length, 0)
  })

  test('invalid category id returns 422', async ({ assert, client }) => {
    const response = await client.get('/api/catalog/categories/abc/sub-services').accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })
})

// -------------------------------------------------------------------------
// Empty collections
// -------------------------------------------------------------------------

test.group('Public Catalog — Empty Collections', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('GET /api/catalog/categories with no records returns 200 and empty array', async ({
    assert,
    client,
  }) => {
    await ServicePriceCatalog.query().delete()
    await Craftsman.query().delete()
    await SubService.query().delete()
    await Category.query().delete()
    const total = await Category.query().count('* as total')
    assert.equal(Number(total[0].$extras.total), 0)

    const response = await client.get('/api/catalog/categories').accept('json')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.equal(response.body().data.length, 0)
  })

  test('GET /api/catalog/regions with no records returns 200 and empty array', async ({
    assert,
    client,
  }) => {
    await ServicePriceCatalog.query().delete()
    await CustomerAddress.query().delete()
    await Region.query().delete()
    const total = await Region.query().count('* as total')
    assert.equal(Number(total[0].$extras.total), 0)

    const response = await client.get('/api/catalog/regions').accept('json')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.equal(response.body().data.length, 0)
  })
})
