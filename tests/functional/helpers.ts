import Category from '#models/category'
import Craftsman from '#models/craftsman'
import Customer from '#models/customer'
import Region from '#models/region'
import ServicePriceCatalog from '#models/service_price_catalog'
import SubService from '#models/sub_service'
import User from '#models/user'

/**
 * -------------------------------------------------------------------------
 * Shared fixture helpers for functional tests
 * -------------------------------------------------------------------------
 */

let seqCounter = 1
function nextSeq() {
  return `${Date.now()}${seqCounter++}`
}

/**
 * Create an admin user with a full Admin profile row.
 */
export async function createAdmin(
  overrides: Partial<{ email: string; phoneNormalised: string }> = {}
) {
  const seq = nextSeq()
  const user = await User.create({
    email: overrides.email ?? `admin-${seq}@ustacik.test`,
    phoneNormalised: overrides.phoneNormalised ?? `+905${seq.slice(-9).padStart(9, '0')}`,
    passwordHash: 'Password123!',
    role: 'admin',
    status: 'active',
  })

  return user
}

/**
 * Create a craftsman user together with the required Craftsman profile row.
 * A category must exist before calling this helper.
 */
export async function createCraftsman(
  categoryId: number,
  overrides: Partial<{ email: string; phoneNormalised: string }> = {}
) {
  const seq = nextSeq()
  const user = await User.create({
    email: overrides.email ?? `craftsman-${seq}@ustacik.test`,
    phoneNormalised: overrides.phoneNormalised ?? `+905${seq.slice(-9).padStart(9, '0')}`,
    passwordHash: 'Password123!',
    role: 'craftsman',
    status: 'active',
  })

  await Craftsman.create({
    userId: user.id,
    businessName: 'Test Craftsman Co.',
    categoryId,
    trustLevel: 0,
    verbalConsent: false,
    totalJobs: 0,
  })

  return user
}

/**
 * Create a customer user together with the required Customer profile row.
 */
export async function createCustomer(
  overrides: Partial<{ email: string; phoneNormalised: string; fullName: string }> = {}
) {
  const seq = nextSeq()
  const user = await User.create({
    email: overrides.email ?? `customer-${seq}@ustacik.test`,
    phoneNormalised: overrides.phoneNormalised ?? `+905${seq.slice(-9).padStart(9, '0')}`,
    passwordHash: 'Password123!',
    role: 'customer',
    status: 'active',
  })

  await Customer.create({
    userId: user.id,
    fullName: overrides.fullName ?? 'Test Customer',
    language: 'en',
    smsOptIn: true,
  })

  return user
}

/**
 * Seed the catalog lookup tables (categories, sub-services, regions).
 */
export async function seedCatalog() {
  const seq = nextSeq()
  const plumbing = await Category.create({ nameEn: `Plumbing ${seq}`, nameTr: `Tesisat ${seq}` })
  const electrical = await Category.create({ nameEn: `Electrical ${seq}`, nameTr: `Elektrik ${seq}` })

  const leakRepair = await SubService.create({
    categoryId: plumbing.id,
    nameEn: `Leak Repair ${seq}`,
    nameTr: `Kaçak Tamiri ${seq}`,
  })
  const wiring = await SubService.create({
    categoryId: electrical.id,
    nameEn: `Wiring ${seq}`,
    nameTr: `Kablolama ${seq}`,
  })

  const lefkosa = await Region.create({ nameEn: `Lefkosa ${seq}`, nameTr: `Lefkoşa ${seq}` })
  const girne = await Region.create({ nameEn: `Kyrenia ${seq}`, nameTr: `Girne ${seq}` })

  return { electrical, girne, lefkosa, leakRepair, plumbing, wiring }
}

/**
 * Create a single service price catalog entry for a craftsman.
 */
export async function createPriceEntry(params: {
  craftsmanId: number
  subServiceId: number
  regionId: number
  minPrice?: number
  maxPrice?: number
  currency?: 'TRY' | 'GBP' | 'EUR' | 'USD'
  isActive?: boolean
}) {
  return ServicePriceCatalog.create({
    craftsmanId: params.craftsmanId,
    subServiceId: params.subServiceId,
    regionId: params.regionId,
    minPrice: params.minPrice ?? 100,
    maxPrice: params.maxPrice ?? 200,
    currency: params.currency ?? 'TRY',
    isActive: params.isActive ?? true,
  })
}
