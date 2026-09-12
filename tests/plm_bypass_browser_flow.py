from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'; OUT.mkdir(exist_ok=True)
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1540,'height':1100})
    pg.set_default_timeout(10000)
    pg.on('pageerror',lambda e:report['errors'].append(str(e)))
    pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
    pg.set_content((ROOT/'Farming_Hub_Purchase_Management_Clean_Review.html').read_text(),wait_until='load')
    pg.wait_for_selector('h1')
    def check(name,fn):
        try:
            fn(); report['checks'].append({'name':name,'result':'PASS'}); print('PASS',name,flush=True)
        except Exception as e:
            report['checks'].append({'name':name,'result':'FAIL','detail':str(e)}); print('FAIL',name,str(e)[:1200],flush=True); pg.screenshot(path=str(OUT/'plm_bypass_failure.png'),full_page=True)
    def nav(view):
        pg.locator(f'.sidebar [data-to="{view}"]').click(); pg.wait_for_timeout(180)
    def run_flow():
        nav('orders')
        pg.get_by_role('button',name='Create purchase order',exact=True).click()
        pg.locator('[name=number]').fill('PLM-WARN-001')
        pg.locator('[name=vendorId]').select_option('vendor-v30'); pg.wait_for_timeout(100)
        pg.locator('[name="base-0"]').select_option('base-bs20'); pg.wait_for_timeout(120)
        modal=pg.locator('.modal-body').inner_text()
        assert 'PLM specification not available' in modal
        assert 'No approved PLM' in modal
        pg.locator('[name="qty-0-GJ"]').fill('10')
        pg.locator('[name="baseprice-0"]').fill('14')
        pg.locator('[name=planningTat]').fill('75')
        pg.get_by_role('button',name='Save draft',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        text=pg.locator('main').inner_text()
        assert 'PLM specification not available' in text
        pg.get_by_role('button',name='Submit for approval',exact=True).click(); pg.wait_for_timeout(150)
        assert pg.get_by_role('button',name='Approve & issue',exact=True).is_visible()
        assert 'PLM specification not available' in pg.locator('main').inner_text()
        pg.get_by_role('button',name='Approve & issue',exact=True).click(); pg.wait_for_timeout(150)
        text=pg.locator('main').inner_text()
        assert 'Supplier PO acknowledgement' in text
        assert 'PLM specification not available' in text
        pg.screenshot(path=str(OUT/'plm_bypass_warning.png'),full_page=True)
    check('PO with no approved PLM submits and issues with persistent warning',run_flow)
    assert not report['errors'], report['errors']
    report['passed']=sum(x['result']=='PASS' for x in report['checks']); report['failed']=sum(x['result']=='FAIL' for x in report['checks'])
    (OUT/'plm-bypass-browser-results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2))
    b.close()
