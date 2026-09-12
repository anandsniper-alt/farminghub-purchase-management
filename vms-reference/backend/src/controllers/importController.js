import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
 
// -------------------------------------------------------------------------
// Column definitions (canonical headers shown in the template)
// -------------------------------------------------------------------------
const COLUMNS = [
  'Vendor Name', 'Designation', 'Company', 'Phone', 'WeChat', 'Email',
  'City', 'Region', 'Country', 'Stage',
  'Expo', 'Expo Edition', 'Expo Year',
  'Components', 'Product Lines',
  'Communication', 'Reliability', 'Overall Rating',
  'Annual Volume', 'Sample Status', 'Remarks',
];
 
const EXAMPLE_ROW = {
  'Vendor Name': 'Mr. Li Wei',
  Designation: 'Sales Director',
  Company: 'Taizhou Green Agro Machinery Co.',
  Phone: '+86 138 0000 1111',
  WeChat: 'liwei_agro',
  Email: 'sales@example.com',
  City: 'Taizhou',
  Region: 'Zhejiang',
  Country: 'China',
  Stage: 'Approved Vendor',
  Expo: 'Canton Fair',
  'Expo Edition': '137th',
  'Expo Year': 2025,
  Components: 'Engine, Water Pump',
  'Product Lines': 'Power Weeder, Water Pump',
  Communication: 4,
  Reliability: 5,
  'Overall Rating': 4,
  'Annual Volume': '80,000 units/yr',
  'Sample Status': 'Received',
  Remarks: 'Good price, quality to be confirmed',
};
 
// -------------------------------------------------------------------------
// Header alias resolution
// -------------------------------------------------------------------------
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
 
const ALIASES = {
  name: ['vendorname', 'name', 'suppliername', 'supplier', 'contactname'],
  designation: ['designation', 'title', 'contactdesignation'],
  companyName: ['company', 'companyname', 'firm'],
  phone: ['phone', 'phoneno', 'phonenumber', 'contactno', 'contactnumber', 'mobile', 'contact', 'whatsapp'],
  wechat: ['wechat', 'wechatid', 'wechatno'],
  email: ['email', 'mail', 'emailid'],
  city: ['city'],
  region: ['region', 'province', 'area', 'district'],
  country: ['country'],
  stage: ['stage', 'status', 'vendorstage'],
  expoName: ['expo', 'exponame', 'event', 'fair', 'source', 'exhibition'],
  expoEdition: ['expoedition', 'edition'],
  expoYear: ['expoyear', 'year'],
  components: ['components', 'component', 'componenttags', 'tags', 'otherproducts'],
  categories: ['productlines', 'productline', 'maincategory', 'maincatagory', 'category', 'categories', 'product'],
  communication: ['communication', 'communicationrating'],
  reliability: ['reliability', 'reliabilityrating'],
  overall: ['overall', 'overallrating', 'rating'],
  annualVolume: ['annualvolume', 'volume', 'annualproductionvolume'],
  sampleStatus: ['samplestatus', 'sample'],
  remarks: ['remarks', 'remark', 'notes', 'note'],
};
 
function buildHeaderMap(headers) {
  // normalized header -> canonical field
  const lookup = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) lookup[a] = field;
  }
  const map = {};
  for (const h of headers) {
    const field = lookup[norm(h)];
    if (field && !(field in map)) map[field] = h; // first header wins
  }
  return map;
}
 
// -------------------------------------------------------------------------
// Value parsers
// -------------------------------------------------------------------------
const WORD_RATING = { bad: 1, poor: 1, moderate: 2, average: 2, ok: 3, good: 3, vgood: 4, verygood: 4, excellent: 5, best: 5 };
 
function parseRating(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v);
  const m = s.match(/([1-5])/);
  if (m) return parseInt(m[1], 10);
  const w = WORD_RATING[norm(s)];
  return w || null;
}
 
function parseSampleStatus(v) {
  const n = norm(v);
  if (!n) return null;
  if (n.includes('approv')) return 'APPROVED';
  if (n.includes('reject')) return 'REJECTED';
  if (n.includes('receiv')) return 'RECEIVED';
  if (n.includes('request') || n.includes('pending') || n.includes('await')) return 'REQUESTED';
  return null;
}
 
function splitList(v) {
  if (!v) return [];
  return String(v)
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
 
const clean = (v) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' ? null : s;
};
 
// -------------------------------------------------------------------------
// Parse a workbook buffer into normalized rows
// -------------------------------------------------------------------------
function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw ApiError.badRequest('The file has no sheets');
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (json.length === 0) throw ApiError.badRequest('The first sheet has no data rows');
 
  const headers = Object.keys(json[0]);
  const hmap = buildHeaderMap(headers);
  if (!hmap.name) {
    throw ApiError.badRequest(
      'Could not find a "Vendor Name" (or Supplier) column. Please use the template headers.'
    );
  }
 
  const rows = json.map((raw, idx) => {
    const get = (field) => (hmap[field] ? raw[hmap[field]] : undefined);
    return {
      _row: idx + 2, // account for header row (1-based, +1)
      name: clean(get('name')),
      designation: clean(get('designation')),
      companyName: clean(get('companyName')),
      phone: clean(get('phone')),
      wechat: clean(get('wechat')),
      email: clean(get('email')),
      city: clean(get('city')),
      region: clean(get('region')),
      country: clean(get('country')),
      stage: clean(get('stage')),
      expoName: clean(get('expoName')),
      expoEdition: clean(get('expoEdition')),
      expoYear: get('expoYear') ? parseInt(String(get('expoYear')).match(/\d{4}/)?.[0] || '', 10) || null : null,
      components: splitList(get('components')),
      categories: splitList(get('categories')),
      communicationRating: parseRating(get('communication')),
      reliabilityRating: parseRating(get('reliability')),
      overallRating: parseRating(get('overall')),
      annualVolume: clean(get('annualVolume')),
      sampleStatus: parseSampleStatus(get('sampleStatus')),
      remarks: clean(get('remarks')),
    };
  });
 
  // Skip fully-empty rows
  const nonEmpty = rows.filter((r) => r.name || r.companyName || r.phone || r.components.length || r.categories.length);
  return { rows: nonEmpty, mappedColumns: Object.keys(hmap), unmapped: headers.filter((h) => !Object.values(hmap).includes(h)) };
}
 
// -------------------------------------------------------------------------
// GET /api/vendors/import/template  → xlsx download
// -------------------------------------------------------------------------
export const downloadTemplate = asyncHandler(async (_req, res) => {
  const ws = XLSX.utils.json_to_sheet([EXAMPLE_ROW], { header: COLUMNS });
  ws['!cols'] = COLUMNS.map((c) => ({ wch: Math.max(14, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="FH-Vendor-Import-Template.xlsx"');
  res.send(buf);
});
 
// -------------------------------------------------------------------------
// POST /api/vendors/import?preview=true  → parse & validate (no writes)
// POST /api/vendors/import               → import rows
// -------------------------------------------------------------------------
export const importVendors = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name "file")');
  const preview = req.query.preview === 'true' || req.query.preview === '1';
 
  const { rows, mappedColumns, unmapped } = parseWorkbook(req.file.buffer);
  if (rows.length === 0) throw ApiError.badRequest('No vendor rows found in the file');
  if (rows.length > 2000) throw ApiError.badRequest('Too many rows (max 2000 per import)');
 
  // Preload existing lookups (lowercased name -> record)
  const [stages, categories, components, expos] = await Promise.all([
    prisma.vendorStage.findMany({ select: { id: true, name: true } }),
    prisma.productCategory.findMany({ select: { id: true, name: true } }),
    prisma.componentTag.findMany({ select: { id: true, name: true } }),
    prisma.expo.findMany({ select: { id: true, name: true, edition: true, year: true } }),
  ]);
  const stageMap = new Map(stages.map((s) => [s.name.toLowerCase(), s]));
  const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const compSet = new Set(components.map((c) => c.name.toLowerCase()));
  const expoKey = (n, e, y) => `${(n || '').toLowerCase()}|${(e || '').toLowerCase()}|${y || ''}`;
  const expoMap = new Map(expos.map((x) => [expoKey(x.name, x.edition, x.year), x]));
 
  // Validate each row
  const analyzed = rows.map((r) => {
    const issues = [];
    if (!r.name) issues.push('Missing vendor name');
    const stageMatched = r.stage ? stageMap.has(r.stage.toLowerCase()) : true;
    if (r.stage && !stageMatched) issues.push(`Unknown stage "${r.stage}" (will be left blank)`);
    const newCategories = r.categories.filter((c) => !catMap.has(c.toLowerCase()));
    const newComponents = r.components.filter((c) => !compSet.has(c.toLowerCase()));
    return { ...r, issues, valid: !!r.name, stageMatched, newCategories, newComponents };
  });
 
  const summary = {
    totalRows: analyzed.length,
    valid: analyzed.filter((r) => r.valid).length,
    invalid: analyzed.filter((r) => !r.valid).length,
    newCategories: [...new Set(analyzed.flatMap((r) => r.newCategories))],
    newComponents: [...new Set(analyzed.flatMap((r) => r.newComponents))],
    mappedColumns,
    ignoredColumns: unmapped,
  };
 
  if (preview) {
    return res.json({
      preview: true,
      summary,
      rows: analyzed.slice(0, 100).map((r) => ({
        row: r._row, name: r.name, companyName: r.companyName, city: r.city,
        stage: r.stage, components: r.components, categories: r.categories,
        overallRating: r.overallRating, valid: r.valid, issues: r.issues,
      })),
    });
  }
 
  // ---- Commit ----
  const created = [];
  const failed = [];
 
  for (const r of analyzed) {
    if (!r.valid) {
      failed.push({ row: r._row, name: r.name, error: r.issues.join('; ') || 'Invalid row' });
      continue;
    }
    try {
      // Resolve categories (create missing, ungrouped)
      const categoryIds = [];
      for (const cname of r.categories) {
        const key = cname.toLowerCase();
        let cat = catMap.get(key);
        if (!cat) {
          cat = await prisma.productCategory.create({ data: { name: cname } });
          catMap.set(key, cat);
        }
        categoryIds.push(cat.id);
      }
 
      // Resolve expo (find or create)
      let expoId = null;
      if (r.expoName) {
        const key = expoKey(r.expoName, r.expoEdition, r.expoYear);
        let expo = expoMap.get(key);
        if (!expo) {
          expo = await prisma.expo.create({
            data: { name: r.expoName, edition: r.expoEdition, year: r.expoYear },
          });
          expoMap.set(key, expo);
        }
        expoId = expo.id;
      }
 
      const stage = r.stage ? stageMap.get(r.stage.toLowerCase()) : null;
 
      await prisma.vendor.create({
        data: {
          name: r.name,
          designation: r.designation,
          companyName: r.companyName,
          phone: r.phone,
          wechat: r.wechat,
          email: r.email,
          city: r.city,
          region: r.region,
          country: r.country || 'China',
          expoId,
          stageId: stage?.id || null,
          communicationRating: r.communicationRating,
          reliabilityRating: r.reliabilityRating,
          overallRating: r.overallRating,
          annualVolume: r.annualVolume,
          sampleStatus: r.sampleStatus,
          remarks: r.remarks,
          createdById: req.user?.id || null,
          components: {
            connectOrCreate: r.components.map((name) => ({ where: { name }, create: { name } })),
          },
          categories: { connect: categoryIds.map((id) => ({ id })) },
        },
      });
      // keep compSet fresh so preview counts stay accurate on subsequent rows
      r.components.forEach((c) => compSet.add(c.toLowerCase()));
      created.push({ row: r._row, name: r.name });
    } catch (e) {
      failed.push({ row: r._row, name: r.name, error: e.message });
    }
  }
 
  res.status(201).json({
    preview: false,
    summary: { ...summary, created: created.length, failed: failed.length },
    created,
    failed,
  });
});
