import { prisma } from '../lib/prisma.js';
 
// Free, no-key FX source (base USD). Docs: https://www.exchangerate-api.com/docs/free
const PRIMARY = 'https://open.er-api.com/v6/latest/USD';
// Fallback (ECB via Frankfurter, base USD)
const FALLBACK = 'https://api.frankfurter.app/latest?from=USD';
 
// Our currency code -> ISO code used by the FX APIs
const API_CODE = { YUAN: 'CNY', RMB: 'CNY' };
const toApiCode = (code) => API_CODE[code] || code;
 
async function fetchUsdRates() {
  // Try primary, then fallback
  try {
    const res = await fetch(PRIMARY, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && (data.result === 'success' || data.rates.INR)) {
        return { rates: data.rates, source: 'open.er-api.com', time: data.time_last_update_utc };
      }
    }
  } catch {
    /* fall through */
  }
  const res = await fetch(FALLBACK, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`FX provider error (${res.status})`);
  const data = await res.json();
  // Frankfurter returns rates relative to USD but excludes USD itself; add it
  const rates = { USD: 1, ...data.rates };
  return { rates, source: 'frankfurter.app', time: data.date };
}
 
/**
 * Compute INR-per-unit for the given currency codes from USD-based rates.
 * inrPerUnit[X] = rates.INR / rates[X]   (rates are units-per-USD)
 */
function computeInrRates(usdRates, codes) {
  const inrPerUsd = Number(usdRates.INR);
  if (!inrPerUsd || Number.isNaN(inrPerUsd)) throw new Error('INR rate unavailable from provider');
  const out = {};
  for (const code of codes) {
    if (code === 'INR') { out[code] = 1; continue; }
    const apiCode = toApiCode(code);
    const perUsd = Number(usdRates[apiCode]);
    if (!perUsd || Number.isNaN(perUsd)) continue; // unknown currency — leave as-is
    out[code] = Number((inrPerUsd / perUsd).toFixed(6));
  }
  return out;
}
 
/**
 * Fetch live rates and update every currency in the DB (INR stays 1).
 * Returns the updated rows + metadata. Throws on provider failure.
 */
export async function refreshCurrencyRates() {
  const currencies = await prisma.currencyRate.findMany();
  if (currencies.length === 0) return { updated: 0, rates: [], source: null };
 
  const { rates: usdRates, source, time } = await fetchUsdRates();
  const inr = computeInrRates(usdRates, currencies.map((c) => c.code));
 
  const results = await prisma.$transaction(
    Object.entries(inr).map(([code, inrPerUnit]) =>
      prisma.currencyRate.update({ where: { code }, data: { inrPerUnit } })
    )
  );
 
  return { updated: results.length, rates: await prisma.currencyRate.findMany({ orderBy: { code: 'asc' } }), source, providerTime: time || null };
}
 
/** Best-effort scheduled refresh (won't crash the server on failure). */
export async function scheduleCurrencyRefresh({ onBoot = true, everyHours = 12 } = {}) {
  const run = async () => {
    try {
      const r = await refreshCurrencyRates();
      // eslint-disable-next-line no-console
      console.log(`💱 Currency rates refreshed from ${r.source} (${r.updated} updated)`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('💱 Currency auto-refresh skipped:', e.message);
    }
  };
  if (onBoot) setTimeout(run, 8000); // slight delay so DB/seed is ready
  setInterval(run, Math.max(1, everyHours) * 60 * 60 * 1000).unref();
}
