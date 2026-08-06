// Verifies customer address access control, CRUD, validation, and ownership rules.
import {
  createCraftsmanFixture,
  createCustomerAddressFixture,
  createCustomerFixture,
  createRegionFixture,
} from '#tests/helpers/user_fixtures'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

// Stable property lists keep response-shape assertions focused and readable.
const addressProperties = [
  'id',
  'customerId',
  'regionId',
  'label',
  'street',
  'landmark',
  'isDefault',
  'createdAt',
  'region',
]

const regionProperties = ['id', 'nameEn', 'nameTr', 'createdAt']

test.group('Customer addresses', (group) => {
  // Roll back every test to isolate address and user records.
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  // Authentication and role middleware protect customer address routes.
  test('rejects unauthenticated access', async ({ client }) => {
    const response = await client.get('/customer/addresses').accept('json')

    response.assertStatus(401)
    response.assertBody({
      errors: [{ message: 'Unauthorized access' }],
    })
  })

  test('rejects a craftsman from customer routes', async ({ client }) => {
    const { user } = await createCraftsmanFixture('wrong-role')

    const response = await client.get('/customer/addresses').loginAs(user).accept('json')

    response.assertStatus(403)
    response.assertBody({
      message: 'You do not have permission to access this resource',
    })
  })

  // Customer-scoped CRUD verifies both API responses and persisted database state.
  test('returns an empty collection for a customer without addresses', async ({ client }) => {
    const { user } = await createCustomerFixture('empty-addresses')

    const response = await client.get('/customer/addresses').loginAs(user).accept('json')

    response.assertStatus(200)
    response.assertBody({ addresses: [] })
  })

  test('creates, lists, updates, and deletes an address', async ({ client, assert, db }) => {
    const { user } = await createCustomerFixture('crud-customer')
    const region = await createRegionFixture('crud-region')

    const createResponse = await client
      .post('/customer/addresses')
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({
        regionId: region.id,
        label: 'Home',
        street: 'Example Street 10',
        landmark: null,
        isDefault: true,
      })

    createResponse.assertStatus(201)
    assert.onlyProperties(createResponse.body(), ['address'])

    const createdAddress = createResponse.body().address
    assert.onlyProperties(createdAddress, addressProperties)
    assert.onlyProperties(createdAddress.region, regionProperties)
    assert.isNumber(createdAddress.id)
    assert.equal(createdAddress.customerId, user.id)
    assert.equal(createdAddress.regionId, region.id)
    assert.equal(createdAddress.label, 'Home')
    assert.equal(createdAddress.street, 'Example Street 10')
    assert.isNull(createdAddress.landmark)
    assert.isTrue(createdAddress.isDefault)
    assert.equal(createdAddress.region.id, region.id)
    assert.equal(createdAddress.region.nameEn, region.nameEn)
    assert.equal(createdAddress.region.nameTr, region.nameTr)

    await db.assertHas('customer_addresses', {
      id: createdAddress.id,
      customer_id: user.id,
      region_id: region.id,
      label: 'Home',
      street: 'Example Street 10',
      landmark: null,
      is_default: true,
    })

    const listResponse = await client.get('/customer/addresses').loginAs(user).accept('json')

    listResponse.assertStatus(200)
    assert.onlyProperties(listResponse.body(), ['addresses'])
    assert.lengthOf(listResponse.body().addresses, 1)
    const listedAddress = listResponse.body().addresses[0]
    assert.equal(listedAddress.id, createdAddress.id)
    assert.equal(listedAddress.customerId, user.id)
    assert.equal(listedAddress.regionId, region.id)
    assert.equal(listedAddress.label, 'Home')
    assert.equal(listedAddress.street, 'Example Street 10')
    assert.isNull(listedAddress.landmark)
    assert.isTrue(Boolean(listedAddress.isDefault))
    assert.equal(listedAddress.region.id, region.id)
    assert.equal(listedAddress.region.nameEn, region.nameEn)
    assert.equal(listedAddress.region.nameTr, region.nameTr)
    assert.exists(listedAddress.createdAt)
    assert.isString(listedAddress.createdAt)

    const updateResponse = await client
      .patch(`/customer/addresses/${createdAddress.id}`)
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({
        label: 'Primary Home',
        street: 'Updated Street 20',
        landmark: 'Blue door',
      })

    updateResponse.assertStatus(200)
    assert.onlyProperties(updateResponse.body(), ['address'])
    assert.onlyProperties(updateResponse.body().address, addressProperties)
    updateResponse.assertBodyContains({
      address: {
        id: createdAddress.id,
        customerId: user.id,
        regionId: region.id,
        label: 'Primary Home',
        street: 'Updated Street 20',
        landmark: 'Blue door',
      },
    })
    assert.isTrue(Boolean(updateResponse.body().address.isDefault))

    await db.assertHas('customer_addresses', {
      id: createdAddress.id,
      customer_id: user.id,
      region_id: region.id,
      label: 'Primary Home',
      street: 'Updated Street 20',
      landmark: 'Blue door',
      is_default: true,
    })

    const deleteResponse = await client
      .delete(`/customer/addresses/${createdAddress.id}`)
      .loginAs(user)
      .withCsrfToken()
      .accept('json')

    deleteResponse.assertNoContent()
    assert.equal(deleteResponse.text(), '')
    await db.assertMissing('customer_addresses', { id: createdAddress.id })
  })

  // Validation failures must not create address rows.
  test('rejects missing required fields without creating an address', async ({
    client,
    assert,
    db,
  }) => {
    const { user } = await createCustomerFixture('missing-fields')

    const response = await client
      .post('/customer/addresses')
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({})

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    assert.sameMembers(
      response.body().errors.map((error: { field: string }) => error.field),
      ['regionId', 'label', 'street']
    )
    await db.assertCount('customer_addresses', 0)
  })

  test('rejects a non-existent region without creating an address', async ({
    client,
    assert,
    db,
  }) => {
    const { user } = await createCustomerFixture('invalid-region')
    const removedRegion = await createRegionFixture('removed-region')
    const invalidRegionId = removedRegion.id
    await removedRegion.delete()

    assert.isAbove(invalidRegionId, 0)

    const response = await client
      .post('/customer/addresses')
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({
        regionId: invalidRegionId,
        label: 'Home',
        street: 'Example Street 10',
      })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    assert.include(
      response.body().errors.map((error: { field: string }) => error.field),
      'regionId'
    )
    await db.assertCount('customer_addresses', 0)
  })

  // Ownership checks conceal inaccessible or missing records with 404 responses.
  test('conceals and preserves another customer address', async ({ client, db }) => {
    const { customer: customerA } = await createCustomerFixture('owner-customer')
    const { user: userB } = await createCustomerFixture('other-customer')
    const region = await createRegionFixture('ownership-region')
    const address = await createCustomerAddressFixture({
      customer: customerA,
      region,
      label: 'Owner Home',
      street: 'Owner Street 10',
      landmark: 'Owner landmark',
      isDefault: true,
    })

    const updateResponse = await client
      .patch(`/customer/addresses/${address.id}`)
      .loginAs(userB)
      .withCsrfToken()
      .accept('json')
      .json({ label: 'Stolen Address' })

    updateResponse.assertStatus(404)

    const deleteResponse = await client
      .delete(`/customer/addresses/${address.id}`)
      .loginAs(userB)
      .withCsrfToken()
      .accept('json')

    deleteResponse.assertStatus(404)
    await db.assertHas('customer_addresses', {
      id: address.id,
      customer_id: customerA.userId,
      region_id: region.id,
      label: 'Owner Home',
      street: 'Owner Street 10',
      landmark: 'Owner landmark',
      is_default: true,
    })
  })

  test('returns not found when updating or deleting an unknown address', async ({ client, db }) => {
    const { user, customer } = await createCustomerFixture('unknown-address')
    const region = await createRegionFixture('unknown-address-region')
    const removedAddress = await createCustomerAddressFixture({ customer, region })
    const unknownAddressId = removedAddress.id
    await removedAddress.delete()

    const updateResponse = await client
      .patch(`/customer/addresses/${unknownAddressId}`)
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({ label: 'Still Missing' })

    updateResponse.assertStatus(404)

    const deleteResponse = await client
      .delete(`/customer/addresses/${unknownAddressId}`)
      .loginAs(user)
      .withCsrfToken()
      .accept('json')

    deleteResponse.assertStatus(404)
    await db.assertMissing('customer_addresses', { id: unknownAddressId })
  })

  // CSRF protection rejects state-changing requests before persistence.
  test('rejects a create request without a CSRF token', async ({ client, db }) => {
    const { user } = await createCustomerFixture('missing-csrf')
    const region = await createRegionFixture('csrf-region')

    const response = await client
      .post('/customer/addresses')
      .loginAs(user)
      .accept('json')
      .redirects(0)
      .json({
        regionId: region.id,
        label: 'Home',
        street: 'Example Street 10',
      })

    response.assertStatus(302)
    await db.assertCount('customer_addresses', 0)
  })

  // Default-address changes must remain scoped to the authenticated customer.
  test('setting a new default only changes the authenticated customer addresses', async ({
    client,
    assert,
    db,
  }) => {
    const { user: userA, customer: customerA } = await createCustomerFixture('default-owner')
    const { customer: customerB } = await createCustomerFixture('default-other')
    const region = await createRegionFixture('default-region')
    const firstAddress = await createCustomerAddressFixture({
      customer: customerA,
      region,
      label: 'First Home',
      isDefault: true,
    })
    const secondAddress = await createCustomerAddressFixture({
      customer: customerA,
      region,
      label: 'Second Home',
      isDefault: false,
    })
    const otherCustomerAddress = await createCustomerAddressFixture({
      customer: customerB,
      region,
      label: 'Other Home',
      isDefault: true,
    })

    const response = await client
      .patch(`/customer/addresses/${secondAddress.id}`)
      .loginAs(userA)
      .withCsrfToken()
      .accept('json')
      .json({ isDefault: true })

    response.assertStatus(200)
    response.assertBodyContains({
      address: {
        id: secondAddress.id,
        customerId: customerA.userId,
        isDefault: true,
      },
    })

    await firstAddress.refresh()
    await secondAddress.refresh()
    await otherCustomerAddress.refresh()

    assert.isFalse(Boolean(firstAddress.isDefault))
    assert.isTrue(Boolean(secondAddress.isDefault))
    assert.isTrue(Boolean(otherCustomerAddress.isDefault))
    await db.assertHas('customer_addresses', {
      id: firstAddress.id,
      customer_id: customerA.userId,
      is_default: false,
    })
    await db.assertHas('customer_addresses', {
      id: secondAddress.id,
      customer_id: customerA.userId,
      is_default: true,
    })
    await db.assertHas('customer_addresses', {
      id: otherCustomerAddress.id,
      customer_id: customerB.userId,
      is_default: true,
    })
  })
})
