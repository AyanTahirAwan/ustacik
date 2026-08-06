import Category from '#models/category'
import Region from '#models/region'
import SubService from '#models/sub_service'
import { createAdmin, createCraftsman, createPriceEntry, seedCatalog } from './helpers.js'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Edge cases: deleted resources, duplicate resources, empty search results,
 * malformed query parameters, and sensitive-data exposure.
 * -------------------------------------------------------------------------
 */

test.group('Edge Cases — Deleted Resources', () => {
  test('updating a deleted category returns 404', async ({ client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'Temp', nameTr: 'Geçici' })

    const del = await client
      .delete(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
    del.assertStatus(204)

    const upd = await client
      .patch(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Changed' })

    upd.assertStatus(404)
  })

  test('deleting an already deleted category returns 404', async ({ client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'Temp', nameTr: 'Geçici' })

    const del1 = await client
      .delete(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
    del1.assertStatus(204)

    const del2 = await client
      .delete(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    del2.assertStatus(404)
  })

  test('updating a deleted price entry returns 404', async ({ client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const del = await client
      .delete(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
    del.assertStatus(204)

    const upd = await client
      .patch(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({ minPrice: 500 })

    upd.assertStatus(404)
  })

  test('deleting an already deleted price entry returns 404', async ({ client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    const price = await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const del1 = await client
      .delete(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
    del1.assertStatus(204)

    const del2 = await client
      .delete(`/api/craftsman/service-prices/${price.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)

    del2.assertStatus(404)
  })
})

test.group('Edge Cases — Duplicate Resources', () => {
  test('duplicate category nameEn returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Category.create({ nameEn: 'Gardening', nameTr: 'Bahçecilik' })

    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Gardening', nameTr: 'Başka' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('duplicate category nameTr returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Category.create({ nameEn: 'Gardening', nameTr: 'Bahçecilik' })

    const response = await client
      .post('/api/admin/categories')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Başka', nameTr: 'Bahçecilik' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('duplicate sub-service name in same category returns 409', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing } = await seedCatalog()
    await SubService.create({ categoryId: plumbing.id, nameEn: 'Dup', nameTr: 'Tekrar' })

    const response = await client
      .post('/api/admin/sub-services')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ categoryId: plumbing.id, nameEn: 'Dup', nameTr: 'Başka' })

    response.assertStatus(409)
    assert.equal(
      response.body().message,
      'A sub-service with this English name already exists in the selected category.'
    )
  })

  test('duplicate price entry for same craftsman+subService+region returns 409', async ({
    assert,
    client,
  }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

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

    response.assertStatus(409)
    assert.equal(
      response.body().message,
      'You already have a price entry for this sub-service in this region.'
    )
  })
})

test.group('Edge Cases — Empty Search Results', () => {
  test('search with no matching data returns empty array', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    // Search for a region with no prices
    const response = await client.get('/api/search/services?regionId=99999').accept('json')

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.equal(response.body().data.length, 0)
  })

  test('public prices endpoint returns empty for no matches', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const response = await client.get('/api/catalog/prices?regionId=99999').accept('json')

    response.assertStatus(200)
    assert.isArray(response.body().servicePriceCatalogs)
    assert.equal(response.body().servicePriceCatalogs.length, 0)
  })
})

test.group('Edge Cases — Malformed Query Parameters', () => {
  test('malformed categoryId on public prices returns 422', async ({ assert, client }) => {
    const response = await client.get('/api/catalog/prices?categoryId=abc').accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('malformed minPrice on public prices returns 422', async ({ assert, client }) => {
    const response = await client.get('/api/catalog/prices?minPrice=-5').accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('negative non-integer categoryId on public sub-services route returns 422', async ({
    assert,
    client,
  }) => {
    const response = await client.get('/api/catalog/categories/-5/sub-services').accept('json')

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })
})

test.group('Edge Cases — Sensitive Data', () => {
  test('passwordHash is never exposed on user responses', async ({ assert, client }) => {
    const admin = await createAdmin()
    const response = await client.get('/api/admin/categories').accept('json').loginAs(admin)

    response.assertStatus(200)
    const raw = JSON.stringify(response.body())
    assert.isFalse(raw.includes('passwordHash'))
    assert.isFalse(raw.includes('password_hash'))
    assert.isFalse(raw.includes('"password"'))
  })

  test('price catalog responses do not leak passwordHash', async ({ assert, client }) => {
    const { plumbing, lefkosa, leakRepair } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)
    await createPriceEntry({
      craftsmanId: craftsman.id,
      subServiceId: leakRepair.id,
      regionId: lefkosa.id,
    })

    const response = await client.get('/api/catalog/prices').accept('json')

    response.assertStatus(200)
    const raw = JSON.stringify(response.body())
    assert.isFalse(raw.includes('passwordHash'))
    assert.isFalse(raw.includes('password_hash'))
  })

  test('region list does not leak passwordHash', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Region.create({ nameEn: 'Lefkosa', nameTr: 'Lefkoşa' })

    const response = await client.get('/api/admin/regions').accept('json').loginAs(admin)

    response.assertStatus(200)
    const raw = JSON.stringify(response.body())
    assert.isFalse(raw.includes('passwordHash'))
    assert.isFalse(raw.includes('password_hash'))
  })
})

test.group('Edge Cases — Non-existent IDs', () => {
  test('non-existent price returns 404 on show', async ({ client }) => {
    const { plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .get('/api/craftsman/service-prices/99999')
      .accept('json')
      .loginAs(craftsman)

    response.assertStatus(404)
  })

  test('non-existent price returns 404 on toggle', async ({ client }) => {
    const { plumbing } = await seedCatalog()
    const craftsman = await createCraftsman(plumbing.id)

    const response = await client
      .patch('/api/craftsman/service-prices/99999/toggle-active')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)

    response.assertStatus(404)
  })
})
