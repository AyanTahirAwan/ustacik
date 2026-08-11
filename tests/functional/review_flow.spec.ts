import JobRequest from '#models/job_request'
import Review from '#models/review'
import {
  createCraftsmanFixture,
  createCustomerFixture,
  createRegionFixture,
} from '#tests/helpers/user_fixtures'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const ratings = {
  punctuality: 5,
  workmanship: 5,
  priceHonesty: 4,
  communication: 5,
  comment: 'Professional service and good communication.',
}

test.group('Final review flow', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('completes the lifecycle and reflects the review everywhere', async ({ client, assert }) => {
    const { user: customer } = await createCustomerFixture('review-flow-customer')
    const { user: craftsmanUser, craftsman } = await createCraftsmanFixture('review-flow-craftsman')
    const region = await createRegionFixture('review-flow-region')

    const created = await client
      .post('/api/jobs')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({
        requestId: `review-flow-${Date.now()}`,
        craftsmanId: craftsman.userId,
        regionId: region.id,
        description: 'Install and test a new electrical fixture.',
      })
    created.assertStatus(201)
    const jobId = created.body().job.id

    for (const [action, status] of [
      ['accept', 'accepted'],
      ['start', 'in_progress'],
      ['complete', 'completed'],
    ]) {
      const transition = await client
        .patch(`/api/jobs/${jobId}/${action}`)
        .loginAs(craftsmanUser)
        .withCsrfToken()
        .accept('json')
      transition.assertStatus(200)
      assert.equal(transition.body().job.status, status)
    }

    const beforeReview = await client.get('/api/jobs').loginAs(customer).accept('json')
    const completedJob = beforeReview.body().jobs.find((job: { id: number }) => job.id === jobId)
    assert.equal(completedJob.status, 'completed')
    assert.isFalse(completedJob.reviewed)

    const reviewPage = await client.get(`/customer/requests/${jobId}/review`).loginAs(customer)
    reviewPage.assertStatus(200)
    reviewPage.assertTextIncludes('Leave a Review')

    const submitted = await client
      .post('/api/reviews')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ jobId, ...ratings })
    submitted.assertStatus(201)
    submitted.assertBodyContains({ review: ratings })

    const duplicate = await client
      .post('/api/reviews')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ jobId, ...ratings })
    duplicate.assertStatus(409)

    const afterReview = await client.get('/api/jobs').loginAs(customer).accept('json')
    const reviewedJob = afterReview.body().jobs.find((job: { id: number }) => job.id === jobId)
    assert.equal(reviewedJob.status, 'completed')
    assert.isTrue(reviewedJob.reviewed)

    const reviewedPage = await client
      .get(`/customer/requests/${jobId}/review`)
      .loginAs(customer)
      .redirects(0)
    reviewedPage.assertStatus(302)
    reviewedPage.assertHeader('location', '/customer/requests?reviewed=1')

    const publicReviews = await client.get(`/api/craftsmen/${craftsman.userId}/reviews`)
    publicReviews.assertStatus(200)
    publicReviews.assertBodyContains({ reviews: [ratings], count: 1, average: null })
    const publicReview = publicReviews.body().reviews[0]
    assert.onlyProperties(publicReview, [
      'id',
      'punctuality',
      'workmanship',
      'priceHonesty',
      'communication',
      'average',
      'comment',
      'craftsmanReply',
      'createdAt',
    ])

    const dashboard = await client
      .get('/api/craftsman/dashboard')
      .loginAs(craftsmanUser)
      .accept('json')
    dashboard.assertStatus(200)
    assert.lengthOf(dashboard.body().reviews, 1)
    assert.equal(dashboard.body().reviews[0].comment, ratings.comment)
  })

  test('enforces review-page eligibility on the server', async ({ client }) => {
    const { user: owner } = await createCustomerFixture('review-page-owner')
    const { user: otherCustomer } = await createCustomerFixture('review-page-other')
    const { user: craftsmanUser, craftsman } = await createCraftsmanFixture('review-page-craftsman')
    const region = await createRegionFixture('review-page-region')
    const pending = await JobRequest.create({
      requestId: `review-page-${Date.now()}`,
      customerId: owner.id,
      craftsmanId: craftsman.userId,
      categoryId: craftsman.categoryId,
      regionId: region.id,
      description: 'Pending review eligibility job.',
      status: 'pending',
    })

    const guest = await client.get(`/customer/requests/${pending.id}/review`).redirects(0)
    const other = await client
      .get(`/customer/requests/${pending.id}/review`)
      .loginAs(otherCustomer)
      .accept('json')
    const craftsmanResponse = await client
      .get(`/customer/requests/${pending.id}/review`)
      .loginAs(craftsmanUser)
      .accept('json')
    const nonCompleted = await client
      .get(`/customer/requests/${pending.id}/review`)
      .loginAs(owner)
      .redirects(0)

    guest.assertStatus(302)
    guest.assertHeader('location', '/login')
    other.assertStatus(404)
    craftsmanResponse.assertStatus(403)
    nonCompleted.assertStatus(302)
    nonCompleted.assertHeader('location', '/customer/requests?reviewError=not-completed')
  })

  test('rejects every non-completed status and another customer at submission', async ({
    client,
  }) => {
    const { user: owner } = await createCustomerFixture('review-submit-owner')
    const { user: otherCustomer } = await createCustomerFixture('review-submit-other')
    const { craftsman } = await createCraftsmanFixture('review-submit-craftsman')
    const region = await createRegionFixture('review-submit-region')

    for (const status of ['pending', 'accepted', 'in_progress'] as const) {
      const job = await JobRequest.create({
        requestId: `review-${status}-${Date.now()}`,
        customerId: owner.id,
        craftsmanId: craftsman.userId,
        categoryId: craftsman.categoryId,
        regionId: region.id,
        description: `A job currently ${status}.`,
        status,
      })
      const response = await client
        .post('/api/reviews')
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json({ jobId: job.id, ...ratings })
      response.assertStatus(422)
    }

    const completed = await JobRequest.create({
      requestId: `review-other-${Date.now()}`,
      customerId: owner.id,
      craftsmanId: craftsman.userId,
      categoryId: craftsman.categoryId,
      regionId: region.id,
      description: 'A completed job belonging to another customer.',
      status: 'completed',
    })
    const otherResponse = await client
      .post('/api/reviews')
      .loginAs(otherCustomer)
      .withCsrfToken()
      .accept('json')
      .json({ jobId: completed.id, ...ratings })
    otherResponse.assertStatus(403)
  })

  test('handles an optional comment and validates all rating fields', async ({
    client,
    assert,
  }) => {
    const { user: customer } = await createCustomerFixture('review-validation-customer')
    const { craftsman } = await createCraftsmanFixture('review-validation-craftsman')
    const region = await createRegionFixture('review-validation-region')
    const job = await JobRequest.create({
      requestId: `review-validation-${Date.now()}`,
      customerId: customer.id,
      craftsmanId: craftsman.userId,
      categoryId: craftsman.categoryId,
      regionId: region.id,
      description: 'Completed validation job.',
      status: 'completed',
    })

    const missingRating = await client
      .post('/api/reviews')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ jobId: job.id, punctuality: 5, workmanship: 5, priceHonesty: 4 })
    const invalidRating = await client
      .post('/api/reviews')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ jobId: job.id, punctuality: 6, workmanship: 5, priceHonesty: 4, communication: 5 })

    missingRating.assertStatus(422)
    invalidRating.assertStatus(422)

    const withoutComment = await client
      .post('/api/reviews')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({
        jobId: job.id,
        punctuality: 5,
        workmanship: 5,
        priceHonesty: 4,
        communication: 5,
      })
    withoutComment.assertStatus(201)
    const saved = await Review.findByOrFail('job_id', job.id)
    assert.isNull(saved.comment)
  })
})
