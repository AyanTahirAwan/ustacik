import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createAdmin, createCustomer } from './helpers.js'
import User from '#models/user'

test.group('Admin Users — Suspend & Unsuspend', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('admin can suspend and unsuspend a user account', async ({ client, assert }) => {
    const admin = await createAdmin({ email: 'suspendadmin@ustacik.test', phoneNormalised: '+905559990001' })
    const customerUser = await createCustomer({ email: 'suspendcustomer@ustacik.test', phoneNormalised: '+905559990002' })

    assert.equal(customerUser.status, 'active')

    // 1. Suspend user
    const suspendResponse = await client
      .patch(`/api/admin/users/${customerUser.id}/suspend`)
      .withCsrfToken()
      .loginAs(admin)
      .accept('json')

    suspendResponse.assertStatus(200)
    suspendResponse.assertBodyContains({
      user: {
        id: customerUser.id,
        status: 'suspended',
      },
    })

    const suspendedDbUser = await User.findOrFail(customerUser.id)
    assert.equal(suspendedDbUser.status, 'suspended')

    // 2. Unsuspend user
    const unsuspendResponse = await client
      .patch(`/api/admin/users/${customerUser.id}/unsuspend`)
      .withCsrfToken()
      .loginAs(admin)
      .accept('json')

    unsuspendResponse.assertStatus(200)
    unsuspendResponse.assertBodyContains({
      user: {
        id: customerUser.id,
        status: 'active',
      },
    })

    const unsuspendedDbUser = await User.findOrFail(customerUser.id)
    assert.equal(unsuspendedDbUser.status, 'active')
  })
})
