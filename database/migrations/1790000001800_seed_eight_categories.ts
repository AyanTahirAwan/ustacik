import { BaseSchema } from '@adonisjs/lucid/schema'
import { DateTime } from 'luxon'

export default class extends BaseSchema {
  async up() {
    const categories = [
      { nameEn: 'Plumbing & Water Systems', nameTr: 'Su Tesisatı' },
      { nameEn: 'Electrical', nameTr: 'Elektrik' },
      { nameEn: 'HVAC & Refrigeration', nameTr: 'Klima & Soğutma' },
      { nameEn: 'Appliance & Electronics Repair', nameTr: 'Beyaz Eşya & Elektronik Tamir' },
      { nameEn: 'Painting & Plastering', nameTr: 'Boya & Alçı' },
      { nameEn: 'Carpentry & Furniture', nameTr: 'Marangoz & Mobilya' },
      { nameEn: 'Aluminium, PVC & Glass', nameTr: 'Alüminyum, PVC & Cam' },
      { nameEn: 'Garden & Pool Maintenance', nameTr: 'Bahçe & Havuz Bakımı' },
    ]

    const subServicesMap: Record<string, { nameEn: string; nameTr: string }[]> = {
      'Plumbing & Water Systems': [
        { nameEn: 'Leak Repair', nameTr: 'Kaçak Tamiri' },
        { nameEn: 'Pipe Installation', nameTr: 'Boru Montajı' },
        { nameEn: 'Water Heater Repair', nameTr: 'Şofben Tamiri' },
        { nameEn: 'Drain Unblocking', nameTr: 'Gider Açma' },
      ],
      'Electrical': [
        { nameEn: 'Electrical Wiring', nameTr: 'Elektrik Tesisatı' },
        { nameEn: 'Fuse Box Repair', nameTr: 'Sigorta Kutusu Tamiri' },
        { nameEn: 'Lighting Installation', nameTr: 'Aydınlatma Montajı' },
        { nameEn: 'Socket & Switch Repair', nameTr: 'Priz ve Anahtar Tamiri' },
      ],
      'HVAC & Refrigeration': [
        { nameEn: 'AC Installation', nameTr: 'Klima Montajı' },
        { nameEn: 'AC Maintenance & Gas Refill', nameTr: 'Klima Bakımı ve Gaz Dolumu' },
        { nameEn: 'Refrigerator Repair', nameTr: 'Buzdolabı Tamiri' },
      ],
      'Appliance & Electronics Repair': [
        { nameEn: 'Washing Machine Repair', nameTr: 'Çamaşır Makinesi Tamiri' },
        { nameEn: 'Dishwasher Repair', nameTr: 'Bulaşık Makinesi Tamiri' },
        { nameEn: 'Oven & Stove Repair', nameTr: 'Fırın ve Ocak Tamiri' },
      ],
      'Painting & Plastering': [
        { nameEn: 'Interior Wall Painting', nameTr: 'İç Cephe Boyama' },
        { nameEn: 'Exterior Painting', nameTr: 'Dış Cephe Boyama' },
        { nameEn: 'Plastering & Drywall', nameTr: 'Alçı ve Alçıpan' },
      ],
      'Carpentry & Furniture': [
        { nameEn: 'Furniture Assembly', nameTr: 'Mobilya Montajı' },
        { nameEn: 'Custom Cabinet Making', nameTr: 'Özel Dolap Yapımı' },
        { nameEn: 'Door & Lock Repair', nameTr: 'Kapı ve Kilit Tamiri' },
      ],
      'Aluminium, PVC & Glass': [
        { nameEn: 'Window Frame Repair', nameTr: 'Pencere Doğrama Tamiri' },
        { nameEn: 'Balcony Glazing', nameTr: 'Cam Balkon Montajı' },
        { nameEn: 'Fly Screen Installation', nameTr: 'Sineklik Montajı' },
      ],
      'Garden & Pool Maintenance': [
        { nameEn: 'Lawn Mowing & Landscaping', nameTr: 'Çim Biçme ve Peyzaj' },
        { nameEn: 'Pool Cleaning & Chemistry', nameTr: 'Havuz Temizliği ve Bakımı' },
        { nameEn: 'Tree Pruning & Irrigation', nameTr: 'Ağaç Budama ve Sulama' },
      ],
    }

    const regions = [
      { nameEn: 'Nicosia', nameTr: 'Lefkoşa' },
      { nameEn: 'Kyrenia', nameTr: 'Girne' },
      { nameEn: 'Famagusta', nameTr: 'Gazimağusa' },
      { nameEn: 'Iskele', nameTr: 'İskele' },
      { nameEn: 'Guzelyurt', nameTr: 'Güzelyurt' },
      { nameEn: 'Lefke', nameTr: 'Lefke' },
    ]

    const now = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')

    // Ensure all 8 categories exist
    for (const cat of categories) {
      const existing = await this.db.from('categories').where('name_en', cat.nameEn).first()
      let catId: number
      if (existing) {
        catId = existing.id
        await this.db.from('categories').where('id', catId).update({ name_tr: cat.nameTr })
      } else {
        // Also check if old name exists (e.g. Plumbing -> Plumbing & Water Systems)
        const oldPrefix = cat.nameEn.split(' ')[0]
        const oldMatch = await this.db.from('categories').where('name_en', 'like', `${oldPrefix}%`).first()
        if (oldMatch) {
          catId = oldMatch.id
          await this.db.from('categories').where('id', catId).update({
            name_en: cat.nameEn,
            name_tr: cat.nameTr,
          })
        } else {
          const inserted = await this.db
            .table('categories')
            .returning('id')
            .insert({
              name_en: cat.nameEn,
              name_tr: cat.nameTr,
              created_at: now,
            })
          catId = typeof inserted[0] === 'object' ? inserted[0].id : inserted[0]
        }
      }

      // Insert default sub-services
      const subList = subServicesMap[cat.nameEn] || []
      for (const sub of subList) {
        const existingSub = await this.db
          .from('sub_services')
          .where('category_id', catId)
          .where('name_en', sub.nameEn)
          .first()
        if (!existingSub) {
          await this.db.table('sub_services').insert({
            category_id: catId,
            name_en: sub.nameEn,
            name_tr: sub.nameTr,
            created_at: now,
          })
        }
      }
    }

    // Ensure all regions exist
    for (const reg of regions) {
      const existingReg = await this.db.from('regions').where('name_en', reg.nameEn).first()
      if (!existingReg) {
        await this.db.table('regions').insert({
          name_en: reg.nameEn,
          name_tr: reg.nameTr,
          created_at: now,
        })
      } else {
        await this.db.from('regions').where('id', existingReg.id).update({ name_tr: reg.nameTr })
      }
    }
  }

  async down() {
    // Non-destructive down to prevent data loss in production
  }
}
