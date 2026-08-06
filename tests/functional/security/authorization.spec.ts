// Verifies role authorization, resource ownership, and suspended-account enforcement.
import Admin from '#models/admin'
import CustomerFavorite from '#models/customer_favorite'
import User from '#models/user'
import WorkPhoto from '#models/work_photo'
import { createCraftsmanFixture, createCustomerFixture } from '#tests/helpers/user_fixtures'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

// Reuse stable application-defined bodies and response shapes in access checks.
const roleDenialBody = {
  message: 'You do not have permission to access this resource',
}

const userProperties = [
  'id',
  'email',
  'phoneNormalised',
  'role',
  'status',
  'createdAt',
  'updatedAt',
  'customer',
  'craftsman',
  'admin',
]

const customerProperties = [
  'userId',
  'fullName',
  'defaultRegionId',
  'language',
  'smsOptIn',
  'createdAt',
]

let adminFixtureSequence = 0

// Create unique real admin records for authenticated management requests.
async function createAdminFixture(label: string) {
  adminFixtureSequence += 1
  const sequence = adminFixtureSequence.toString().padStart(7, '0')
  const user = await User.create({
    email: `${label}-${sequence}@example.test`,
    phoneNormalised: `+90557${sequence}`,
    passwordHash: 'TestPassword123!',
    role: 'admin',
    status: 'active',
  })
  const admin = await Admin.create({
    userId: user.id,
    fullName: `Admin ${label} ${sequence}`,
    department: 'Operations',
    clearanceLvl: 2,
  })

  return { user, admin }
}

test.group('Authorization and ownership', (group) => {
  // Roll back every test so authorization scenarios remain independent.
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  // Customer routes enforce both role access and profile ownership.
  test('keeps customer profile reads and updates scoped to the authenticated customer', async ({
    client,
    assert,
    db,
  }) => {
    const { user: userA, customer: customerA } = await createCustomerFixture('profile-owner')
    const { user: userB, customer: customerB } = await createCustomerFixture('profile-other')
    const customerBOriginalName = customerB.fullName

    const showResponse = await client.get('/customer/profile').loginAs(userA).accept('json')

    showResponse.assertStatus(200)
    assert.onlyProperties(showResponse.body(), ['customer'])
    assert.equal(showResponse.body().customer.userId, userA.id)
    assert.equal(showResponse.body().customer.fullName, customerA.fullName)
    assert.equal(showResponse.body().customer.user.id, userA.id)
    assert.notEqual(showResponse.body().customer.userId, userB.id)
    assert.notEqual(showResponse.body().customer.fullName, customerBOriginalName)

    const updateResponse = await client
      .patch('/customer/profile')
      .loginAs(userA)
      .withCsrfToken()
      .accept('json')
      .json({
        fullName: 'Updated Profile Owner',
        language: 'tr',
        smsOptIn: false,
      })

    updateResponse.assertStatus(200)
    updateResponse.assertBodyContains({
      customer: {
        userId: userA.id,
        fullName: 'Updated Profile Owner',
        language: 'tr',
        smsOptIn: false,
      },
    })

    await customerA.refresh()
    await customerB.refresh()

    assert.equal(customerA.fullName, 'Updated Profile Owner')
    assert.equal(customerA.language, 'tr')
    assert.isFalse(Boolean(customerA.smsOptIn))
    assert.equal(customerB.fullName, customerBOriginalName)
    assert.equal(customerB.language, 'en')
    assert.isTrue(Boolean(customerB.smsOptIn))
    await db.assertHas('customers', {
      user_id: userA.id,
      full_name: 'Updated Profile Owner',
      language: 'tr',
      sms_opt_in: false,
    })
    await db.assertHas('customers', {
      user_id: userB.id,
      full_name: customerBOriginalName,
      language: 'en',
      sms_opt_in: true,
    })
  })

  test('rejects a craftsman from the customer profile', async ({ client, db }) => {
    const { user } = await createCraftsmanFixture('customer-profile-wrong-role')

    const response = await client.get('/customer/profile').loginAs(user).accept('json')

    response.assertStatus(403)
    response.assertBody(roleDenialBody)
    await db.assertHas('users', { id: user.id, role: 'craftsman', status: 'active' })
  })

  // Favorites cover CRUD, duplicate prevention, and cross-customer ownership.
  test('creates, lists, and deletes a customer favorite', async ({ client, assert, db }) => {
    const { user: customerUser } = await createCustomerFixture('favorite-lifecycle-customer')
    const { craftsman } = await createCraftsmanFixture('favorite-lifecycle-craftsman')

    const createResponse = await client
      .post('/customer/favorites')
      .loginAs(customerUser)
      .withCsrfToken()
      .accept('json')
      .json({ craftsmanId: craftsman.userId })

    createResponse.assertStatus(201)
    assert.onlyProperties(createResponse.body(), ['favorite'])
    createResponse.assertBodyContains({
      favorite: {
        customerId: customerUser.id,
        craftsmanId: craftsman.userId,
      },
    })
    const favoriteId = createResponse.body().favorite.id
    await db.assertHas('customer_favorites', {
      id: favoriteId,
      customer_id: customerUser.id,
      craftsman_id: craftsman.userId,
    })

    const listResponse = await client
      .get('/customer/favorites')
      .loginAs(customerUser)
      .accept('json')

    listResponse.assertStatus(200)
    assert.onlyProperties(listResponse.body(), ['favorites'])
    assert.lengthOf(listResponse.body().favorites, 1)
    assert.equal(listResponse.body().favorites[0].id, favoriteId)
    assert.equal(listResponse.body().favorites[0].customerId, customerUser.id)
    assert.equal(listResponse.body().favorites[0].craftsmanId, craftsman.userId)

    const deleteResponse = await client
      .delete(`/customer/favorites/${craftsman.userId}`)
      .loginAs(customerUser)
      .withCsrfToken()
      .accept('json')

    deleteResponse.assertNoContent()
    await db.assertMissing('customer_favorites', { id: favoriteId })
  })

  test('rejects a duplicate favorite and preserves one relation', async ({ client, db }) => {
    const { user: customerUser } = await createCustomerFixture('duplicate-favorite-customer')
    const { craftsman } = await createCraftsmanFixture('duplicate-favorite-craftsman')

    const firstResponse = await client
      .post('/customer/favorites')
      .loginAs(customerUser)
      .withCsrfToken()
      .accept('json')
      .json({ craftsmanId: craftsman.userId })

    firstResponse.assertStatus(201)

    const duplicateResponse = await client
      .post('/customer/favorites')
      .loginAs(customerUser)
      .withCsrfToken()
      .accept('json')
      .json({ craftsmanId: craftsman.userId })

    duplicateResponse.assertStatus(409)
    duplicateResponse.assertBody({
      message: 'Craftsman is already in favorites',
    })
    await db.assertCount('customer_favorites', 1)
    await db.assertHas('customer_favorites', {
      customer_id: customerUser.id,
      craftsman_id: craftsman.userId,
    })
  })

  test('conceals and preserves another customer favorite', async ({ client, db }) => {
    const { customer: customerA } = await createCustomerFixture('favorite-owner')
    const { user: userB } = await createCustomerFixture('favorite-other-customer')
    const { craftsman } = await createCraftsmanFixture('favorite-owned-craftsman')
    const favorite = await CustomerFavorite.create({
      customerId: customerA.userId,
      craftsmanId: craftsman.userId,
    })

    const response = await client
      .delete(`/customer/favorites/${craftsman.userId}`)
      .loginAs(userB)
      .withCsrfToken()
      .accept('json')

    response.assertStatus(404)
    await db.assertHas('customer_favorites', {
      id: favorite.id,
      customer_id: customerA.userId,
      craftsman_id: craftsman.userId,
    })
  })

  // Craftsman mutations remain scoped to the authenticated profile and portfolio.
  test('updates only the authenticated craftsman profile', async ({ client, assert, db }) => {
    const { user: userA, craftsman: craftsmanA } =
      await createCraftsmanFixture('craftsman-profile-owner')
    const { craftsman: craftsmanB } = await createCraftsmanFixture('craftsman-profile-other')
    const craftsmanBOriginalName = craftsmanB.businessName

    const response = await client
      .patch('/craftsman/profile')
      .loginAs(userA)
      .withCsrfToken()
      .accept('json')
      .json({
        businessName: 'Updated Owner Workshop',
        bio: 'Updated owner biography',
        bizRegNo: 'OWNER-REG-001',
        verbalConsent: true,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      craftsman: {
        userId: userA.id,
        businessName: 'Updated Owner Workshop',
        bio: 'Updated owner biography',
        bizRegNo: 'OWNER-REG-001',
        verbalConsent: true,
      },
    })

    await craftsmanA.refresh()
    await craftsmanB.refresh()

    assert.equal(craftsmanA.businessName, 'Updated Owner Workshop')
    assert.equal(craftsmanA.bio, 'Updated owner biography')
    assert.equal(craftsmanA.bizRegNo, 'OWNER-REG-001')
    assert.isTrue(Boolean(craftsmanA.verbalConsent))
    assert.equal(craftsmanB.businessName, craftsmanBOriginalName)
    assert.isNull(craftsmanB.bio)
    assert.isNull(craftsmanB.bizRegNo)
    assert.isFalse(Boolean(craftsmanB.verbalConsent))
    await db.assertHas('craftsmen', {
      user_id: craftsmanA.userId,
      business_name: 'Updated Owner Workshop',
      bio: 'Updated owner biography',
      biz_reg_no: 'OWNER-REG-001',
      verbal_consent: true,
    })
    await db.assertHas('craftsmen', {
      user_id: craftsmanB.userId,
      business_name: craftsmanBOriginalName,
      bio: null,
      biz_reg_no: null,
      verbal_consent: false,
    })
  })

  test('conceals and preserves another craftsman work photo', async ({ client, db }) => {
    const { craftsman: craftsmanA } = await createCraftsmanFixture('work-photo-owner')
    const { user: userB } = await createCraftsmanFixture('work-photo-other-craftsman')
    const workPhoto = await WorkPhoto.create({
      craftsmanId: craftsmanA.userId,
      imageUrl: 'https://example.test/work-photo-owner.jpg',
    })

    const response = await client
      .delete(`/craftsman/work-photos/${workPhoto.id}`)
      .loginAs(userB)
      .withCsrfToken()
      .accept('json')

    response.assertStatus(404)
    await db.assertHas('work_photos', {
      id: workPhoto.id,
      craftsman_id: craftsmanA.userId,
      image_url: 'https://example.test/work-photo-owner.jpg',
    })
  })

  // Admin routes enforce role access and expose list, detail, and suspension flows.
  test('rejects customers and craftsmen from admin routes', async ({ client, db }) => {
    const { user: customerUser } = await createCustomerFixture('admin-route-customer')
    const { user: craftsmanUser } = await createCraftsmanFixture('admin-route-craftsman')

    const customerResponse = await client.get('/admin/users').loginAs(customerUser).accept('json')

    customerResponse.assertStatus(403)
    customerResponse.assertBody(roleDenialBody)

    const craftsmanResponse = await client.get('/admin/users').loginAs(craftsmanUser).accept('json')

    craftsmanResponse.assertStatus(403)
    craftsmanResponse.assertBody(roleDenialBody)
    await db.assertHas('users', { id: customerUser.id, role: 'customer', status: 'active' })
    await db.assertHas('users', { id: craftsmanUser.id, role: 'craftsman', status: 'active' })
  })

  test('allows an admin to list and inspect the correct user', async ({ client, assert }) => {
    const { user: adminUser } = await createAdminFixture('list-show')
    const { user: targetUser, customer: targetCustomer } =
      await createCustomerFixture('admin-target-customer')

    const listResponse = await client.get('/admin/users').loginAs(adminUser).accept('json')

    listResponse.assertStatus(200)
    assert.onlyProperties(listResponse.body(), ['users'])
    const listedTarget = listResponse
      .body()
      .users.find((listedUser: { id: number }) => listedUser.id === targetUser.id)
    assert.exists(listedTarget)
    assert.onlyProperties(listedTarget, userProperties)
    assert.onlyProperties(listedTarget.customer, customerProperties)
    assert.equal(listedTarget.email, targetUser.email)
    assert.equal(listedTarget.role, 'customer')
    assert.equal(listedTarget.status, 'active')
    assert.equal(listedTarget.customer.userId, targetUser.id)
    assert.equal(listedTarget.customer.fullName, targetCustomer.fullName)
    assert.isNull(listedTarget.craftsman)
    assert.isNull(listedTarget.admin)

    const showResponse = await client
      .get(`/admin/users/${targetUser.id}`)
      .loginAs(adminUser)
      .accept('json')

    showResponse.assertStatus(200)
    assert.onlyProperties(showResponse.body(), ['user'])
    assert.onlyProperties(showResponse.body().user, userProperties)
    assert.onlyProperties(showResponse.body().user.customer, customerProperties)
    showResponse.assertBodyContains({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: 'customer',
        status: 'active',
        customer: {
          userId: targetUser.id,
          fullName: targetCustomer.fullName,
        },
        craftsman: null,
        admin: null,
      },
    })
  })

  test('allows an admin to suspend a user', async ({ client, assert, db }) => {
    const { user: adminUser } = await createAdminFixture('suspend-user')
    const { user: targetUser } = await createCustomerFixture('suspend-target')

    const response = await client
      .patch(`/admin/users/${targetUser.id}/suspend`)
      .loginAs(adminUser)
      .withCsrfToken()
      .accept('json')

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        status: 'suspended',
      },
    })

    await targetUser.refresh()
    await adminUser.refresh()
    assert.equal(targetUser.status, 'suspended')
    assert.equal(adminUser.status, 'active')
    await db.assertHas('users', { id: targetUser.id, status: 'suspended' })
    await db.assertHas('users', { id: adminUser.id, status: 'active' })
  })

  // Shared authentication middleware enforces account status and user scoping.
  test('rejects an authenticated suspended customer session', async ({ client }) => {
    const { user } = await createCustomerFixture('suspended-session')
    user.status = 'suspended'
    await user.save()

    const response = await client.get('/customer/profile').loginAs(user).accept('json')

    response.assertStatus(403)
    response.assertBody({
      message: 'Your account has been suspended',
    })
  })

  test('returns an empty notification collection for an active customer', async ({ client }) => {
    const { user } = await createCustomerFixture('empty-notifications')

    const response = await client.get('/notifications').loginAs(user).accept('json')

    response.assertStatus(200)
    response.assertBody({ notifications: [] })
  })
})
