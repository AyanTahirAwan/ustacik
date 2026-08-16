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
      { nameEn: 'Plumbing & Water Systems' },
      { nameEn: 'Plumbing & Water Systems', nameTr: 'Su Tesisatı' }
    )
    const electrical = await Category.updateOrCreate(
      { nameEn: 'Electrical' },
      { nameEn: 'Electrical', nameTr: 'Elektrik' }
    )
    const hvac = await Category.updateOrCreate(
      { nameEn: 'HVAC & Refrigeration' },
      { nameEn: 'HVAC & Refrigeration', nameTr: 'Klima & Soğutma' }
    )
    const appliance = await Category.updateOrCreate(
      { nameEn: 'Appliance & Electronics Repair' },
      { nameEn: 'Appliance & Electronics Repair', nameTr: 'Beyaz Eşya & Elektronik Tamir' }
    )
    const painting = await Category.updateOrCreate(
      { nameEn: 'Painting & Plastering' },
      { nameEn: 'Painting & Plastering', nameTr: 'Boya & Alçı' }
    )
    const carpentry = await Category.updateOrCreate(
      { nameEn: 'Carpentry & Furniture' },
      { nameEn: 'Carpentry & Furniture', nameTr: 'Marangoz & Mobilya' }
    )
    const aluminium = await Category.updateOrCreate(
      { nameEn: 'Aluminium, PVC & Glass' },
      { nameEn: 'Aluminium, PVC & Glass', nameTr: 'Alüminyum, PVC & Cam' }
    )
    const garden = await Category.updateOrCreate(
      { nameEn: 'Garden & Pool Maintenance' },
      { nameEn: 'Garden & Pool Maintenance', nameTr: 'Bahçe & Havuz Bakımı' }
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
      { categoryId: hvac.id, nameEn: 'AC Installation & Repair' },
      { categoryId: hvac.id, nameEn: 'AC Installation & Repair', nameTr: 'Klima Montajı ve Tamiri' }
    )
    await SubService.updateOrCreate(
      { categoryId: appliance.id, nameEn: 'Washing Machine Repair' },
      { categoryId: appliance.id, nameEn: 'Washing Machine Repair', nameTr: 'Çamaşır Makinesi Tamiri' }
    )
    await SubService.updateOrCreate(
      { categoryId: painting.id, nameEn: 'Interior Painting' },
      { categoryId: painting.id, nameEn: 'Interior Painting', nameTr: 'İç Cephe Boyama' }
    )
    await SubService.updateOrCreate(
      { categoryId: carpentry.id, nameEn: 'Furniture Repair' },
      { categoryId: carpentry.id, nameEn: 'Furniture Repair', nameTr: 'Mobilya Tamiri' }
    )
    await SubService.updateOrCreate(
      { categoryId: aluminium.id, nameEn: 'Window Frame Repair' },
      { categoryId: aluminium.id, nameEn: 'Window Frame Repair', nameTr: 'Pencere Doğrama Tamiri' }
    )
    await SubService.updateOrCreate(
      { categoryId: garden.id, nameEn: 'Pool Maintenance' },
      { categoryId: garden.id, nameEn: 'Pool Maintenance', nameTr: 'Havuz Bakımı' }
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
    await Region.updateOrCreate(
      { nameEn: 'Iskele' },
      { nameEn: 'Iskele', nameTr: 'İskele' }
    )
    await Region.updateOrCreate(
      { nameEn: 'Guzelyurt' },
      { nameEn: 'Guzelyurt', nameTr: 'Güzelyurt' }
    )
    await Region.updateOrCreate(
      { nameEn: 'Lefke' },
      { nameEn: 'Lefke', nameTr: 'Lefke' }
    )

    // Local-development administrator.
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
