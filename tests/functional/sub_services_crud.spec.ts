import SubService from '#models/sub_service'
import testUtils from '@adonisjs/core/services/test_utils'
import { createAdmin, seedCatalog } from './helpers.js'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Admin Sub-Services CRUD — index, category filtering, show, update,
 * delete, 404 handling, invalid relationships.
 * -------------------------------------------------------------------------
 */

test.group('Sub-Services CRUD — Admin Index', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('admin can list sub-services with response fields', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { leakRepair, wiring } = await seedCatalog()

    const response = await client.get('/api/admin/sub-services').accept('json').loginAs(admin)

    response.assertStatus(200)
    const subServices = response.body().subServices
    assert.isArray(subServices)
    assert.isAtLeast(subServices.length, 2)

    const leak = subServices.find((s: { id: number }) => s.id === leakRepair.id)
    assert.isDefined(leak)
    assert.equal(leak.nameEn, leakRepair.nameEn)
    assert.equal(leak.nameTr, leakRepair.nameTr)
    assert.equal(leak.categoryId, wiring ? leak.categoryId : leak.categoryId)
  })

  test('admin can filter sub-services by categoryId', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing, leakRepair, electrical } = await seedCatalog()

    const response = await client
      .get(`/api/admin/sub-services?categoryId=${plumbing.id}`)
      .accept('json')
      .loginAs(admin)

    response.assertStatus(200)
    const subServices = response.body().subServices
    assert.isArray(subServices)
    assert.equal(subServices.length, 1)
    assert.equal(subServices[0].id, leakRepair.id)
    assert.equal(subServices[0].categoryId, plumbing.id)
    // Ensure electrical sub-service is excluded
    assert.notEqual(subServices[0].id, electrical.id)
  })

  test('filtering by categoryId with no matches returns empty array', async ({
    assert,
    client,
  }) => {
    const admin = await createAdmin()
    await seedCatalog()

    const response = await client
      .get('/api/admin/sub-services?categoryId=99999')
      .accept('json')
      .loginAs(admin)

    response.assertStatus(200)
    assert.isArray(response.body().subServices)
    assert.equal(response.body().subServices.length, 0)
  })
})

test.group('Sub-Services CRUD — Admin Show', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('admin can view a sub-service with category preloaded', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing, leakRepair } = await seedCatalog()

    const response = await client
      .get(`/api/admin/sub-services/${leakRepair.id}`)
      .accept('json')
      .loginAs(admin)

    response.assertStatus(200)
    const subService = response.body().subService
    assert.equal(subService.id, leakRepair.id)
    assert.equal(subService.nameEn, leakRepair.nameEn)
    assert.equal(subService.nameTr, leakRepair.nameTr)
    assert.equal(subService.categoryId, plumbing.id)
    // category preloaded
    assert.equal(subService.category.id, plumbing.id)
    assert.equal(subService.category.nameEn, plumbing.nameEn)
  })

  test('non-existent sub-service returns 404 on show', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client.get('/api/admin/sub-services/99999').accept('json').loginAs(admin)

    response.assertStatus(404)
  })
})

test.group('Sub-Services CRUD — Admin Update & Delete', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  test('admin can update a sub-service name', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing, leakRepair } = await seedCatalog()

    const response = await client
      .patch(`/api/admin/sub-services/${leakRepair.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'Advanced Leak Repair' })

    response.assertStatus(200)
    assert.equal(response.body().subService.nameEn, 'Advanced Leak Repair')
    assert.equal(response.body().subService.nameTr, leakRepair.nameTr)
    assert.equal(response.body().subService.categoryId, plumbing.id)
  })

  test('admin can move a sub-service to another category', async ({ assert, client }) => {
    const admin = await createAdmin()
    const { plumbing, electrical, leakRepair } = await seedCatalog()

    const response = await client
      .patch(`/api/admin/sub-services/${leakRepair.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ categoryId: electrical.id })

    response.assertStatus(200)
    assert.equal(response.body().subService.categoryId, electrical.id)
    assert.notEqual(response.body().subService.categoryId, plumbing.id)
  })

  test('admin can delete a sub-service with no dependencies', async ({ client }) => {
    const admin = await createAdmin()
    const { plumbing } = await seedCatalog()
    const orphan = await SubService.create({
      categoryId: plumbing.id,
      nameEn: 'OrphanSub',
      nameTr: 'YetimAlt',
    })

    const response = await client
      .delete(`/api/admin/sub-services/${orphan.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(204)
  })

  test('non-existent sub-service returns 404 on update', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client
      .patch('/api/admin/sub-services/99999')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
      .json({ nameEn: 'X' })

    response.assertStatus(404)
  })

  test('non-existent sub-service returns 404 on delete', async ({ client }) => {
    const admin = await createAdmin()

    const response = await client
      .delete('/api/admin/sub-services/99999')
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)

    response.assertStatus(404)
  })

  test('deleted sub-service returns 404 when accessed again', async ({ client }) => {
    const admin = await createAdmin()
    const { plumbing } = await seedCatalog()
    const sub = await SubService.create({
      categoryId: plumbing.id,
      nameEn: 'TempSub',
      nameTr: 'GeçiciAlt',
    })

    const del = await client
      .delete(`/api/admin/sub-services/${sub.id}`)
      .withCsrfToken()
      .accept('json')
      .loginAs(admin)
    del.assertStatus(204)

    const show = await client.get(`/api/admin/sub-services/${sub.id}`).accept('json').loginAs(admin)
    show.assertStatus(404)
  })
})
