from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'
OUT.mkdir(exist_ok=True)
HTML=ROOT/'Farming_Hub_PLM_Shipping_LAE_Import_Review.html'
TRACK=Path('/mnt/data/VJ Report 08.09.2026.xlsx')
RATE=Path('/mnt/data/VJ MATERIALS MART WEEKLY BUY RATE SHEET WEEK 36.xlsx')
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':1100})
    pg.set_default_timeout(6000)
    pg.on('pageerror',lambda e:report['errors'].append(str(e)))
    pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
    pg.set_content(HTML.read_text(),wait_until='load')
    pg.wait_for_selector('h1')
    def check(name,fn):
        try:
            fn(); report['checks'].append({'name':name,'result':'PASS'}); print('PASS',name,flush=True)
        except Exception as e:
            report['checks'].append({'name':name,'result':'FAIL','detail':str(e)}); print('FAIL',name,str(e)[:700],flush=True); pg.screenshot(path=str(OUT/'shipping_failure.png'),full_page=True)
    def nav(view):
        pg.locator(f'.sidebar [data-to="{view}"]').click(); pg.wait_for_timeout(150)
    def snap(name): pg.screenshot(path=str(OUT/(name+'.png')),full_page=True)
    def dashboard():
        nav('shipments')
        pg.get_by_role('heading',name='Shipping & freight control').wait_for()
        text=pg.locator('main').inner_text()
        assert 'Container tracking' in text and 'Weekly freight rates' in text and 'Freight trends' in text
        assert 'Forwarder Ref' in text
        assert 'Freight warning' in text
        assert 'Baseline' in text and 'current ETA' in text
        snap('shipping_dashboard')
    check('Shipping dashboard renders Ref tracking, baseline/current dates and freight warning',dashboard)
    def rates():
        pg.get_by_role('button',name='Weekly freight rates',exact=True).click(); pg.wait_for_timeout(120)
        text=pg.locator('main').inner_text()
        for x in ['NINGBO','QINGDAO','SHENZHEN','CHONGQING']:
            assert x in text
        assert '3,800' in text and '4,600' in text and '4,500' in text
        snap('freight_rates')
    check('User Week-36 freight benchmarks appear as five route rates',rates)
    def rate_import():
        pg.get_by_role('button',name='Upload weekly rate sheet',exact=True).click()
        pg.locator('#rate-import-file').set_input_files(str(RATE))
        pg.wait_for_selector('.import-stats')
        body=pg.locator('.modal-body').inner_text()
        assert 'Rows' in body and '5' in body and 'READY' in body
        assert 'NINGBO' in body and 'CHONGQING' in body
        snap('freight_rate_import_preview')
        pg.get_by_role('button',name='Cancel',exact=True).click()
    check('Actual VJ Week-36 XLSX parses in browser import preview',rate_import)
    def tracking_import():
        pg.get_by_role('button',name='Container tracking',exact=True).click(); pg.wait_for_timeout(100)
        pg.get_by_role('button',name='Upload weekly tracking Excel',exact=True).click()
        pg.locator('#tracking-import-file').set_input_files(str(TRACK))
        pg.wait_for_selector('.import-stats')
        body=pg.locator('.modal-body').inner_text()
        assert 'Ref' in body and 'Status' in body
        # Real forwarder refs do not belong to demo seeded shipments, so unmatched is expected.
        assert 'UNMATCHED' in body or 'Unmatched' in body or 'No shipment match' in body
        snap('tracking_import_preview')
        pg.get_by_role('button',name='Cancel',exact=True).click()
    check('Actual VJ weekly tracking XLSX parses and shows safe Ref-match preview',tracking_import)
    def order_shipping():
        nav('orders')
        pg.locator('tr.row-click',has_text='DEMO-LAE-1003').click(); pg.wait_for_timeout(120)
        pg.get_by_role('button',name='Shipping',exact=True).click(); pg.wait_for_timeout(100)
        text=pg.locator('main').inner_text()
        assert 'Forwarder Ref' in text and 'Container' in text
        assert 'BL draft' in text and 'Insurance' in text
        assert 'Loaded on vessel' in text and 'Tracking milestone' in text
        assert 'PRE-DISPATCH QC' not in text.upper()
        snap('shipment_compliance')
    check('Order shipping card shows booking/release, CI/PL, optional BL-draft and post-vessel insurance controls',order_shipping)
    def completed_vessel():
        nav('orders')
        pg.locator('tr.row-click',has_text='DEMO-LAE-1001').click(); pg.wait_for_timeout(100)
        pg.get_by_role('button',name='Shipping',exact=True).click(); pg.wait_for_timeout(100)
        text=pg.locator('main').inner_text()
        assert 'DEMO VESSEL' in text and 'DEMO-001' in text
        assert 'Loaded on vessel' in text and 'Insurance' in text and 'Completed' in text
        assert 'Final BL' in text
    check('Loaded-on-vessel record requires and displays vessel/voyage plus compliance',completed_vessel)
    def docs():
        nav('documents')
        text=pg.locator('main').inner_text()
        assert 'BULK QC PENDING' in text.upper() and 'PRE-VESSEL DOCS PENDING' in text.upper() and 'INSURANCE' in text.upper()
    check('Document dashboard exposes bulk QC, pre-vessel CI/PL and post-vessel BL/insurance gates',docs)
    report['passed']=sum(x['result']=='PASS' for x in report['checks'])
    report['failed']=sum(x['result']=='FAIL' for x in report['checks'])
    report['runtime_errors']=report['errors']
    (OUT/'shipping-browser-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2))
    b.close()
