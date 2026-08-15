import JobRequest from '#models/job_request'
import UserNotification from '#models/user_notification'
import {
  createCraftsmanFixture,
  createCustomerFixture,
  createRegionFixture,
} from '#tests/helpers/user_fixtures'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

const reviewPayload = {
  punctuality: 5,
  workmanship: 5,
  priceHonesty: 4,
  communication: 5,
  comment: 'Professional service and good communication.',
}

test.group('In-app workflow notifications', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates one notification for every successful lifecycle event', async ({
    client,
    assert,
  }) => {
    const { user: customer } = await createCustomerFixture('notification-customer')
    const { user: craftsmanUser, craftsman } =
      await createCraftsmanFixture('notification-craftsman')
    const region = await createRegionFixture('notification-region')
    const requestPayload = {
      requestId: `notification-flow-${Date.now()}`,
      craftsmanId: craftsman.userId,
      regionId: region.id,
      description: 'Install a new kitchen light safely.',
    }

    const created = await client
      .post('/api/jobs')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json(requestPayload)
    created.assertStatus(201)
    const jobId = created.body().job.id

    let craftsmanNotifications = await client
      .get('/api/notifications')
      .loginAs(craftsmanUser)
      .accept('json')
    craftsmanNotifications.assertBodyContains({
      unreadCount: 1,
      notifications: [{ message: 'You have a new service request.', isRead: false }],
    })
    assert.onlyProperties(craftsmanNotifications.body().notifications[0], [
      'id',
      'type',
      'title',
      'message',
      'messageBody',
      'isRead',
      'createdAt',
      'sentAt',
      'target',
    ])

    for (const [action, message, unreadCount] of [
      ['accept', 'Your service request was accepted.', 1],
      ['start', 'Work on your service request has started.', 2],
      ['complete', 'Your service request has been completed.', 3],
    ] as const) {
      const transition = await client
        .patch(`/api/jobs/${jobId}/${action}`)
        .loginAs(craftsmanUser)
        .withCsrfToken()
        .accept('json')
      transition.assertStatus(200)

      const customerNotifications = await client
        .get('/api/notifications')
        .loginAs(customer)
        .accept('json')
      assert.equal(customerNotifications.body().unreadCount, unreadCount)
      assert.include(
        customerNotifications
          .body()
          .notifications.map((notification: { message: string }) => notification.message),
        message
      )
    }

    const review = await client
      .post('/api/reviews')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ jobId, ...reviewPayload })
    review.assertStatus(201)

    craftsmanNotifications = await client
      .get('/api/notifications')
      .loginAs(craftsmanUser)
      .accept('json')
    craftsmanNotifications.assertBodyContains({
      unreadCount: 2,
      notifications: [{ message: 'You received a new customer review.' }],
    })

    const duplicateRequest = await client
      .post('/api/jobs')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json(requestPayload)
    duplicateRequest.assertStatus(201)

    const invalidRepeat = await client
      .patch(`/api/jobs/${jobId}/complete`)
      .loginAs(craftsmanUser)
      .withCsrfToken()
      .accept('json')
    invalidRepeat.assertStatus(400)

    const duplicateReview = await client
      .post('/api/reviews')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ jobId, ...reviewPayload })
    duplicateReview.assertStatus(409)

    assert.equal(
      await UserNotification.query()
        .where('related_job_id', jobId)
        .count('* as total')
        .first()
        .then((row) => Number(row?.$extras.total ?? 0)),
      5
    )
  })

  test('creates a decline notification only after a successful decline', async ({ client }) => {
    const { user: customer } = await createCustomerFixture('decline-customer')
    const { user: craftsmanUser, craftsman } = await createCraftsmanFixture('decline-craftsman')
    const region = await createRegionFixture('decline-region')
    const job = await JobRequest.create({
      requestId: `decline-${Date.now()}`,
      customerId: customer.id,
      craftsmanId: craftsman.userId,
      categoryId: craftsman.categoryId,
      regionId: region.id,
      description: 'A request that will be declined.',
      status: 'pending',
    })

    const declined = await client
      .patch(`/api/jobs/${job.id}/decline`)
      .loginAs(craftsmanUser)
      .withCsrfToken()
      .accept('json')
    declined.assertStatus(200)

    const notifications = await client.get('/api/notifications').loginAs(customer).accept('json')
    notifications.assertBodyContains({
      unreadCount: 1,
      notifications: [{ message: 'Your service request was declined.' }],
    })
  })

  test('keeps notifications owner-scoped and persists explicit read actions', async ({
    client,
    assert,
  }) => {
    const { user: owner } = await createCustomerFixture('notification-owner')
    const { user: other } = await createCustomerFixture('notification-other')
    const first = await UserNotification.create({
      userId: owner.id,
      type: 'system',
      title: 'First notification',
      messageBody: 'Owner-only message.',
      relatedJobId: null,
      isRead: false,
      sentAt: DateTime.now(),
    })
    await UserNotification.create({
      userId: owner.id,
      type: 'system',
      title: 'Second notification',
      messageBody: 'Another owner-only message.',
      relatedJobId: null,
      isRead: false,
      sentAt: DateTime.now(),
    })

    const otherList = await client.get('/api/notifications').loginAs(other).accept('json')
    otherList.assertBody({ notifications: [], unreadCount: 0 })

    const forbiddenRead = await client
      .patch(`/api/notifications/${first.id}/read`)
      .loginAs(other)
      .withCsrfToken()
      .accept('json')
    forbiddenRead.assertStatus(404)

    const marked = await client
      .patch(`/api/notifications/${first.id}/read`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    marked.assertStatus(200)

    let ownerList = await client.get('/api/notifications').loginAs(owner).accept('json')
    assert.equal(ownerList.body().unreadCount, 1)

    const markedAll = await client
      .patch('/api/notifications/read-all')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    markedAll.assertStatus(200)
    markedAll.assertBody({ unreadCount: 0 })

    ownerList = await client.get('/api/notifications').loginAs(owner).accept('json')
    assert.equal(ownerList.body().unreadCount, 0)
    assert.isTrue(
      ownerList
        .body()
        .notifications.every((notification: { isRead: boolean }) => notification.isRead)
    )

    const guestPage = await client.get('/notifications').redirects(0)
    guestPage.assertStatus(302)
    guestPage.assertHeader('location', '/login')
  })
})
