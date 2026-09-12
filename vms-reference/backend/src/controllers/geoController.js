import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
 
// ---------------------------------------------------------------------------
// Cascading location masters: Country → State → District
// GET reads stay open to any authenticated user (the vendor form needs them);
// writes are permission-gated in geoRoutes.js.
// ---------------------------------------------------------------------------
 
/* ============================ Countries ============================ */
export const listCountries = asyncHandler(async (req, res) => {
  const withStates = req.query.withStates === 'true' || req.query.withStates === '1';
  const countries = await prisma.country.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { states: true, vendors: true } },
      ...(withStates ? { states: { orderBy: [{ order: 'asc' }, { name: 'asc' }] } } : {}),
    },
  });
  res.json({ countries });
});
 
export const createCountry = asyncHandler(async (req, res) => {
  const country = await prisma.country.create({ data: req.body });
  res.status(201).json({ country });
});
 
export const updateCountry = asyncHandler(async (req, res) => {
  const country = await prisma.country.update({ where: { id: req.params.id }, data: req.body });
  res.json({ country });
});
 
export const deleteCountry = asyncHandler(async (req, res) => {
  // States + districts cascade; vendors keep legacy text (FKs set null).
  await prisma.country.delete({ where: { id: req.params.id } });
  res.json({ message: 'Country deleted' });
});
 
/* ============================ States ============================ */
export const listStates = asyncHandler(async (req, res) => {
  const { countryId } = req.query;
  const states = await prisma.state.findMany({
    where: countryId ? { countryId } : undefined,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { districts: true, vendors: true } } },
  });
  res.json({ states });
});
 
export const createState = asyncHandler(async (req, res) => {
  const state = await prisma.state.create({ data: req.body });
  res.status(201).json({ state });
});
 
export const updateState = asyncHandler(async (req, res) => {
  const state = await prisma.state.update({ where: { id: req.params.id }, data: req.body });
  res.json({ state });
});
 
export const deleteState = asyncHandler(async (req, res) => {
  await prisma.state.delete({ where: { id: req.params.id } });
  res.json({ message: 'State deleted' });
});
 
/* ============================ Districts ============================ */
export const listDistricts = asyncHandler(async (req, res) => {
  const { stateId } = req.query;
  const districts = await prisma.district.findMany({
    where: stateId ? { stateId } : undefined,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { vendors: true } } },
  });
  res.json({ districts });
});
 
export const createDistrict = asyncHandler(async (req, res) => {
  const district = await prisma.district.create({ data: req.body });
  res.status(201).json({ district });
});
 
export const updateDistrict = asyncHandler(async (req, res) => {
  const district = await prisma.district.update({ where: { id: req.params.id }, data: req.body });
  res.json({ district });
});
 
export const deleteDistrict = asyncHandler(async (req, res) => {
  await prisma.district.delete({ where: { id: req.params.id } });
  res.json({ message: 'District deleted' });
});
 
/* ===================== Master mapping tree ===================== */
/** GET /api/geo/tree — nested Country → State → District for the master-mapping view. */
export const geoTree = asyncHandler(async (_req, res) => {
  const countries = await prisma.country.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { vendors: true } },
      states: {
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { vendors: true } },
          districts: {
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { vendors: true } } },
          },
        },
      },
    },
  });
  res.json({ countries });
});
 
// ---------------------------------------------------------------------------
// Bulk upload — Country / State / District spreadsheet
// ---------------------------------------------------------------------------
const GEO_COLUMNS = ['Country', 'State', 'District'];
const GEO_EXAMPLE = [
  { Country: 'India', State: 'Karnataka', District: 'Bengaluru Urban' },
  { Country: 'India', State: 'Karnataka', District: 'Mysuru' },
  { Country: 'India', State: 'Tamil Nadu', District: 'Coimbatore' },
  { Country: 'China', State: 'Zhejiang', District: 'Taizhou' },
];
 
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (v) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' ? null : s;
};
 
const GEO_ALIASES = {
  country: ['country', 'nation'],
  state: ['state', 'province', 'region', 'stateprovince'],
  district: ['district', 'city', 'districtcity', 'town'],
};
 
function buildGeoHeaderMap(headers) {
  const lookup = {};
  for (const [field, aliases] of Object.entries(GEO_ALIASES)) {
    for (const a of aliases) lookup[a] = field;
  }
  const map = {};
  for (const h of headers) {
    const field = lookup[norm(h)];
    if (field && !(field in map)) map[field] = h;
  }
  return map;
}
 
function parseGeoWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw ApiError.badRequest('The file has no sheets');
  const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: false });
  if (json.length === 0) throw ApiError.badRequest('The first sheet has no data rows');
 
  const headers = Object.keys(json[0]);
  const hmap = buildGeoHeaderMap(headers);
  if (!hmap.country) {
    throw ApiError.badRequest('Could not find a "Country" column. Please use the template headers.');
  }
 
  const rows = json.map((raw, idx) => {
    const get = (field) => (hmap[field] ? raw[hmap[field]] : undefined);
    return {
      _row: idx + 2,
      country: clean(get('country')),
      state: clean(get('state')),
      district: clean(get('district')),
    };
  });
  const nonEmpty = rows.filter((r) => r.country || r.state || r.district);
  return { rows: nonEmpty, mappedColumns: Object.keys(hmap), unmapped: headers.filter((h) => !Object.values(hmap).includes(h)) };
}
 
/** GET /api/geo/import/template → xlsx download */
export const geoImportTemplate = asyncHandler(async (_req, res) => {
  const ws = XLSX.utils.json_to_sheet(GEO_EXAMPLE, { header: GEO_COLUMNS });
  ws['!cols'] = GEO_COLUMNS.map((c) => ({ wch: Math.max(16, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Locations');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="FH-Location-Import-Template.xlsx"');
  res.send(buf);
});
 
/**
 * POST /api/geo/import?preview=true → parse & report (no writes)
 * POST /api/geo/import              → find-or-create the Country/State/District hierarchy
 */
export const geoImport = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name "file")');
  const preview = req.query.preview === 'true' || req.query.preview === '1';
 
  const { rows, mappedColumns, unmapped } = parseGeoWorkbook(req.file.buffer);
  if (rows.length === 0) throw ApiError.badRequest('No location rows found in the file');
  if (rows.length > 10000) throw ApiError.badRequest('Too many rows (max 10000 per import)');
 
  // Preload existing masters (case-insensitive keys).
  const [countries, states, districts] = await Promise.all([
    prisma.country.findMany({ select: { id: true, name: true } }),
    prisma.state.findMany({ select: { id: true, name: true, countryId: true } }),
    prisma.district.findMany({ select: { id: true, name: true, stateId: true } }),
  ]);
  const countryMap = new Map(countries.map((c) => [c.name.toLowerCase(), c]));
  const stateMap = new Map(states.map((s) => [`${s.countryId}|${s.name.toLowerCase()}`, s]));
  const districtMap = new Map(districts.map((d) => [`${d.stateId}|${d.name.toLowerCase()}`, d]));
 
  const counts = { countries: 0, states: 0, districts: 0 };
  const newCountries = new Set();
  const newStates = new Set();
  const newDistricts = new Set();
  const failed = [];
 
  // Analyze/commit row by row (find-or-create the chain).
  for (const r of rows) {
    if (!r.country) {
      failed.push({ row: r._row, error: 'Missing country' });
      continue;
    }
    try {
      // Country
      const ckey = r.country.toLowerCase();
      let country = countryMap.get(ckey);
      if (!country) {
        if (preview) {
          country = { id: `new:${ckey}` }; // synthetic so nested rows still count
          newCountries.add(r.country);
        } else {
          country = await prisma.country.create({ data: { name: r.country } });
        }
        countryMap.set(ckey, country);
        counts.countries++;
      }
 
      if (!r.state) continue;
      const skey = `${country.id}|${r.state.toLowerCase()}`;
      let state = stateMap.get(skey);
      if (!state) {
        if (preview) {
          state = { id: `new:${skey}` };
          newStates.add(`${r.country} › ${r.state}`);
        } else {
          state = await prisma.state.create({ data: { name: r.state, countryId: country.id } });
        }
        stateMap.set(skey, state);
        counts.states++;
      }
 
      if (!r.district) continue;
      const dkey = `${state.id}|${r.district.toLowerCase()}`;
      if (!districtMap.get(dkey)) {
        if (preview) {
          districtMap.set(dkey, { id: `new:${dkey}` });
          newDistricts.add(`${r.state} › ${r.district}`);
        } else {
          const district = await prisma.district.create({ data: { name: r.district, stateId: state.id } });
          districtMap.set(dkey, district);
        }
        counts.districts++;
      }
    } catch (e) {
      failed.push({ row: r._row, error: e.message });
    }
  }
 
  const summary = {
    totalRows: rows.length,
    newCountries: counts.countries,
    newStates: counts.states,
    newDistricts: counts.districts,
    mappedColumns,
    ignoredColumns: unmapped,
    failed: failed.length,
  };
 
  if (preview) {
    return res.json({
      preview: true,
      summary,
      sample: {
        countries: [...newCountries].slice(0, 50),
        states: [...newStates].slice(0, 50),
        districts: [...newDistricts].slice(0, 50),
      },
      failed: failed.slice(0, 50),
    });
  }
 
  res.status(201).json({ preview: false, summary, failed });
});
