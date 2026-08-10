import Region from '#models/region'
import testUtils from '@adonisjs/core/services/test_utils'
import { createAdmin, createCraftsman, createCustomer } from './helpers.js'
import { test } from '@japa/runner'

/**
 * Create a category (required for craftsman profile).
 */
async function createCategory() {
  const { default: Category } = await import('#models/category')
  const category = await Category.create({ nameEn: 'Region Plumbing', nameTr: 'Tesisat Bölge' })
  return category
}

// -------------------------------------------------------------------------
// Admin Region CRUD
// -------------------------------------------------------------------------

test.group('Regions CRUD — Admin', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('admin can create a region', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Famagusta', nameTr: 'Gazimağusa' })

    response.assertStatus(201)
    assert.equal(response.body().region.nameEn, 'Famagusta')
    assert.equal(response.body().region.nameTr, 'Gazimağusa')
    assert.exists(response.body().region.id)
    assert.exists(response.body().region.createdAt)
    // Verify no sensitive fields are leaked
    assert.isUndefined(response.body().region.passwordHash)
    assert.isUndefined(response.body().region.password)
  })

  test('admin can list regions', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Region.query().whereIn('name_en', ['Lefkosa', 'Kyrenia']).delete()
    await Region.create({ nameEn: 'Lefkosa', nameTr: 'Lefkoşa' })
    await Region.create({ nameEn: 'Kyrenia', nameTr: 'Girne' })

    const response = await client.get('/api/admin/regions').accept('json').loginAs(admin)

    response.assertStatus(200)
    assert.isArray(response.body().regions)
    const names = response.body().regions.map((r: { nameEn: string }) => r.nameEn)
    assert.include(names, 'Kyrenia')
    assert.include(names, 'Lefkosa')
  })

  test('admin can view a region', async ({ assert, client }) => {
    const admin = await createAdmin()
    const region = await Region.create({ nameEn: 'Iskele', nameTr: 'İskele' })

    const response = await client
      .get(`/api/admin/regions/${region.id}`)
      .accept('json')
      .loginAs(admin)

    response.assertStatus(200)
    assert.equal(response.body().region.id, region.id)
    assert.equal(response.body().region.nameEn, 'Iskele')
    assert.equal(response.body().region.nameTr, 'İskele')
  })

  test('admin can update a region', async ({ assert, client }) => {
    const admin = await createAdmin()
    const region = await Region.create({ nameEn: 'OldName', nameTr: 'EskiAd' })

    const response = await client
      .patch(`/api/admin/regions/${region.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'NewName' })

    response.assertStatus(200)
    assert.equal(response.body().region.nameEn, 'NewName')
    assert.equal(response.body().region.nameTr, 'EskiAd') // unchanged
  })

  test('admin can delete a region when no dependencies exist', async ({ client }) => {
    const admin = await createAdmin()
    const region = await Region.create({ nameEn: 'Orphan Region', nameTr: 'Yetim Bölge' })

    const response = await client
      .delete(`/api/admin/regions/${region.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(204)
  })

  test('deleting a region referenced by price catalog entries returns 409', async ({
    assert,
    client,
  }) => {
    const admin = await createAdmin()
    const category = await createCategory()
    const craftsman = await createCraftsman(category.id)
    const region = await Region.create({ nameEn: 'Busy Region', nameTr: 'Meşgul Bölge' })
    const { default: SubService } = await import('#models/sub_service')
    const subService = await SubService.create({
      categoryId: category.id,
      nameEn: 'Busy SubService',
      nameTr: 'Meşgul Alt Hizmet',
    })
    const { default: ServicePriceCatalog } = await import('#models/service_price_catalog')
    await ServicePriceCatalog.create({
      craftsmanId: craftsman.id,
      subServiceId: subService.id,
      regionId: region.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })

    const response = await client
      .delete(`/api/admin/regions/${region.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(409)
    assert.equal(
      response.body().message,
      'Cannot delete this region because it is referenced by price catalog entries.'
    )
  })
})

// -------------------------------------------------------------------------
// Regions — Authorization
// -------------------------------------------------------------------------

test.group('Regions CRUD — Authorization', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('customer cannot access region admin routes', async ({ assert, client }) => {
    const customer = await createCustomer()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(customer)
      .json({ nameEn: 'Blocked', nameTr: 'Engelli' })

    response.assertStatus(403)
    assert.equal(response.body().message, 'You do not have permission to access this resource')
  })

  test('craftsman cannot access region admin routes', async ({ assert, client }) => {
    const category = await createCategory()
    const craftsman = await createCraftsman(category.id)

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(craftsman)
      .json({ nameEn: 'Blocked', nameTr: 'Engelli' })

    response.assertStatus(403)
    assert.equal(response.body().message, 'You do not have permission to access this resource')
  })

  test('craftsman cannot list regions via admin route', async ({ client }) => {
    const category = await createCategory()
    const craftsman = await createCraftsman(category.id)

    const response = await client.get('/api/admin/regions').accept('json').loginAs(craftsman)

    response.assertStatus(403)
  })

  test('unauthenticated access to admin regions returns 401', async ({ client }) => {
    const response = await client.get('/api/admin/regions').accept('json')

    response.assertStatus(401)
  })
})

// -------------------------------------------------------------------------
// Regions — Validation
// -------------------------------------------------------------------------

test.group('Regions CRUD — Validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('missing nameEn returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameTr: 'Sadece Türkçe' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
    assert.isArray(response.body().errors)
  })

  test('missing nameTr returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Sadece İngilizce' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('duplicate nameEn returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Region.query().whereIn('name_en', ['Lefkosa', 'Başka']).orWhereIn('name_tr', ['Lefkoşa', 'Başka']).delete()
    await Region.create({ nameEn: 'Lefkosa', nameTr: 'Lefkoşa' })

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Lefkosa', nameTr: 'Başka' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('duplicate nameTr returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Region.query().whereIn('name_en', ['Lefkosa', 'Başka']).orWhereIn('name_tr', ['Lefkoşa', 'Başka']).delete()
    await Region.create({ nameEn: 'Lefkosa', nameTr: 'Lefkoşa' })

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Başka', nameTr: 'Lefkoşa' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('number instead of string returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 123, nameTr: 'Sayısal' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('empty string returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: '', nameTr: 'Boş' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('string longer than max length returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const longName = 'a'.repeat(121)

    const response = await client
      .post('/api/admin/regions')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: longName, nameTr: 'Uzun' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('non-existent region returns 404 on show', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client.get('/api/admin/regions/99999').accept('json').loginAs(admin)

    response.assertStatus(404)
  })

  test('non-existent region returns 404 on update', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client
      .patch('/api/admin/regions/99999')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Nope' })

    response.assertStatus(404)
  })

  test('non-existent region returns 404 on delete', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client
      .delete('/api/admin/regions/99999')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(404)
  })

  test('deleted region returns 404 when accessed again', async ({ client }) => {
    const admin = await createAdmin()
    const region = await Region.create({ nameEn: 'Temp', nameTr: 'Geçici' })

    const del = await client
      .delete(`/api/admin/regions/${region.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
    del.assertStatus(204)

    const show = await client.get(`/api/admin/regions/${region.id}`).accept('json').loginAs(admin)

    show.assertStatus(404)
  })
})
