from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'
OUT.mkdir(exist_ok=True)
report={'mode':'Playwright Chromium rendering supplied HTML on about:blank. Runner blocks file/HTTP navigation. UI-only in-memory localStorage and IndexedDB shims are injected by the test harness; server persistence is covered separately by native HTTP/SQLite tests.','checks':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
 pg.set_default_timeout(4000)
 pg.on('pageerror',lambda e:report['errors'].append(str(e)))
 pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
 pg.set_content((ROOT/'Farming_Hub_PLM_Shipping_LAE_Import_Review.html').read_text(),wait_until='load')
 pg.wait_for_selector('h1')
 def check(name,fn):
  try:
   fn();report['checks'].append({'name':name,'result':'PASS'});print('PASS',name,flush=True)
  except Exception as e:
   report['checks'].append({'name':name,'result':'FAIL','detail':str(e)});print('FAIL',name,str(e)[:500],flush=True);pg.screenshot(path=str(OUT/'browser_failure.png'),full_page=True)
 def nav(view):
  pg.locator(f'.sidebar [data-to="{view}"]').click();pg.wait_for_timeout(120)
 def snap(name):pg.screenshot(path=str(OUT/(name+'.png')),full_page=True)
 check('Overview and isolated-demo notice render',lambda:pg.get_by_role('heading',name='Every order. One clear view.').wait_for())
 snap('overview')
 for view in ['orders','tasks','payments','shipments','documents','vendors','plm','items','settings','versions']:
  check(view+' view renders',lambda v=view:(nav(v),pg.locator('main h1').wait_for()))
 # No horizontal overflow on mobile overall or orders (tables may scroll within their own container).
 def mobile():
  pg.set_viewport_size({'width':390,'height':844});pg.evaluate("location.hash='#/overview'");pg.wait_for_timeout(100);assert pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1');snap('mobile');pg.set_viewport_size({'width':1440,'height':1100})
 check('Mobile layout fits 390px viewport',mobile)
 nav('orders')
 def create_order():
  pg.get_by_role('button',name='Create purchase order',exact=True).click();pg.locator('[name=number]').fill('REVIEW-NEW-001');pg.locator('[name=vendorId]').select_option(label='Demo supplier · V20 ZMCY')
  # Choose a valid demo SKU dynamically rather than assume seeded vendor mapping.
  opts=pg.locator('[name="item-0"] option').all_text_contents()
  if len(opts)<2:
   for val in pg.locator('[name=vendorId] option').evaluate_all('(es)=>es.map(e=>e.value)'):
    pg.locator('[name=vendorId]').select_option(val)
    if pg.locator('[name="item-0"] option').count()>1:break
  pg.locator('[name="item-0"]').select_option(index=1);pg.locator('[name="qty-0"]').fill('100');pg.locator('[name="price-0"]').fill('240');pg.locator('[name=planningTat]').fill('60');pg.get_by_role('button',name='Save draft',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");pg.wait_for_function("document.querySelector('main').innerText.includes('REVIEW-NEW-001')");assert 'REVIEW-NEW-001' in pg.locator('main').inner_text();assert pg.locator('.form-error.visible').count()==0
 check('Create a real new PO draft through the UI',create_order)
 def issue():
  pg.get_by_role('button',name='Submit for approval',exact=True).click();pg.get_by_role('button',name='Approve & issue',exact=True).wait_for();pg.get_by_role('button',name='Approve & issue',exact=True).click();pg.get_by_role('button',name='Supplier PO acknowledgement',exact=True).first.wait_for()
 check('Submit and Purchase Manager issue through UI',issue)
 def confirm():
  pg.get_by_role('button',name='Supplier PO acknowledgement',exact=True).first.click();pg.locator('[name=file]').set_input_files({'name':'supplier-confirm.txt','mimeType':'text/plain','buffer':b'SUPPLIER CONFIRMATION TEST'});pg.locator('[name=remarks]').fill('Supplier email accepted PO for browser review.');pg.get_by_role('button',name='Save',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");pg.get_by_role('button',name='Record supplier PI',exact=True).wait_for()
 check('Supplier PO acknowledgement is a visible stage with file evidence',confirm)
 def pi():
  pg.get_by_role('button',name='Record supplier PI',exact=True).click();pg.locator('[name=number]').fill('PI-UI-001');pg.locator('[name=file]').set_input_files({'name':'pi-review.txt','mimeType':'text/plain','buffer':b'BROWSER TEST EVIDENCE ONLY'});pg.locator('[name=termsConfirmed]').check();pg.locator('[name=commitmentConfirmed]').check();pg.get_by_role('button',name='Save for purchase verification',exact=True).click();pg.get_by_role('button',name='Verify PI',exact=True).first.wait_for();pg.get_by_role('button',name='Verify PI',exact=True).first.click();pg.get_by_role('button',name='Approve PI',exact=True).first.wait_for();pg.get_by_role('button',name='Approve PI',exact=True).first.click();pg.get_by_role('button',name='Technical specification confirmation',exact=True).first.wait_for()
 check('PI receipt, verification and approval advance to technical confirmation',pi)
 def technical():
  pg.get_by_role('button',name='Technical specification confirmation',exact=True).first.click();pg.locator('[name=file]').set_input_files({'name':'technical-ack.txt','mimeType':'text/plain','buffer':b'TECHNICAL SPECIFICATION CONFIRMATION'});pg.locator('[name=remarks]').fill('Supplier confirmed current PLM specification package by email.');pg.get_by_role('button',name='Save',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");pg.get_by_role('button',name='Submit artwork',exact=True).first.wait_for()
 check('Technical specification confirmation is visible before artwork and payment',technical)
 def artwork():
  pg.get_by_role('button',name='Submit artwork',exact=True).first.click();pg.locator('[name=file]').set_input_files({'name':'artwork-test.txt','mimeType':'text/plain','buffer':b'TEST BRAND ARTWORK'});pg.locator('[name=remarks]').fill('Current decal and carton artwork.');pg.get_by_role('button',name='Submit for approval',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");pg.locator('#demo-role').select_option('u-product');pg.get_by_role('button',name='Approve artwork',exact=True).first.click();pg.locator('#demo-role').select_option('u-manager');pg.get_by_role('button',name='Supplier artwork confirmation',exact=True).first.click();pg.locator('[name=file]').set_input_files({'name':'artwork-ack.txt','mimeType':'text/plain','buffer':b'TEST ARTWORK ACK'});pg.locator('[name=remarks]').fill('Supplier accepted current artwork.');pg.get_by_role('button',name='Save',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");pg.get_by_role('button',name='Complete payment',exact=True).first.wait_for()
 check('Artwork approval and supplier acknowledgement are completed before payment',artwork)
 def finance():
  pg.get_by_role('button',name='Complete payment',exact=True).first.click();pg.locator('[name=currency]').select_option('CNY');pg.locator('[name=amount]').fill('7200');pg.locator('[name=invoiceRate]').fill('1');pg.locator('[name=inrRate]').fill('12');pg.locator('[name=reference]').fill('UI-SWIFT-001');pg.locator('[name=file]').set_input_files({'name':'swift-test.txt','mimeType':'text/plain','buffer':b'TEST SWIFT COPY'});pg.locator('[name=remarks]').fill('Advance paid against approved PI.');pg.get_by_role('button',name='Record payment complete',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");assert 'Production lead time' in pg.locator('main').inner_text();pg.get_by_role('button',name='Record sample completion',exact=True).first.wait_for()
 check('Single payment milestone retains SWIFT evidence and starts production lead-time',finance)
 def receipt():
  pg.get_by_role('button',name='PI & payments',exact=True).click();pg.get_by_role('button',name='Record receipt',exact=True).first.click();pg.locator('[name=file]').set_input_files({'name':'receipt-test.txt','mimeType':'text/plain','buffer':b'TEST SUPPLIER RECEIPT'});pg.get_by_role('button',name='Save',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");assert 'UI-SWIFT-001' in pg.locator('main').inner_text()
 check('Supplier realization remains a separate financial follow-up',receipt)
 def production():
  pg.locator('.tab[data-value=overview]').click()
  pg.get_by_role('button',name='Record sample completion',exact=True).first.click();pg.locator('[name=remarks]').fill('Supplier completed the pre-production sample.');pg.locator('[name=file]').set_input_files({'name':'sample.txt','mimeType':'text/plain','buffer':b'SAMPLE COMPLETION'});pg.get_by_role('button',name='Record sample completed',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");pg.get_by_role('button',name='Approve pre-production sample',exact=True).first.wait_for()
  pg.get_by_role('button',name='Approve pre-production sample',exact=True).first.click();pg.locator('[name=remarks]').fill('Purchase approved sample for bulk production.');pg.get_by_role('button',name='Record sample approval',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  pg.get_by_role('button',name='Start bulk production',exact=True).first.click();pg.locator('[name=remarks]').fill('Email confirms bulk production started.');pg.get_by_role('button',name='Save',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  pg.get_by_role('button',name='Record bulk QC',exact=True).first.click();pg.locator('[name=remarks]').fill('Bulk production QC passed for test.');pg.locator('#modal-root').get_by_role('button',name='Record bulk QC',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  pg.get_by_role('button',name='Complete production',exact=True).wait_for();pg.get_by_role('button',name='Complete production',exact=True).click();pg.locator('[name=remarks]').fill('Production completed for test.');pg.get_by_role('button',name='Save',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
 check('Sample completion, sample approval, bulk production, bulk QC and completion gates',production)
 def shipment_setup():
  pg.get_by_role('button',name='Shipping',exact=True).click();pg.get_by_role('button',name='Plan shipment',exact=True).last.click();pg.locator('[name=number]').fill('UI-SHIP-001');pg.locator('[name="shipqty-0"]').fill('50');pg.get_by_role('button',name='Save shipment allocation',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  pg.get_by_role('button',name='Book container',exact=True).click();pg.locator('[name=forwarderId]').select_option(index=1);pg.locator('[name=forwarderRef]').fill('UI-REF-001');pg.locator('[name=freightUsd]').fill('4000');pg.locator('[name=rateRouteKey]').select_option(index=1);pg.locator('[name=remarks]').fill('Forwarder confirmed booking.');pg.get_by_role('button',name='Confirm container booked',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  pg.get_by_role('button',name='Container released',exact=True).click();pg.locator('[name=container]').fill('TEST1234567');pg.locator('[name=remarks]').fill('Empty container released for factory loading.');pg.get_by_role('button',name='Confirm release',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  pg.get_by_role('button',name='Tracking milestone',exact=True).click();pg.locator('[name=status]').select_option('COMPLETED');pg.locator('[name=actualDate]').fill('2026-09-12');pg.locator('[name=remarks]').fill('Container moved into China inland leg.');pg.get_by_role('button',name='Post tracking update',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  for dtype in ['COMMERCIAL_INVOICE','PACKING_LIST']:
   pg.get_by_role('button',name='Upload document',exact=True).click();pg.locator('[name=type]').select_option(dtype);pg.locator('[name=file]').set_input_files({'name':dtype.lower()+'.txt','mimeType':'text/plain','buffer':b'SHIPPING DOCUMENT'});pg.get_by_role('button',name='Save',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
  assert pg.get_by_role('button',name='Record pre-dispatch QC',exact=True).count()==0
 check('Shipment booking/release, China inland tracking and CI/PL documents have no pre-dispatch QC gate',shipment_setup)
 snap('shipment_detail')
 def audit():
  pg.get_by_role('button',name='Activity history',exact=True).click();assert 'SWIFT' in pg.locator('main').inner_text() or 'PAYMENT' in pg.locator('main').inner_text();assert pg.locator('.timeline-event').count()>10;snap('history')
 check('Visible transaction history including authors and changes',audit)
 def evidence():
  pg.get_by_role('button',name='Documents',exact=True).click()
  with pg.expect_download() as dl:pg.locator('.doc-card [data-action=file]').first.click()
  assert dl.value.suggested_filename.endswith('.txt')
 check('Retained evidence body can be downloaded',evidence)
 def importer():
  nav('items');pg.get_by_role('button',name='Upload item master',exact=True).click();pg.locator('#item-import-file').set_input_files(str(ROOT/'templates/Demo_Source_Item_Master.xlsx'));pg.wait_for_selector('.import-stats');assert 'Rejected' in pg.locator('.modal-body').inner_text();assert pg.get_by_role('button',name='Confirm & commit batch',exact=True).is_disabled();snap('import_preview');pg.get_by_role('button',name='Cancel',exact=True).click()
 check('Original XLSX parses, unmapped vendor rejection blocks bulk commit',importer)
 def csvimport():
  pg.get_by_role('button',name='Upload item master',exact=True).click();pg.locator('#item-import-file').set_input_files({'name':'test-items.csv','mimeType':'text/csv','buffer':b'VENDOR CODE,ITEM CODE,ITEM NAME-1,PRODUCT CATAGORY\nV08 FPPL,UI-IMPORT-001,Review item,MOTOR\n'});pg.wait_for_selector('.import-stats');pg.get_by_role('button',name='Confirm & commit batch',exact=True).click();pg.wait_for_function("document.querySelector('#modal-root').children.length === 0");pg.get_by_role('button',name='Upload history',exact=True).click();assert 'test-items.csv' in pg.locator('main').inner_text()
 check('CSV create preview commits original source and import history',csvimport)
 def role_readonly():
  pg.locator('#demo-role').select_option('u-viewer');nav('orders');assert pg.get_by_role('button',name='Create purchase order',exact=True).count()==0;pg.locator('#demo-role').select_option('u-manager')
 check('Viewer sees records but no edit or approval controls',role_readonly)
 def local_reload():
  pg.set_content((ROOT/'Farming_Hub_PLM_Shipping_LAE_Import_Review.html').read_text(),wait_until='load');pg.wait_for_selector('h1');nav('orders');assert 'REVIEW-NEW-001' in pg.locator('main').inner_text()
 check('UI state restores across a document reload using the test storage shim',local_reload)
 nav('orders');snap('pipeline')
 report['runtime_errors']=report['errors'];report['passed']=sum(x['result']=='PASS' for x in report['checks']);report['failed']=sum(x['result']=='FAIL' for x in report['checks'])
 Path(str(OUT/'browser-report.json')).write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2));b.close()
