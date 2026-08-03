import Category from '#models/category'
import Craftsman from '#models/craftsman'
import Customer from '#models/customer'
import Region from '#models/region'
import ServicePriceCatalog from '#models/service_price_catalog'
import SubService from '#models/sub_service'
import User from '#models/user'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Fixture helpers
 * -------------------------------------------------------------------------
 * Create the baseline data needed for most tests. Uses model factories
 * (plain model creates) to honour all relationships, hooks, and defaults.
 */

/**
 * Create an admin user with a full Admin profile row.
 */
async function createAdmin() {
  const user = await User.create({
    email: 'admin@ustacik.test',
    phoneNormalised: '+905551000001',
    passwordHash: 'Password123!',
    role: 'admin',
    status: 'active',
  })

  return user
}

/**
 * Create a craftsman user together with the required Craftsman profile row.
 * A category must exist before calling this helper.
 */
async function createCraftsman(
  categoryId: number,
  overrides: Partial<{ email: string; phoneNormalised: string }> = {}
) {
  const user = await User.create({
    email: overrides.email ?? 'craftsman@ustacik.test',
    phoneNormalised: overrides.phoneNormalised ?? '+905551000002',
    passwordHash: 'Password123!',
    role: 'craftsman',
    status: 'active',
  })

  await Craftsman.create({
    userId: user.id,
    businessName: 'Test Craftsman Co.',
    categoryId,
    trustLevel: 0,
    verbalConsent: false,
    totalJobs: 0,
  })

  return user
}

/**
 * Create a customer user together with the required Customer profile row.
 */
async function createCustomer() {
  const user = await User.create({
    email: 'customer@ustacik.test',
    phoneNormalised: '+905551000003',
    passwordHash: 'Password123!',
    role: 'customer',
    status: 'active',
  })

  await Customer.create({
    userId: user.id,
    fullName: 'Test Customer',
    language: 'en',
    smsOptIn: true,
  })

  return user
}

/**
 * Seed the catalog lookup tables (categories, sub-services, regions).
 */
async function seedCatalog() {
  const plumbing = await Category.create({ nameEn: 'Plumbing', nameTr: 'Tesisat' })
  const electrical = await Category.create({ nameEn: 'Electrical', nameTr: 'Elektrik' })

  const leakRepair = await SubService.create({
    categoryId: plumbing.id,
    nameEn: 'Leak Repair',
    nameTr: 'Kaçak Tamiri',
  })
  const wiring = await SubService.create({
    categoryId: electrical.id,
    nameEn: 'Wiring',
    nameTr: 'Kablolama',
  })

  const lefkosa = await Region.create({ nameEn: 'Lefkosa', nameTr: 'Lefkoşa' })
  const girne = await Region.create({ nameEn: 'Kyrenia', nameTr: 'Girne' })

  return { electrical, girne, lefkosa, leakRepair, plumbing, wiring }
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

test.group('Catalog CRUD — Public Access', () => {
  test('GET /api/catalog/categories returns 200', async ({ assert, client }) => {
    await seedCatalog()

    const response = await client.get('/api/catalog/categories')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.isAtLeast(response.body().data.length, 2)
  })

  test('GET /api/catalog/regions returns 200', async ({ assert, client }) => {
    await seedCatalog()

    const response = await client.get('/api/catalog/regions')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.isAtLeast(response.body().data.length, 2)
  })

  test('GET /api/catalog/prices only returns active price entries', async ({ assert, client }) => {
    const { lefkosa, leakRepair, wiring, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    // Create one active and one inactive price entry
    // Use different subServiceId (leakRepair vs wiring) to avoid violating
    // the composite unique constraint on (craftsman_id, sub_service_id, region_id)
    await ServicePriceCatalog.create({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })
    await ServicePriceCatalog.create({
      craftsmanId: craftsman.id,
      subServiceId: wiring.id,
      regionId: lefkosa.id,
      minPrice: 300,
      maxPrice: 400,
      currency: 'TRY',
      isActive: false,
    })

    const response = await client.get('/api/catalog/prices')

    response.assertStatus(200)
    const prices = response.body().servicePriceCatalogs
    assert.isArray(prices)
    // Should only return the active entry
    assert.equal(prices.length, 1)
    assert.equal(prices[0].minPrice, 100)
  })

  test('GET /api/search/services works correctly', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    await ServicePriceCatalog.create({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 150,
      maxPrice: 250,
      currency: 'TRY',
      isActive: true,
    })

    const response = await client.get('/api/search/services')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    // Should return results (even if search doesn't filter by isActive.....we report this)
  })
})

// -------------------------------------------------------------------------
// Admin Authorization — Category CRUD
// -------------------------------------------------------------------------

test.group('Catalog CRUD — Admin Authorization', () => {
  test('admin can create a category', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .loginAs(admin)
      .json({ nameEn: 'Gardening', nameTr: 'Bahçecilik' })

    response.assertStatus(201)
    assert.equal(response.body().category.nameEn, 'Gardening')
  })

  test('admin can update a category', async ({ assert, client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'OldName', nameTr: 'EskiAd' })

    const response = await client
      .patch(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .loginAs(admin)
      .json({ nameEn: 'UpdatedName' })

    response.assertStatus(200)
    assert.equal(response.body().category.nameEn, 'UpdatedName')
  })

  test('admin can delete a category when no dependencies exist', async ({ client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'Orphan', nameTr: 'Yetim' })

    const response = await client
      .delete(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .loginAs(admin)

    response.assertStatus(204)
  })

  test('craftsman cannot access admin category routes', async ({ client }) => {
    const { plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .loginAs(craftsman)
      .json({ nameEn: 'Gardening', nameTr: 'Bahçecilik' })

    response.assertStatus(403)
  })

  test('customer cannot access admin category routes', async ({ client }) => {
    const customer = await createCustomer()

    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .loginAs(customer)
      .json({ nameEn: 'Gardening', nameTr: 'Bahçecilik' })

    response.assertStatus(403)
  })
})

// -------------------------------------------------------------------------
// Craftsman — Service Price Catalog
// -------------------------------------------------------------------------

test.group('Catalog CRUD — Craftsman Price Catalog', () => {
  test('craftsman can create a service price entry', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .loginAs(craftsman)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 100,
        maxPrice: 200,
        currency: 'TRY',
      })

    response.assertStatus(201)
    const record = response.body().servicePriceCatalog
    assert.equal(record.craftsmanId, craftsman.id)
    assert.equal(record.minPrice, 100)
    assert.equal(record.maxPrice, 200)
    assert.equal(record.currency, 'TRY')
    assert.isTrue(record.isActive)
  })

  test('craftsman cannot provide craftsmanId manually (craftsmanId is derived from auth)', async ({
    assert,
    client,
  }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .loginAs(craftsman)
      .json({
        craftsmanId: 99999, // Should be ignored
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 100,
        maxPrice: 200,
        currency: 'TRY',
      })

    // The validator doesn't accept craftsmanId — it should be ignored or rejected
    // If the validator rejects it, we get 422; if it's silently ignored, we get 201
    // Either behavior is acceptable as long as the actual craftsmanId is from auth
    if (response.status() === 422) {
      // Validator rejected the unknown field — acceptable
      assert.isTrue(true)
    } else {
      response.assertStatus(201)
      assert.equal(response.body().servicePriceCatalog.craftsmanId, craftsman.id)
    }
  })

  test('craftsman can update own price entry', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const price = await ServicePriceCatalog.create({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })

    const response = await client
      .patch(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .loginAs(craftsman)
      .json({ minPrice: 150, maxPrice: 300 })

    response.assertStatus(200)
    assert.equal(response.body().servicePriceCatalog.minPrice, 150)
    assert.equal(response.body().servicePriceCatalog.maxPrice, 300)
  })

  test('craftsman can delete own price entry', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const price = await ServicePriceCatalog.create({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })

    const response = await client
      .delete(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .loginAs(craftsman)

    response.assertStatus(204)
  })

  test('craftsman can toggle active status', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const price = await ServicePriceCatalog.create({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })

    // Toggle to inactive
    const response1 = await client
      .patch(`/api/craftsman/service-prices/${price.id}/toggle-active`)
      .withCsrfToken()
      .loginAs(craftsman)

    response1.assertStatus(200)
    assert.isFalse(response1.body().servicePriceCatalog.isActive)

    // Toggle back to active
    const response2 = await client
      .patch(`/api/craftsman/service-prices/${price.id}/toggle-active`)
      .withCsrfToken()
      .loginAs(craftsman)

    response2.assertStatus(200)
    assert.isTrue(response2.body().servicePriceCatalog.isActive)
  })

  test('another craftsman cannot edit another craftsman price entry', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing, electrical } = await seedCatalog()
    const craftsman1 = await createCraftsman(plumbing.id, {
      email: 'craftsman1@test.com',
      phoneNormalised: '+905551000010',
    })
    const craftsman2 = await createCraftsman(electrical.id, {
      email: 'craftsman2@test.com',
      phoneNormalised: '+905551000011',
    })

    const price = await ServicePriceCatalog.create({
      craftsmanId: craftsman1.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })

    const response = await client
      .patch(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .loginAs(craftsman2)
      .json({ minPrice: 999 })

    response.assertStatus(403)
  })

  test('another craftsman cannot delete another craftsman price entry', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing, electrical } = await seedCatalog()
    const craftsman1 = await createCraftsman(plumbing.id, {
      email: 'craftsman1@test.com',
      phoneNormalised: '+905551000012',
    })
    const craftsman2 = await createCraftsman(electrical.id, {
      email: 'craftsman2@test.com',
      phoneNormalised: '+905551000013',
    })

    const price = await ServicePriceCatalog.create({
      craftsmanId: craftsman1.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })

    const response = await client
      .delete(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .loginAs(craftsman2)

    response.assertStatus(403)
  })

  test('customer cannot create service price catalog', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    await createCraftsman(plumbing.id) // seed data
    const customer = await createCustomer()

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .loginAs(customer)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 100,
        maxPrice: 200,
        currency: 'TRY',
      })

    // Craftsman-service-prices group requires role(['craftsman', 'admin']),
    // so customer should get 403 from the role middleware
    response.assertStatus(403)
  })
})

// -------------------------------------------------------------------------
// Validation Tests
// -------------------------------------------------------------------------

test.group('Catalog CRUD — Validation', () => {
  test('category: missing nameEn returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameTr: 'Sadece Türkçe' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('category: duplicate nameEn returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Category.create({ nameEn: 'Gardening', nameTr: 'Bahçecilik' })

    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Gardening', nameTr: 'Bahçe' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('sub-service: invalid categoryId returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ categoryId: 99999, nameEn: 'Test', nameTr: 'Test' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('sub-service: duplicate name in same category returns 409', async ({ client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'Test', nameTr: 'Test' })
    await SubService.create({ categoryId: category.id, nameEn: 'Duplicate', nameTr: 'Tekrar' })

    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .loginAs(admin)
      .json({ categoryId: category.id, nameEn: 'Duplicate', nameTr: 'Tekrar' })

    // The DB enforces a composite unique constraint — should be 409
    response.assertStatus(409)
  })

  test('price catalog: negative minPrice returns 422', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: -50,
        maxPrice: 100,
        currency: 'TRY',
      })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('price catalog: maxPrice smaller than minPrice returns 422', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 300,
        maxPrice: 100,
        currency: 'TRY',
      })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('price catalog: invalid currency returns 422', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 100,
        maxPrice: 200,
        currency: 'XYZ',
      })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })
})
