import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'
import Category from '#models/category'
import Region from '#models/region'

async function createTestData() {
  const adminUser = await User.create({
    email: 'admin@example.com',
    phoneNormalised: '+905550000001',
    passwordHash: 'secret',
    role: 'admin',
    status: 'active',
  })
  await Admin.create({ userId: adminUser.id, fullName: 'Admin User', clearanceLvl: 3 })

  const customerUser = await User.create({
    email: 'customer@example.com',
    phoneNormalised: '+905550000002',
    passwordHash: 'secret',
    role: 'customer',
    status: 'active',
  })
  await Customer.create({ userId: customerUser.id, fullName: 'John Doe', language: 'en', smsOptIn: true })

  const category = await Category.create({ nameEn: 'Plumbing', nameTr: 'Tesisatçı' })
  const region = await Region.create({ nameEn: 'Istanbul', nameTr: 'İstanbul' })

  const craftsmanUser = await User.create({
    email: 'craftsman@example.com',
    phoneNormalised: '+905550000003',
    passwordHash: 'secret',
    role: 'craftsman',
    status: 'active',
  })
  const craftsman = await Craftsman.create({
    userId: craftsmanUser.id,
    businessName: 'Jane Smith Plumbing',
    categoryId: category.id,
    trustLevel: 1,
    verbalConsent: true,
    totalJobs: 0,
  })

  return { adminUser, customerUser, craftsmanUser, craftsman, category, region }
}

test.group('Integration Workflow', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Job → Accept → Start → Complete → Review → Reply workflow', async ({ client, assert }) => {
    const { customerUser, craftsmanUser, craftsman, region } = await createTestData()

    const jobResponse = await client.post('/api/jobs').loginAs(customerUser).json({
      requestId: 'REQ-WORKFLOW-1',
      craftsmanId: craftsman.userId,
      regionId: region.id,
      description: 'Leaking sink in the kitchen',
    })
    jobResponse.assertStatus(201)
    assert.equal(jobResponse.body().job.status, 'pending')
    const jobId = jobResponse.body().job.id

    const acceptResponse = await client.patch(`/api/jobs/${jobId}/accept`).loginAs(craftsmanUser)
    acceptResponse.assertStatus(200)
    assert.equal(acceptResponse.body().job.status, 'accepted')

    const startResponse = await client.patch(`/api/jobs/${jobId}/start`).loginAs(craftsmanUser)
    startResponse.assertStatus(200)
    assert.equal(startResponse.body().job.status, 'in_progress')

    const completeResponse = await client.patch(`/api/jobs/${jobId}/complete`).loginAs(craftsmanUser)
    completeResponse.assertStatus(200)
    assert.equal(completeResponse.body().job.status, 'completed')

    const reviewResponse = await client.post('/api/reviews').loginAs(customerUser).json({
      jobId: jobId,
      punctuality: 5,
      workmanship: 5,
      priceHonesty: 5,
      communication: 5,
      comment: 'Excellent work!',
    })
    reviewResponse.assertStatus(201)
    assert.equal(reviewResponse.body().review.punctuality, 5)
    const reviewId = reviewResponse.body().review.id

    const replyResponse = await client.patch(`/api/reviews/${reviewId}/reply`).loginAs(craftsmanUser).json({
      message: 'Thank you!',
    })
    replyResponse.assertStatus(200)
    assert.equal(replyResponse.body().review.craftsmanReply, 'Thank you!')

    const finalJobResponse = await client.get(`/api/jobs/${jobId}`).loginAs(customerUser)
    finalJobResponse.assertStatus(200)
    assert.equal(finalJobResponse.body().job.status, 'completed')
  })

  test('Job → Accept → Start → Dispute → Admin Resolution workflow', async ({ client, assert }) => {
    const { adminUser, customerUser, craftsmanUser, craftsman, region } = await createTestData()

    const jobResponse = await client.post('/api/jobs').loginAs(customerUser).json({
      requestId: 'REQ-WORKFLOW-2',
      craftsmanId: craftsman.userId,
      regionId: region.id,
      description: 'Pipe is broken and leaking',
    })
    jobResponse.assertStatus(201)
    const jobId = jobResponse.body().job.id

    await client.patch(`/api/jobs/${jobId}/accept`).loginAs(craftsmanUser)
    await client.patch(`/api/jobs/${jobId}/start`).loginAs(craftsmanUser)

    const disputeResponse = await client.post(`/api/jobs/${jobId}/disputes`).loginAs(customerUser).json({
      reasonCategory: 'workmanship',
      customerNotes: 'Work not finished properly',
    })
    disputeResponse.assertStatus(201)
    assert.equal(disputeResponse.body().dispute.status, 'OPEN')
    const disputeId = disputeResponse.body().dispute.id

    const disputedJobResponse = await client.get(`/api/jobs/${jobId}`).loginAs(customerUser)
    assert.equal(disputedJobResponse.body().job.status, 'disputed')

    const resolveResponse = await client.patch(`/api/admin/disputes/${disputeId}`).loginAs(adminUser).json({
      status: 'CLOSED',
      adminResolutionNotes: 'Refunded customer',
      finalJobStatus: 'cancelled',
    })
    resolveResponse.assertStatus(200)
    assert.equal(resolveResponse.body().dispute.status, 'CLOSED')
    assert.equal(resolveResponse.body().dispute.adminResolutionNotes, 'Refunded customer')

    const finalJobResponse = await client.get(`/api/jobs/${jobId}`).loginAs(customerUser)
    assert.equal(finalJobResponse.body().job.status, 'cancelled')
  })

  test('Admin verifies craftsman → trust level updates', async ({ client, assert }) => {
    const { adminUser, craftsman } = await createTestData()

    const v1Response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(adminUser)
      .json({ levelGranted: 'registered', notes: 'Checked ID' })
    v1Response.assertStatus(201)

    const v2Response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(adminUser)
      .json({ levelGranted: 'verified', notes: 'Checked references' })
    v2Response.assertStatus(201)

    await craftsman.refresh()
    assert.isAbove(craftsman.trustLevel, 0)
  })

  test('Cannot review a non-completed job', async ({ client }) => {
    const { customerUser, craftsman, region } = await createTestData()

    const jobResponse = await client.post('/api/jobs').loginAs(customerUser).json({
      requestId: 'REQ-WORKFLOW-3',
      craftsmanId: craftsman.userId,
      regionId: region.id,
      description: 'Pending job description here',
    })
    const jobId = jobResponse.body().job.id

    const reviewResponse = await client.post('/api/reviews').loginAs(customerUser).json({
      jobId: jobId,
      punctuality: 5,
      workmanship: 5,
      priceHonesty: 5,
      communication: 5,
      comment: 'Good',
    })
    reviewResponse.assertStatus(400)
  })

  test('Cannot dispute a pending job', async ({ client }) => {
    const { customerUser, craftsman, region } = await createTestData()

    const jobResponse = await client.post('/api/jobs').loginAs(customerUser).json({
      requestId: 'REQ-WORKFLOW-4',
      craftsmanId: craftsman.userId,
      regionId: region.id,
      description: 'Pending job description two',
    })
    const jobId = jobResponse.body().job.id

    const disputeResponse = await client.post(`/api/jobs/${jobId}/disputes`).loginAs(customerUser).json({
      reasonCategory: 'other',
      customerNotes: 'No show from craftsman',
    })
    disputeResponse.assertStatus(400)
  })
})
