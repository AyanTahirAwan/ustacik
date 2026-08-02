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

  test('Job → Accept → Complete → Review workflow', async ({ client, assert }) => {
    const { customerUser, craftsmanUser, craftsman, category, region } = await createTestData()

    // 1. Customer creates a job request (POST /jobs)
    const jobResponse = await client.post('/jobs').loginAs(customerUser).json({
      craftsmanId: craftsman.userId,
      categoryId: category.id,
      regionId: region.id,
      description: 'Leaking sink in the kitchen',
    })
    jobResponse.assertStatus(201)
    assert.equal(jobResponse.body().status, 'pending')
    const jobId = jobResponse.body().id

    // 2. Craftsman accepts the job (PATCH /jobs/:id)
    const acceptResponse = await client.patch(`/jobs/${jobId}`).loginAs(craftsmanUser).json({ status: 'accepted' })
    acceptResponse.assertStatus(200)

    // 3. Craftsman starts the job (PATCH /jobs/:id)
    const startResponse = await client.patch(`/jobs/${jobId}`).loginAs(craftsmanUser).json({ status: 'in_progress' })
    startResponse.assertStatus(200)

    // 4. Craftsman completes the job (PATCH /jobs/:id)
    const completeResponse = await client.patch(`/jobs/${jobId}`).loginAs(craftsmanUser).json({ status: 'completed' })
    completeResponse.assertStatus(200)

    // 5. Customer submits a review (POST /reviews)
    const reviewResponse = await client.post('/reviews').loginAs(customerUser).json({
      jobId: jobId,
      craftsmanId: craftsman.userId,
      punctuality: 5,
      workmanship: 5,
      priceHonesty: 5,
      communication: 5,
      comment: 'Excellent work!',
    })
    reviewResponse.assertStatus(201)
    assert.equal(reviewResponse.body().punctuality, 5)
    const reviewId = reviewResponse.body().id

    // 6. Craftsman replies to review (PATCH /reviews/:id)
    const replyResponse = await client.patch(`/reviews/${reviewId}`).loginAs(craftsmanUser).json({
      craftsmanReply: 'Thank you!',
    })
    replyResponse.assertStatus(200)
    assert.equal(replyResponse.body().craftsmanReply, 'Thank you!')

    // 7. Verify final job status is 'completed' (GET /jobs/:id)
    const finalJobResponse = await client.get(`/jobs/${jobId}`).loginAs(customerUser)
    finalJobResponse.assertStatus(200)
    assert.equal(finalJobResponse.body().status, 'completed')
  })

  test('Job → Accept → Dispute → Admin Resolution workflow', async ({ client, assert }) => {
    const { adminUser, customerUser, craftsmanUser, craftsman, category, region } = await createTestData()

    // 1. Customer creates job
    const jobResponse = await client.post('/jobs').loginAs(customerUser).json({
      craftsmanId: craftsman.userId,
      categoryId: category.id,
      regionId: region.id,
      description: 'Pipe is broken and leaking',
    })
    jobResponse.assertStatus(201)
    const jobId = jobResponse.body().id

    // 2. Craftsman accepts
    await client.patch(`/jobs/${jobId}`).loginAs(craftsmanUser).json({ status: 'accepted' })

    // 3. Craftsman starts work
    await client.patch(`/jobs/${jobId}`).loginAs(craftsmanUser).json({ status: 'in_progress' })

    // 4. Customer opens dispute
    const disputeResponse = await client.post('/disputes').loginAs(customerUser).json({
      jobId: jobId,
      reasonCategory: 'workmanship',
      customerNotes: 'Work not finished properly',
    })
    disputeResponse.assertStatus(201)
    assert.equal(disputeResponse.body().status, 'OPEN')
    const disputeId = disputeResponse.body().id

    // 5. Verify job status changed to 'disputed'
    const disputedJobResponse = await client.get(`/jobs/${jobId}`).loginAs(customerUser)
    assert.equal(disputedJobResponse.body().status, 'disputed')

    // 6. Admin resolves dispute with finalJobStatus 'cancelled'
    const resolveResponse = await client.patch(`/disputes/${disputeId}`).loginAs(adminUser).json({
      adminResolutionNotes: 'Refunded customer',
      finalJobStatus: 'cancelled',
    })
    resolveResponse.assertStatus(200)

    // 7. Verify dispute status is 'CLOSED' and has adminResolutionNotes
    assert.equal(resolveResponse.body().status, 'CLOSED')
    assert.equal(resolveResponse.body().adminResolutionNotes, 'Refunded customer')
  })

  test('Admin verifies craftsman → trust level updates', async ({ client, assert }) => {
    const { adminUser, craftsman } = await createTestData()

    // 1. Admin creates verification log with levelGranted 'registered'
    const v1Response = await client.post('/verifications').loginAs(adminUser).json({
      craftsmanId: craftsman.userId,
      levelGranted: 'registered',
      notes: 'Checked ID',
    })
    v1Response.assertStatus(201)

    // 2. Admin creates another verification log with levelGranted 'verified'
    const v2Response = await client.post('/verifications').loginAs(adminUser).json({
      craftsmanId: craftsman.userId,
      levelGranted: 'verified',
      notes: 'Checked references',
    })
    v2Response.assertStatus(201)

    // 3. Verify the craftsman's trust level was recomputed
    await craftsman.refresh()
    assert.isAbove(craftsman.trustLevel, 0)
  })

  test('Cannot review a non-completed job', async ({ client }) => {
    const { customerUser, craftsman, category, region } = await createTestData()

    const jobResponse = await client.post('/jobs').loginAs(customerUser).json({
      craftsmanId: craftsman.userId,
      categoryId: category.id,
      regionId: region.id,
      description: 'Pending job description here',
    })
    const jobId = jobResponse.body().id

    const reviewResponse = await client.post('/reviews').loginAs(customerUser).json({
      jobId: jobId,
      craftsmanId: craftsman.userId,
      punctuality: 5,
      workmanship: 5,
      priceHonesty: 5,
      communication: 5,
      comment: 'Good',
    })
    reviewResponse.assertStatus(400)
  })

  test('Cannot dispute a pending job', async ({ client }) => {
    const { customerUser, craftsman, category, region } = await createTestData()

    const jobResponse = await client.post('/jobs').loginAs(customerUser).json({
      craftsmanId: craftsman.userId,
      categoryId: category.id,
      regionId: region.id,
      description: 'Pending job description two',
    })
    const jobId = jobResponse.body().id

    const disputeResponse = await client.post('/disputes').loginAs(customerUser).json({
      jobId: jobId,
      reasonCategory: 'other',
      customerNotes: 'No show from craftsman',
    })
    disputeResponse.assertStatus(400)
  })
})
