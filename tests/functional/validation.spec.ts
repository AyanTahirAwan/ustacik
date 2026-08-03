import { createAdmin, createCraftsman, seedCatalog } from './helpers.js'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Comprehensive validation coverage: missing fields, invalid types, length
 * constraints, invalid foreign keys, and price validation rules.
 * -------------------------------------------------------------------------
 */

test.group('Validation — Missing Fields', () => {
  test('category missing nameEn returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameTr: 'Türkçe' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'nameEn')
    assert.isDefined(field)
  })

  test('category missing nameTr returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'English' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'nameTr')
    assert.isDefined(field)
  })

  test('sub-service missing categoryId returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'X', nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'categoryId')
    assert.isDefined(field)
  })

  test('sub-service missing nameEn returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing } = await seedCatalog()
    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ categoryId: plumbing.id, nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'nameEn')
    assert.isDefined(field)
  })

  test('price missing regionId returns 422', async ({ assert, client }) => {
    const { plumbing, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({ subServiceId: leakRepair.id, minPrice: 100, maxPrice: 200, currency: 'TRY' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'regionId')
    assert.isDefined(field)
  })

  test('price missing subServiceId returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({ regionId: lefkosa.id, minPrice: 100, maxPrice: 200, currency: 'TRY' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'subServiceId')
    assert.isDefined(field)
  })

  test('price missing currency returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({ subServiceId: leakRepair.id, regionId: lefkosa.id, minPrice: 100, maxPrice: 200 })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'currency')
    assert.isDefined(field)
  })
})

test.group('Validation — Invalid Types', () => {
  test('category number instead of string returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 123, nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('sub-service string instead of number categoryId returns 422', async ({
    assert,
    client,
  }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ categoryId: 'not-a-number', nameEn: 'X', nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'categoryId')
    assert.isDefined(field)
  })

  test('price invalid boolean isActive returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
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
        isActive: 'not-a-boolean',
      })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('price string instead of number minPrice returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: 'expensive',
        maxPrice: 200,
        currency: 'TRY',
      })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })
})

test.group('Validation — Length Constraints', () => {
  test('category name too short returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'A', nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('category name too long returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'a'.repeat(121), nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('region name too short returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'A', nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })
})

test.group('Validation — Invalid Foreign Keys', () => {
  test('sub-service non-existing categoryId returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ categoryId: 99999, nameEn: 'X', nameTr: 'Y' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'categoryId')
    assert.isDefined(field)
  })

  test('price non-existing regionId returns 422', async ({ assert, client }) => {
    const { plumbing, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({
        subServiceId: leakRepair.id,
        regionId: 99999,
        minPrice: 100,
        maxPrice: 200,
        currency: 'TRY',
      })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'regionId')
    assert.isDefined(field)
  })

  test('price non-existing subServiceId returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({
        subServiceId: 99999,
        regionId: lefkosa.id,
        minPrice: 100,
        maxPrice: 200,
        currency: 'TRY',
      })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    const field = response.body().errors.find((e: { field: string }) => e.field === 'subServiceId')
    assert.isDefined(field)
  })
})

test.group('Validation — Price Rules', () => {
  test('negative minPrice returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const response = await client
      .post('/api/craftsman/service-prices')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({
        subServiceId: leakRepair.id,
        regionId: lefkosa.id,
        minPrice: -1,
        maxPrice: 200,
        currency: 'TRY',
      })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('negative maxPrice returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
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
        maxPrice: -1,
        currency: 'TRY',
      })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('maxPrice smaller than minPrice returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
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
    assert.isArray(response.body().errors)
  })

  test('invalid currency returns 422', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
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
    assert.isArray(response.body().errors)
  })
})
