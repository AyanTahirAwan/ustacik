// Provides unique Lucid fixtures for functional authentication and ownership tests.
import Category from '#models/category'
import Craftsman from '#models/craftsman'
import Customer from '#models/customer'
import CustomerAddress from '#models/customer_address'
import Region from '#models/region'
import User from '#models/user'

let fixtureSequence = 0

// Generate unique values so fixtures can coexist within an isolated test transaction.
function nextFixtureIdentity(label: string) {
  fixtureSequence += 1

  const sequence = fixtureSequence.toString().padStart(6, '0')
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return {
    slug: `${slug}-${sequence}`,
    phone: `+90555${sequence.padStart(7, '0')}`,
  }
}

// Lookup fixtures satisfy profile and address foreign-key requirements.
export async function createRegionFixture(label: string) {
  const identity = nextFixtureIdentity(label)

  return Region.create({
    nameEn: `Region ${identity.slug}`,
    nameTr: `Bolge ${identity.slug}`,
  })
}

export async function createCategoryFixture(label: string) {
  const identity = nextFixtureIdentity(label)

  return Category.create({
    nameEn: `Category ${identity.slug}`,
    nameTr: `Kategori ${identity.slug}`,
  })
}

// User fixtures create real profiles for authentication and role checks.
export async function createCustomerFixture(label: string) {
  const identity = nextFixtureIdentity(label)
  const user = await User.create({
    email: `${identity.slug}@example.test`,
    phoneNormalised: identity.phone,
    passwordHash: 'TestPassword123!',
    role: 'customer',
    status: 'active',
  })
  const customer = await Customer.create({
    userId: user.id,
    fullName: `Customer ${identity.slug}`,
    defaultRegionId: null,
    language: 'en',
    smsOptIn: true,
  })

  return { user, customer }
}

export async function createCraftsmanFixture(label: string) {
  const identity = nextFixtureIdentity(label)
  const category = await createCategoryFixture(`${label}-category`)
  const user = await User.create({
    email: `${identity.slug}@example.test`,
    phoneNormalised: identity.phone,
    passwordHash: 'TestPassword123!',
    role: 'craftsman',
    status: 'active',
  })
  const craftsman = await Craftsman.create({
    userId: user.id,
    businessName: `Workshop ${identity.slug}`,
    categoryId: category.id,
    bio: null,
    trustLevel: 0,
    bizRegNo: null,
    verbalConsent: false,
    totalJobs: 0,
  })

  return { user, craftsman, category }
}

type CustomerAddressFixtureOptions = {
  customer: Customer
  region: Region
  label?: string
  street?: string
  landmark?: string | null
  isDefault?: boolean
}

// Address fixtures support CRUD and cross-customer ownership scenarios.
export async function createCustomerAddressFixture({
  customer,
  region,
  label = 'Home',
  street = 'Fixture Street 10',
  landmark = null,
  isDefault = false,
}: CustomerAddressFixtureOptions) {
  return CustomerAddress.create({
    customerId: customer.userId,
    regionId: region.id,
    label,
    street,
    landmark,
    isDefault,
  })
}
