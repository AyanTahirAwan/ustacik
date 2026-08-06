import {
  createAdmin,
  createCraftsman,
  createCustomer,
  createPriceEntry,
  seedCatalog,
} from './helpers.js'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Authorization Matrix: Role-based access control across admin and craftsman
 * routes. Verifies that each role can only access the endpoints it is
 * permitted to use.
 * -------------------------------------------------------------------------
 */

// -------------------------------------------------------------------------
// Unauthenticated access
// -------------------------------------------------------------------------

test.group('Auth Matrix — Unauthenticated', () => {
  test('unauthenticated GET on admin route returns 401', async ({ client }) => {
    const response = await client.get('/api/admin/categories').accept('json')

    response.assertStatus(401)
  })

  test('unauthenticated POST on admin route returns 401', async ({ client }) => {
    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .json({ nameEn: 'X', nameTr: 'Y' })

    response.assertStatus(401)
  })

  test('unauthenticated GET on craftsman route returns 401', async ({ client }) => {
    const response = await client.get('/api/craftsman/service-prices/1').accept('json')

    response.assertStatus(401)
  })

  test('unauthenticated POST on craftsman route returns 401', async ({ client }) => {
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .json({})

    response.assertStatus(401)
  })
})

// -------------------------------------------------------------------------
// Customer access
// -------------------------------------------------------------------------

test.group('Auth Matrix — Customer', () => {
  test('customer cannot access admin category CRUD', async ({ client }) => {
    const customer = await createCustomer()

    const response = await client.get('/api/admin/categories').accept('json').loginAs(customer)

    response.assertStatus(403)
  })

  test('customer cannot create admin region', async ({ client }) => {
    const customer = await createCustomer()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(customer)
      .json({ nameEn: 'X', nameTr: 'Y' })

    response.assertStatus(403)
  })

  test('customer cannot create admin sub-service', async ({ client }) => {
    const customer = await createCustomer()

    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .accept('json')
      .loginAs(customer)
      .json({ categoryId: 1, nameEn: 'X', nameTr: 'Y' })

    response.assertStatus(403)
  })

  test('customer cannot create craftsman price', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    await createCraftsman(plumbing.id)
    const customer = await createCustomer()

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(customer)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 100,
        maxPrice: 200,
        currency: 'TRY',
      })

    response.assertStatus(403)
  })

  test('customer cannot view another customer-owned craftsman price', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })
    const customer = await createCustomer()

    const response = await client
      .get(`/api/craftsman/service-prices/${price.id}`)
      .accept('json')
      .loginAs(customer)

    response.assertStatus(403)
  })
})

// -------------------------------------------------------------------------
// Craftsman access
// -------------------------------------------------------------------------

test.group('Auth Matrix — Craftsman', () => {
  test('craftsman cannot access admin category CRUD', async ({ client }) => {
    const { plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client.get('/api/admin/categories').accept('json').loginAs(craftsman)

    response.assertStatus(403)
  })

  test('craftsman cannot create admin region', async ({ client }) => {
    const { plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({ nameEn: 'X', nameTr: 'Y' })

    response.assertStatus(403)
  })

  test('craftsman can create own service price', async ({ assert, client }) => {
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
        currency: 'TRY',
      })

    response.assertStatus(201)
    assert.equal(response.body().servicePriceCatalog.craftsmanId, craftsman.id)
  })

  test('craftsman can view own price', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const response = await client
      .get(`/api/craftsman/service-prices/${price.id}`)
      .accept('json')
      .loginAs(craftsman)

    response.assertStatus(200)
    assert.equal(response.body().servicePriceCatalog.id, price.id)
    assert.equal(response.body().servicePriceCatalog.craftsmanId, craftsman.id)
  })

  test('craftsman cannot view another craftsman price', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing, electrical } = await seedCatalog()
    const craftsman1 = await createCraftsman(plumbing.id, {
      email: 'c1@test.com',
      phoneNormalised: '+905551000030',
    })
    const craftsman2 = await createCraftsman(electrical.id, {
      email: 'c2@test.com',
      phoneNormalised: '+905551000031',
    })
    const price = await createPriceEntry({
      craftsmanId: craftsman1.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const response = await client
      .get(`/api/craftsman/service-prices/${price.id}`)
      .accept('json')
      .loginAs(craftsman2)

    response.assertStatus(403)
  })

  test('craftsman cannot toggle another craftsman price', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing, electrical } = await seedCatalog()
    const craftsman1 = await createCraftsman(plumbing.id, {
      email: 'c1-toggle@test.com',
      phoneNormalised: '+905551000032',
    })
    const craftsman2 = await createCraftsman(electrical.id, {
      email: 'c2-toggle@test.com',
      phoneNormalised: '+905551000033',
    })
    const price = await createPriceEntry({
      craftsmanId: craftsman1.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const response = await client
      .patch(`/api/craftsman/service-prices/${price.id}/toggle-active`)
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman2)

    response.assertStatus(403)
  })
})

// -------------------------------------------------------------------------
// Admin access
// -------------------------------------------------------------------------

test.group('Auth Matrix — Admin', () => {
  test('admin can access admin category CRUD', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client.get('/api/admin/categories').accept('json').loginAs(admin)

    response.assertStatus(200)
    assert.isArray(response.body().categories)
  })

  test('admin can create admin region', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'AdminRegion', nameTr: 'AdminBölge' })

    response.assertStatus(201)
    assert.equal(response.body().region.nameEn, 'AdminRegion')
  })

  test('admin can create craftsman price', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const admin = await createAdmin()
    // Admin needs a craftsman profile to create a price entry
    const { default: Craftsman } = await import('#models/craftsman')
    await Craftsman.create({
      userId: admin.id,
      businessName: 'Admin Craftsman Co.',
      categoryId: plumbing.id,
      trustLevel: 0,
      verbalConsent: false,
      totalJobs: 0,
    })

    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 100,
        maxPrice: 200,
        currency: 'TRY',
      })

    response.assertStatus(201)
    assert.equal(response.body().servicePriceCatalog.craftsmanId, admin.id)
  })

  test('admin can view any craftsman price', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })
    const admin = await createAdmin()

    const response = await client
      .get(`/api/craftsman/service-prices/${price.id}`)
      .accept('json')
      .loginAs(admin)

    response.assertStatus(200)
    assert.equal(response.body().servicePriceCatalog.id, price.id)
  })

  test('admin can edit any craftsman price', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })
    const admin = await createAdmin()

    const response = await client
      .patch(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ minPrice: 150 })

    response.assertStatus(200)
    assert.equal(response.body().servicePriceCatalog.minPrice, 150)
  })

  test('admin cannot lower minPrice above existing maxPrice (422)', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
      minPrice: 100,
      maxPrice: 200,
    })
    const admin = await createAdmin()

    const response = await client
      .patch(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ minPrice: 500 })

    response.assertStatus(422)
    assert.exists(response.body().errors)
    assert.equal(response.body().errors[0].field, 'maxPrice')
  })

  test('admin can delete any craftsman price', async ({ client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })
    const admin = await createAdmin()

    const response = await client
      .delete(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(204)
  })

  test('admin can toggle any craftsman price', async ({ assert, client }) => {
    const { lefkosa, leakRepair, plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })
    const admin = await createAdmin()

    const response = await client
      .patch(`/api/craftsman/service-prices/${price.id}/toggle-active`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(200)
    assert.isFalse(response.body().servicePriceCatalog.isActive)
  })
})
