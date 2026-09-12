from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'; OUT.mkdir(exist_ok=True)
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1540,'height':1100})
    pg.set_default_timeout(8000)
    pg.on('pageerror',lambda e:report['errors'].append(str(e)))
    pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
    pg.set_content((ROOT/'Farming_Hub_Purchase_Management_Clean_Review.html').read_text(),wait_until='load')
    pg.wait_for_selector('h1')
    def check(name,fn):
        try:
            fn(); report['checks'].append({'name':name,'result':'PASS'}); print('PASS',name,flush=True)
        except Exception as e:
            report['checks'].append({'name':name,'result':'FAIL','detail':str(e)}); print('FAIL',name,str(e)[:1000],flush=True); pg.screenshot(path=str(OUT/'v060_failure.png'),full_page=True)
    def nav(view):
        pg.locator(f'.sidebar [data-to="{view}"]').click(); pg.wait_for_timeout(180)
    def masters():
        nav('items')
        text=pg.locator('main').inner_text()
        assert 'Base Item Master' in text and '129' in text
        assert 'BS20' in text
        pg.get_by_role('button',name='ERP Item Codes',exact=True).click(); pg.wait_for_timeout(120)
        text=pg.locator('main').inner_text()
        assert 'GJ-BS20' in text and 'KD-BS20' in text and 'TT-BS20' in text
    check('129 base items and generated GJ/KD/TT ERP Item Codes render',masters)
    def price_list():
        nav('prices'); text=pg.locator('main').inner_text()
        assert 'Base Item Code' in text and 'BS20' in text
        assert 'USD' in text
    check('Base-product supplier price list renders only final master items',price_list)
    def base_first_po():
        nav('orders'); pg.get_by_role('button',name='Create purchase order',exact=True).click()
        pg.locator('[name=number]').fill('BASE-PLAN-001')
        pg.locator('[name=vendorId]').select_option('vendor-v30'); pg.wait_for_timeout(100)
        pg.locator('[name="base-0"]').select_option('base-bs20'); pg.wait_for_timeout(120)
        assert pg.locator('[name="qty-0-GJ"]').is_visible()
        assert 'GJ-BS20' in pg.locator('.modal-body').inner_text()
        pg.locator('[name="qty-0-GJ"]').fill('50')
        pg.locator('[name="qty-0-KD"]').fill('30')
        pg.locator('[name=planningTat]').fill('75')
        pg.get_by_role('button',name='Save draft',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        pg.get_by_role('button',name='Items & artwork',exact=True).click(); pg.wait_for_timeout(120)
        text=pg.locator('main').inner_text()
        assert 'GJ-BS20' in text and 'KD-BS20' in text and 'TT-BS20' not in text
        assert '50' in text and '30' in text
        pg.screenshot(path=str(OUT/'base_first_po.png'),full_page=True)
    check('PO starts from Base Item and expands positive brand quantities into ERP Item Code lines',base_first_po)
    def complaints():
        nav('plm'); pg.get_by_role('button',name='Complaints',exact=True).click(); pg.wait_for_timeout(100)
        pg.get_by_role('button',name='Add complaint',exact=True).click()
        pg.locator('[name=itemId]').select_option('erp-gj-bs20')
        pg.locator('[name=severity]').select_option('MAJOR')
        pg.locator('[name=summary]').fill('Browser test complaint')
        pg.locator('[name=remarks]').fill('Recorded against GJ ERP code; should roll up to BS20.')
        pg.get_by_role('button',name='Save complaint',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        text=pg.locator('main').inner_text()
        assert 'BS20' in text and '1' in text and 'major' in text.lower()
        pg.screenshot(path=str(OUT/'complaint_rollup.png'),full_page=True)
    check('ERP-item complaint rolls up to Base Item Code in PLM',complaints)
    def freight():
        nav('shipments'); pg.get_by_role('button',name='Weekly freight rates',exact=True).click(); pg.wait_for_timeout(100)
        text=pg.locator('main').inner_text()
        assert '3,920' in text and '3,800' in text and '120' in text
        assert '4,720' in text and '4,620' in text
        pg.get_by_role('button',name='Freight trends',exact=True).click(); pg.wait_for_timeout(100)
        text=pg.locator('main').inner_text()
        assert 'RISING' in text and 'FALLING' in text
        pg.screenshot(path=str(OUT/'freight_benchmark_trends.png'),full_page=True)
    check('Freight history shows agent-charge-adjusted latest benchmarks and trends',freight)
    assert not report['errors'], report['errors']
    report['passed']=sum(x['result']=='PASS' for x in report['checks']); report['failed']=sum(x['result']=='FAIL' for x in report['checks'])
    (OUT/'v060-browser-results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2))
    b.close()
