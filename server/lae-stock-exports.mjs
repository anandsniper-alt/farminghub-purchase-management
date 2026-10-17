import {buildTableReport} from './table-report-export.mjs';
import {LAE_STOCK_MAX_ROWS} from '../shared/lae-stock-costing.mjs';
const stockExportScript=new URL('./lae-stock-export.py',import.meta.url);
export const buildLaeStockXlsx=report=>buildTableReport(report,'xlsx',stockExportScript,LAE_STOCK_MAX_ROWS);
export const buildLaeStockPdf=report=>buildTableReport(report,'pdf',stockExportScript,5000);
