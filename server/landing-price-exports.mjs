import {buildTableReport} from './table-report-export.mjs';
import {LANDING_PRICE_EXPORT_LIMIT} from '../shared/landing-prices.mjs';
const landingExportScript=new URL('./landing-price-export.py',import.meta.url);
export const buildLandingPricesXlsx=report=>buildTableReport(report,'xlsx',landingExportScript,LANDING_PRICE_EXPORT_LIMIT);
export const buildLandingPricesPdf=report=>buildTableReport(report,'pdf',landingExportScript,LANDING_PRICE_EXPORT_LIMIT);
