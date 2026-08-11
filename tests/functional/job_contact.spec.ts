import JobRequest, { type JobStatus } from '#models/job_request'
import ServicePriceCatalog from '#models/service_price_catalog'
import SubService from '#models/sub_service'
import {
  createCraftsmanFixture,
  createCustomerFixture,
  createRegionFixture,
} from '#tests/helpers/user_fixtures'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const eligibleStatuses: JobStatus[] = ['accepted', 'in_progress', 'completed']
const blockedStatuses: JobStatus[] = ['pending', 'declined', 'cancelled', 'expired', 'disputed']

test.group('Job contact privacy', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('allows only an owning customer with an eligible job status', async ({ client, assert }) => {
    const { user: customer } = await createCustomerFixture('contact-owner')
    const {
      user: craftsmanUser,
      craftsman,
      category,
    } = await createCraftsmanFixture('contact-craftsman')
    const region = await createRegionFixture('contact-region')

    for (const [index, status] of eligibleStatuses.entries()) {
      const job = await JobRequest.create({
        requestId: `CONTACT-ELIGIBLE-${index}`,
        customerId: customer.id,
        craftsmanId: craftsman.userId,
        categoryId: category.id,
        regionId: region.id,
        description: 'Eligible contact request',
        status,
      })

      const response = await client
        .get(`/api/jobs/${job.id}/contact`)
        .loginAs(customer)
        .accept('json')

      response.assertStatus(200)
      assert.onlyProperties(response.body(), ['craftsmanName', 'phone', 'whatsappUrl'])
      assert.equal(response.body().craftsmanName, craftsman.businessName)
      assert.equal(response.body().phone, craftsmanUser.phoneNormalised)
      assert.equal(
        response.body().whatsappUrl,
        `https://wa.me/${craftsmanUser.phoneNormalised.slice(1)}?text=Hello%2C%20I%20found%20your%20service%20through%20Ustacik%20regarding%20my%20service%20request.`
      )
    }
  })

  test('blocks ineligible statuses without exposing contact data', async ({ client, assert }) => {
    const { user: customer } = await createCustomerFixture('contact-blocked-owner')
    const { craftsman, category } = await createCraftsmanFixture('contact-blocked-craftsman')
    const region = await createRegionFixture('contact-blocked-region')

    for (const [index, status] of blockedStatuses.entries()) {
      const job = await JobRequest.create({
        requestId: `CONTACT-BLOCKED-${index}`,
        customerId: customer.id,
        craftsmanId: craftsman.userId,
        categoryId: category.id,
        regionId: region.id,
        description: 'Blocked contact request',
        status,
      })
      const response = await client
        .get(`/api/jobs/${job.id}/contact`)
        .loginAs(customer)
        .accept('json')

      response.assertStatus(403)
      assert.notProperty(response.body(), 'phone')
      assert.notProperty(response.body(), 'whatsappUrl')
    }
  })

  test('conceals jobs from other customers and rejects guests and craftsmen', async ({
    client,
    assert,
  }) => {
    const { user: owner } = await createCustomerFixture('contact-real-owner')
    const { user: otherCustomer } = await createCustomerFixture('contact-other-customer')
    const {
      user: craftsmanUser,
      craftsman,
      category,
    } = await createCraftsmanFixture('contact-role-craftsman')
    const region = await createRegionFixture('contact-role-region')
    const job = await JobRequest.create({
      requestId: 'CONTACT-ACCESS-CONTROL',
      customerId: owner.id,
      craftsmanId: craftsman.userId,
      categoryId: category.id,
      regionId: region.id,
      description: 'Private accepted request',
      status: 'accepted',
    })

    const unrelated = await client
      .get(`/api/jobs/${job.id}/contact`)
      .loginAs(otherCustomer)
      .accept('json')
    unrelated.assertStatus(404)
    assert.notInclude(JSON.stringify(unrelated.body()), craftsmanUser.phoneNormalised)

    const guest = await client.get(`/api/jobs/${job.id}/contact`).accept('json')
    guest.assertStatus(401)

    const craftsmanResponse = await client
      .get(`/api/jobs/${job.id}/contact`)
      .loginAs(craftsmanUser)
      .accept('json')
    craftsmanResponse.assertStatus(403)
  })

  test('rejects missing jobs and invalid stored phone numbers safely', async ({
    client,
    assert,
  }) => {
    const { user: customer } = await createCustomerFixture('contact-invalid-owner')
    const {
      user: craftsmanUser,
      craftsman,
      category,
    } = await createCraftsmanFixture('contact-invalid-craftsman')
    const region = await createRegionFixture('contact-invalid-region')
    const missing = await client.get('/api/jobs/999999/contact').loginAs(customer).accept('json')
    missing.assertStatus(404)

    craftsmanUser.phoneNormalised = 'not-a-phone'
    await craftsmanUser.save()
    const job = await JobRequest.create({
      requestId: 'CONTACT-INVALID-PHONE',
      customerId: customer.id,
      craftsmanId: craftsman.userId,
      categoryId: category.id,
      regionId: region.id,
      description: 'Accepted request with unavailable contact',
      status: 'accepted',
    })
    const response = await client
      .get(`/api/jobs/${job.id}/contact`)
      .loginAs(customer)
      .accept('json')

    response.assertStatus(422)
    response.assertBody({ message: 'Craftsman contact is currently unavailable.' })
    assert.notProperty(response.body(), 'phone')
  })

  test('keeps phone and email out of public craftsman and search APIs', async ({
    client,
    assert,
  }) => {
    const {
      user: craftsmanUser,
      craftsman,
      category,
    } = await createCraftsmanFixture('contact-public-privacy')
    const region = await createRegionFixture('contact-public-search-region')
    const subService = await SubService.create({
      categoryId: category.id,
      nameEn: 'Private contact test service',
      nameTr: 'Gizli iletisim test hizmeti',
    })
    await ServicePriceCatalog.create({
      craftsmanId: craftsman.userId,
      subServiceId: subService.id,
      regionId: region.id,
      minPrice: 100,
      maxPrice: 200,
      currency: 'TRY',
      isActive: true,
    })

    for (const path of [
      '/api/craftsmen',
      `/api/craftsmen/${craftsman.userId}`,
      '/api/search/services',
    ]) {
      const response = await client.get(path).accept('json')
      response.assertStatus(200)
      const body = JSON.stringify(response.body())
      assert.notInclude(body, craftsmanUser.phoneNormalised)
      assert.notInclude(body, craftsmanUser.email)
      assert.notMatch(body, /"phone(?:Normalised)?"/)
      assert.notMatch(body, /"email"/)
    }
  })

  test('keeps contact available through accept, start, and complete lifecycle', async ({
    client,
    assert,
  }) => {
    const { user: customer } = await createCustomerFixture('contact-lifecycle-customer')
    const { user: craftsmanUser, craftsman } = await createCraftsmanFixture(
      'contact-lifecycle-craftsman'
    )
    const region = await createRegionFixture('contact-lifecycle-region')
    const create = await client
      .post('/api/jobs')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({
        requestId: 'CONTACT-LIFECYCLE',
        craftsmanId: craftsman.userId,
        regionId: region.id,
        description: 'Lifecycle contact request',
      })
    create.assertStatus(201)
    const jobId = create.body().job.id

    const pending = await client.get(`/api/jobs/${jobId}/contact`).loginAs(customer).accept('json')
    pending.assertStatus(403)

    for (const action of ['accept', 'start', 'complete']) {
      const transition = await client
        .patch(`/api/jobs/${jobId}/${action}`)
        .loginAs(craftsmanUser)
        .withCsrfToken()
        .accept('json')
      transition.assertStatus(200)
      const contact = await client
        .get(`/api/jobs/${jobId}/contact`)
        .loginAs(customer)
        .accept('json')
      contact.assertStatus(200)
      assert.match(contact.body().whatsappUrl, /^https:\/\/wa\.me\/[1-9]\d{7,14}\?text=/)
    }
  })

  test('keeps marketplace and account lifecycle pages available', async ({ client, assert }) => {
    const { user: customer } = await createCustomerFixture('contact-route-customer')
    const { user: craftsmanUser, craftsman } =
      await createCraftsmanFixture('contact-route-craftsman')

    for (const path of ['/', '/craftsmen', `/craftsmen/${craftsman.userId}`, '/search']) {
      const response = await client.get(path)
      response.assertStatus(200)
      assert.notInclude(response.text(), craftsmanUser.phoneNormalised)
      assert.notInclude(response.text(), craftsmanUser.email)
    }

    for (const path of [
      `/craftsmen/${craftsman.userId}/request`,
      '/customer/requests',
      '/notifications',
      '/account/settings',
    ]) {
      const response = await client.get(path).loginAs(customer)
      response.assertStatus(200)
    }

    for (const path of ['/craftsman', '/craftsman/jobs', '/craftsman/profile']) {
      const response = await client.get(path).loginAs(craftsmanUser)
      response.assertStatus(200)
    }
  })
})
