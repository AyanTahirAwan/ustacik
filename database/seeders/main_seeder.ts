import Category from '#models/category'
import Admin from '#models/admin'
import Craftsman from '#models/craftsman'
import Region from '#models/region'
import ServicePriceCatalog from '#models/service_price_catalog'
import SubService from '#models/sub_service'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const plumbing = await Category.updateOrCreate(
      { nameEn: 'Plumbing' },
      { nameEn: 'Plumbing', nameTr: 'Tesisat' }
    )
    const electrical = await Category.updateOrCreate(
      { nameEn: 'Electrical' },
      { nameEn: 'Electrical', nameTr: 'Elektrik' }
    )
    const carpentry = await Category.updateOrCreate(
      { nameEn: 'Carpentry' },
      { nameEn: 'Carpentry', nameTr: 'Marangozluk' }
    )

    const leakRepair = await SubService.updateOrCreate(
      { categoryId: plumbing.id, nameEn: 'Leak Repair' },
      { categoryId: plumbing.id, nameEn: 'Leak Repair', nameTr: 'Kaçak Tamiri' }
    )
    const pipeInstallation = await SubService.updateOrCreate(
      { categoryId: plumbing.id, nameEn: 'Pipe Installation' },
      { categoryId: plumbing.id, nameEn: 'Pipe Installation', nameTr: 'Boru Montajı' }
    )
    await SubService.updateOrCreate(
      { categoryId: electrical.id, nameEn: 'Electrical Wiring' },
      { categoryId: electrical.id, nameEn: 'Electrical Wiring', nameTr: 'Elektrik Tesisatı' }
    )
    await SubService.updateOrCreate(
      { categoryId: carpentry.id, nameEn: 'Furniture Repair' },
      { categoryId: carpentry.id, nameEn: 'Furniture Repair', nameTr: 'Mobilya Tamiri' }
    )

    const nicosia = await Region.updateOrCreate(
      { nameEn: 'Nicosia' },
      { nameEn: 'Nicosia', nameTr: 'Lefkoşa' }
    )
    const kyrenia = await Region.updateOrCreate(
      { nameEn: 'Kyrenia' },
      { nameEn: 'Kyrenia', nameTr: 'Girne' }
    )
    await Region.updateOrCreate(
      { nameEn: 'Famagusta' },
      { nameEn: 'Famagusta', nameTr: 'Gazimağusa' }
    )

    // Local-development administrator. Change this credential before any deployment.
    const adminUser = await User.updateOrCreate(
      { email: 'admin@ustacik.test' },
      {
        email: 'admin@ustacik.test',
        phoneNormalised: '+905550000000',
        passwordHash: 'AdminPassword123!',
        role: 'admin',
        status: 'active',
      }
    )
    await Admin.updateOrCreate(
      { userId: adminUser.id },
      {
        userId: adminUser.id,
        fullName: 'Ustacik Administrator',
        department: 'Platform Operations',
        clearanceLvl: 1,
      }
    )

    const craftsmanUser = await User.updateOrCreate(
      { email: 'craftsman.demo@ustacik.test' },
      {
        email: 'craftsman.demo@ustacik.test',
        phoneNormalised: '+905550000001',
        passwordHash: 'DevelopmentOnly123!',
        role: 'craftsman',
        status: 'active',
      }
    )
    const craftsman = await Craftsman.updateOrCreate(
      { userId: craftsmanUser.id },
      {
        userId: craftsmanUser.id,
        businessName: 'Ustacik Demo Services',
        categoryId: plumbing.id,
        bio: 'Local plumbing and home repair services.',
        trustLevel: 1,
        verbalConsent: true,
        totalJobs: 12,
      }
    )

    await ServicePriceCatalog.updateOrCreate(
      { craftsmanId: craftsman.userId, subServiceId: leakRepair.id, regionId: nicosia.id },
      {
        craftsmanId: craftsman.userId,
        subServiceId: leakRepair.id,
        regionId: nicosia.id,
        minPrice: 500,
        maxPrice: 1200,
        currency: 'TRY',
        isActive: true,
      }
    )
    await ServicePriceCatalog.updateOrCreate(
      { craftsmanId: craftsman.userId, subServiceId: pipeInstallation.id, regionId: kyrenia.id },
      {
        craftsmanId: craftsman.userId,
        subServiceId: pipeInstallation.id,
        regionId: kyrenia.id,
        minPrice: 750,
        maxPrice: 1800,
        currency: 'TRY',
        isActive: true,
      }
    )
  }
}
