import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { ROLES, DEFAULT_ROLE_PERMISSIONS } from '../src/config/permissions.js';
 
dotenv.config();
 
const prisma = new PrismaClient();
 
// Product-line groups and the items under each (user-editable later)
const GROUPS = {
  Utilities: ['Tarpaulin', 'Shadenet', 'Hose Pipe', 'Rope', 'Sprinkler / Irrigation', 'Generator'],
  LAE: [
    'Power Weeder', 'Brush Cutter', 'Chain Saw', 'Hedge Trimmer', 'Lawn Mower',
    'Earth Auger', 'Mini Tiller', 'Shaft Cutter', 'Rust Cutter', 'Battery Sprayer',
    'Power Sprayer', 'Water Pump',
  ],
  Implements: ['Seeder', 'Chaff Cutter', 'Wood Chipper', 'Rice Transplanter', 'Reaper Harvester'],
};
 
const COMPONENTS = [
  'Engine', 'Water Pump', 'Power Sprayer', 'Gearbox', 'Blade', 'Nozzle',
  'Battery', 'Motor', 'Carburetor', 'Piston Kit', 'Pump Head', 'Hose',
  'Coupling', 'Frame', 'Wheel Assembly', 'Fuel Tank', 'Spark Plug',
  'Bearing', 'Pulley', 'Cutting Deck',
];
 
const STAGES = [
  { name: 'New Lead', order: 1, color: 'blue', countsInSourcing: true },
  { name: 'Potential Supplier', order: 2, color: 'purple', countsInSourcing: true },
  { name: 'Approved Vendor', order: 3, color: 'green', countsInSourcing: true },
  { name: 'Active Vendor', order: 4, color: 'green', countsInSourcing: true },
  { name: 'On Hold', order: 5, color: 'amber', countsInSourcing: false },
  { name: 'Inactive Vendor', order: 6, color: 'gray', countsInSourcing: false },
  { name: 'Blacklisted', order: 7, color: 'red', countsInSourcing: false },
];
 
const PHOTO_TYPES = [
  { name: 'Product', order: 1 },
  { name: 'Booth', order: 2 },
  { name: 'Business Card', order: 3 },
  { name: 'Online', order: 4 },
  { name: 'Other', order: 5 },
];
 
// Vendor product-line classification (editable in Settings).
const PRODUCT_LINES = [
  { name: 'UTILITY', order: 1 },
  { name: 'LAE', order: 2 },
  { name: 'IMPLEMENTS', order: 3 },
];
 
// Country masters — states & districts are added via Bulk Upload (Settings → Locations).
const COUNTRIES = [
  { name: 'India', code: 'IN', order: 1 },
  { name: 'China', code: 'CN', order: 2 },
];
 
// Value of 1 unit in INR — maintained manually (edit in Settings). Approx values.
const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', inrPerUnit: 1 },
  { code: 'USD', name: 'US Dollar', symbol: '$', inrPerUnit: 85.5 },
  { code: 'YUAN', name: 'Chinese Yuan', symbol: '¥', inrPerUnit: 11.9 },
];
 
async function main() {
  console.log('🌱 Seeding database...');
 
  // --- Admin user ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@farminghub.in';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'REPLACE_BEFORE_USE';
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrator';
  const passwordHash = await bcrypt.hash(adminPass, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: adminName, email: adminEmail, passwordHash, role: 'ADMIN' },
  });
  console.log(`  ✔ Admin user: ${admin.email}`);
 
  // --- Role permission defaults (only create if missing; keep admin edits) ---
  for (const role of ROLES) {
    await prisma.rolePermission.upsert({
      where: { role },
      update: {},
      create: { role, permissions: DEFAULT_ROLE_PERMISSIONS[role] },
    });
  }
  console.log(`  ✔ ${ROLES.length} role permission sets`);
 
  // --- Category groups + product lines ---
  let order = 1;
  for (const [groupName, items] of Object.entries(GROUPS)) {
    const group = await prisma.categoryGroup.upsert({
      where: { name: groupName },
      update: {},
      create: { name: groupName, order: order++ },
    });
    for (const name of items) {
      await prisma.productCategory.upsert({
        where: { name },
        update: { groupId: group.id },
        create: { name, groupId: group.id },
      });
    }
  }
  console.log(`  ✔ ${Object.keys(GROUPS).length} groups + product lines`);
 
  // --- Component tags ---
  for (const name of COMPONENTS) {
    await prisma.componentTag.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`  ✔ ${COMPONENTS.length} component tags`);
 
  // --- Vendor stages ---
  for (const s of STAGES) {
    await prisma.vendorStage.upsert({ where: { name: s.name }, update: { order: s.order, color: s.color, countsInSourcing: s.countsInSourcing }, create: s });
  }
  console.log(`  ✔ ${STAGES.length} vendor stages`);
 
  // --- Photo types ---
  for (const p of PHOTO_TYPES) {
    await prisma.photoType.upsert({ where: { name: p.name }, update: { order: p.order }, create: p });
  }
  console.log(`  ✔ ${PHOTO_TYPES.length} photo types`);
 
  // --- Currency rates ---
  for (const c of CURRENCIES) {
    await prisma.currencyRate.upsert({ where: { code: c.code }, update: { name: c.name, symbol: c.symbol, inrPerUnit: c.inrPerUnit }, create: c });
  }
  console.log(`  ✔ ${CURRENCIES.length} currency rates`);
 
  // --- Product lines ---
  for (const p of PRODUCT_LINES) {
    await prisma.productLine.upsert({ where: { name: p.name }, update: { order: p.order }, create: p });
  }
  console.log(`  ✔ ${PRODUCT_LINES.length} product lines`);
 
  // --- Countries (states/districts via bulk upload) ---
  for (const c of COUNTRIES) {
    await prisma.country.upsert({ where: { name: c.name }, update: { code: c.code, order: c.order }, create: c });
  }
  console.log(`  ✔ ${COUNTRIES.length} countries`);
 
  // --- Best-effort: link existing vendors' free-text country to the Country master ---
  const seededCountries = await prisma.country.findMany({ select: { id: true, name: true } });
  for (const c of seededCountries) {
    await prisma.vendor.updateMany({
      where: { countryId: null, country: { equals: c.name, mode: 'insensitive' } },
      data: { countryId: c.id },
    });
  }
 
  // --- Expos ---
  const expoData = [
    { name: 'Canton Fair', edition: '135th', year: 2024, city: 'Guangzhou', country: 'China' },
    { name: 'Canton Fair', edition: '137th', year: 2025, city: 'Guangzhou', country: 'China' },
    { name: 'Intex Bangalore', edition: null, year: 2024, city: 'Bangalore', country: 'India' },
    { name: 'Intex Coimbatore', edition: null, year: 2025, city: 'Coimbatore', country: 'India' },
  ];
  const expos = {};
  for (const e of expoData) {
    let expo = await prisma.expo.findFirst({ where: { name: e.name, edition: e.edition, year: e.year } });
    if (!expo) expo = await prisma.expo.create({ data: e });
    expos[`${e.name}-${e.year}`] = expo;
  }
  console.log(`  ✔ ${expoData.length} expos`);
 
  // --- Demo vendors (only if none exist) ---
  const vendorCount = await prisma.vendor.count();
  if (vendorCount === 0) {
    const comp = (name) => prisma.componentTag.findUnique({ where: { name } });
    const cat = (name) => prisma.productCategory.findUnique({ where: { name } });
    const stage = (name) => prisma.vendorStage.findUnique({ where: { name } });
 
    const engine = await comp('Engine');
    const waterPump = await comp('Water Pump');
    const sprayer = await comp('Power Sprayer');
    const activeStage = await stage('Active Vendor');
    const approvedStage = await stage('Approved Vendor');
 
    await prisma.vendor.create({
      data: {
        name: 'Mr. Li Wei',
        designation: 'Sales Director',
        companyName: 'Taizhou Green Agro Machinery Co.',
        phone: '+86 138 0000 1111',
        wechat: 'liwei_agro',
        city: 'Taizhou', region: 'Zhejiang', country: 'China',
        expoId: expos['Canton Fair-2025'].id,
        stageId: activeStage.id,
        communicationRating: 5, reliabilityRating: 4, overallRating: 4,
        annualVolume: '80,000 units/yr',
        remarks: 'Strong on 4-stroke engines. Fast sampling. Prefers WeChat.',
        sampleStatus: 'RECEIVED',
        createdById: admin.id,
        components: { connect: [{ id: engine.id }, { id: waterPump.id }] },
        categories: { connect: [{ id: (await cat('Power Weeder')).id }, { id: (await cat('Water Pump')).id }] },
        contacts: {
          create: [
            { name: 'Ms. Zhang Min', phone: '+86 138 2222 0000', designation: 'Export Manager', order: 1 },
          ],
        },
        samples: {
          create: [
            { componentTagId: engine.id, componentName: 'Engine', status: 'RECEIVED', price: 42.5, currency: 'USD', priceRemarks: 'FOB Ningbo, MOQ 100', qualityRemarks: 'Good build, needs EMI cert for India' },
          ],
        },
        interactions: {
          create: [
            { type: 'MEETING', title: 'Booth visit at Canton Fair', notes: 'Discussed engine specs and India certification. Sample to be shipped in 2 weeks.', createdById: admin.id },
          ],
        },
      },
    });
 
    await prisma.vendor.create({
      data: {
        name: 'Ms. Chen Hua',
        designation: 'Managing Partner',
        companyName: 'Zhanjiang Power Spray Equipment Ltd.',
        phone: '+86 139 2222 3333',
        wechat: 'chenhua_spray',
        city: 'Zhanjiang', region: 'Guangdong', country: 'China',
        expoId: expos['Canton Fair-2024'].id,
        stageId: approvedStage.id,
        communicationRating: 4, reliabilityRating: 5, overallRating: 5,
        annualVolume: 'USD 3M / yr',
        remarks: 'Best price on knapsack power sprayers. Reliable shipping.',
        sampleStatus: 'APPROVED',
        createdById: admin.id,
        components: { connect: [{ id: sprayer.id }] },
        categories: { connect: [{ id: (await cat('Power Sprayer')).id }, { id: (await cat('Battery Sprayer')).id }] },
        samples: {
          create: [
            { componentTagId: sprayer.id, componentName: 'Power Sprayer', status: 'APPROVED', price: 18.9, currency: 'USD', priceRemarks: 'FOB Zhanjiang', qualityRemarks: 'Approved for import. Consistent quality.' },
          ],
        },
      },
    });
 
    console.log('  ✔ 2 demo vendors');
  }
 
  console.log('✅ Seed complete.');
}
 
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
