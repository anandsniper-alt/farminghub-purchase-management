import test from 'node:test';import assert from 'node:assert/strict';
import {formatCell,cellPosition,localPart} from '../web/xlsx-preview.mjs';
test('Excel references preserve sparse column positions and reject malformed ranges',()=>{
 assert.deepEqual(cellPosition('$AA$105'),{c:26,r:104});assert.equal(cellPosition('A0'),null);assert.equal(cellPosition('A1:B3'),null);
});
test('Excel currency and percentage previews use cached values without changing precision',()=>{
 assert.equal(formatCell('91170','"￥"#,##0.00_);[Red]\\("￥"#,##0.00\\)'),'￥91,170.00');
 assert.equal(formatCell('-91170','"￥"#,##0.00_);[Red]\\("￥"#,##0.00\\)'),'(￥91,170.00)');
 assert.equal(formatCell('453.6','\\$#,##0.0;\\-\\$#,##0.0'),'$453.6');
 assert.equal(formatCell('0.125','0.00%'),'12.50%');assert.equal(formatCell('=HYPERLINK("https://example.com")'),'=HYPERLINK("https://example.com")');
 assert.equal(formatCell('12345.67','0.00E+00'),'12345.67');
});
test('Excel date display handles both date systems, leap-year compatibility and time',()=>{
 assert.equal(formatCell('1','mm-dd-yy'),'01-01-00');assert.equal(formatCell('60','mm-dd-yy'),'02-29-00');
 assert.equal(formatCell('61','d-mmm-yy'),'1-Mar-00');assert.equal(formatCell('0','yyyy-mm-dd',true),'1904-01-01');
 assert.equal(formatCell('0.75','h:mm AM/PM'),'6:00 PM');assert.equal(formatCell('61.5','m/d/yy h:mm'),'3/1/00 12:00');
});
test('Excel drawing relationships stay inside the local workbook',()=>{
 assert.equal(localPart('xl/drawings/drawing1.xml','../media/image1.png'),'xl/media/image1.png');
 for(const path of ['https://example.com/pic.png','../../secret.png','../../../xl/media/x.png','..\\media\\x.png','/outside.png'])assert.equal(localPart('xl/drawings/drawing1.xml',path),null);
 assert.equal(localPart('xl/workbook.xml','/xl/worksheets/sheet1.xml'),'xl/worksheets/sheet1.xml');
});
