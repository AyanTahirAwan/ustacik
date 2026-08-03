import Category from '#models/category'
import { createAdmin, seedCatalog } from './helpers.js'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Admin Category CRUD — index, show, response fields, subServicesCount,
 * 404 handling, update and delete beyond the basic happy path.
 * -------------------------------------------------------------------------
 */

test.group('Categories CRUD — Admin Index', () => {
  test('admin can list categories with subServicesCount', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing, leakRepair } = await seedCatalog()

    const response = await client.get('/api/admin/categories').accept('json').loginAs(admin)

    response.assertStatus(200)
    const categories = response.body().categories
    assert.isArray(categories)
    assert.isAtLeast(categories.length, 2)

    // Verify response structure / fields
    const plumbingCategory = categories.find((c: { id: number }) => c.id === plumbing.id)
    assert.isDefined(plumbingCategory)
    assert.equal(plumbingCategory.nameEn, 'Plumbing')
    assert.equal(plumbingCategory.nameTr, 'Tesisat')

    // Verify subServicesCount preload is present and correct
    assert.equal(plumbingCategory.subServicesCount, 1)
    assert.equal(plumbingCategory.subServicesCount, leakRepair ? 1 : 1)

    // Verify no sensitive fields leak (categories have none, but assert shape)
    assert.isUndefined(plumbingCategory.passwordHash)
    assert.isUndefined(plumbingCategory.password)
  })

  test('categories are ordered by English name ascending', async ({ assert, client }) => {
    const admin = await createAdmin()
    await Category.create({ nameEn: 'Zebra', nameTr: 'ZebraTR' })
    await Category.create({ nameEn: 'Alpha', nameTr: 'AlphaTR' })

    const response = await client.get('/api/admin/categories').accept('json').loginAs(admin)

    response.assertStatus(200)
    const names = response.body().categories.map((c: { nameEn: string }) => c.nameEn)
    assert.deepEqual(names, [...names].sort())
  })
})

test.group('Categories CRUD — Admin Show', () => {
  test('admin can view a single category with sub-services preloaded', async ({
    assert,
    client,
  }) => {
    const admin = await createAdmin()
    const { plumbing, leakRepair } = await seedCatalog()

    const response = await client
      .get(`/api/admin/categories/${plumbing.id}`)
      .accept('json')
      .loginAs(admin)

    response.assertStatus(200)
    const category = response.body().category
    assert.equal(category.id, plumbing.id)
    assert.equal(category.nameEn, 'Plumbing')
    assert.equal(category.nameTr, 'Tesisat')
    // sub-services preloaded
    assert.isArray(category.subServices)
    assert.equal(category.subServices.length, 1)
    assert.equal(category.subServices[0].id, leakRepair.id)
    assert.equal(category.subServices[0].nameEn, 'Leak Repair')
  })

  test('non-existent category returns 404 on show', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client.get('/api/admin/categories/99999').accept('json').loginAs(admin)

    response.assertStatus(404)
  })
})

test.group('Categories CRUD — Admin Update & Delete', () => {
  test('admin can update both localized names', async ({ assert, client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'Old', nameTr: 'Eski' })

    const response = await client
      .patch(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'New', nameTr: 'Yeni' })

    response.assertStatus(200)
    assert.equal(response.body().category.nameEn, 'New')
    assert.equal(response.body().category.nameTr, 'Yeni')
  })

  test('update persists partial changes leaving other field intact', async ({ assert, client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'OnlyEn', nameTr: 'OnlyTr' })

    const response = await client
      .patch(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameTr: 'UpdatedTr' })

    response.assertStatus(200)
    assert.equal(response.body().category.nameEn, 'OnlyEn')
    assert.equal(response.body().category.nameTr, 'UpdatedTr')
  })

  test('duplicate name on update returns 422', async ({ assert, client }) => {
    const admin = await createAdmin()
    const a = await Category.create({ nameEn: 'Alpha', nameTr: 'AlphaTR' })
    await Category.create({ nameEn: 'Beta', nameTr: 'BetaTR' })

    const response = await client
      .patch(`/api/admin/categories/${a.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Beta' })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('non-existent category returns 404 on update', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client
      .patch('/api/admin/categories/99999')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'X' })

    response.assertStatus(404)
  })

  test('non-existent category returns 404 on delete', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client
      .delete('/api/admin/categories/99999')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(404)
  })

  test('deleting a category with sub-services returns 409', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing } = await seedCatalog()

    const response = await client
      .delete(`/api/admin/categories/${plumbing.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(409)
    assert.equal(
      response.body().message,
      'Cannot delete this category because it still has sub-services.'
    )
  })

  test('deleted category returns 404 when accessed again', async ({ client }) => {
    const admin = await createAdmin()
    const category = await Category.create({ nameEn: 'Temp', nameTr: 'Geçici' })

    const del = await client
      .delete(`/api/admin/categories/${category.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
    del.assertStatus(204)

    const show = await client
      .get(`/api/admin/categories/${category.id}`)
      .accept('json')
      .loginAs(admin)
    show.assertStatus(404)
  })
})
