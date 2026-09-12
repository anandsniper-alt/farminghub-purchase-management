from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'; OUT.mkdir(exist_ok=True)
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':1000})
    pg.set_default_timeout(5000)
    pg.on('pageerror',lambda e:report['errors'].append(str(e)))
    pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
    pg.set_content((ROOT/'Farming_Hub_Purchase_Management_Clean_Review.html').read_text(),wait_until='load')
    pg.wait_for_selector('h1')
    def check(name, fn):
        try:
            fn(); report['checks'].append({'name':name,'result':'PASS'}); print('PASS',name)
        except Exception as e:
            report['checks'].append({'name':name,'result':'FAIL','detail':str(e)}); print('FAIL',name,e); pg.screenshot(path=str(OUT/'clean_failure.png'),full_page=True)
    def nav(view):
        pg.locator(f'.sidebar [data-to="{view}"]').click(); pg.wait_for_timeout(80)
    check('Clean workspace banner renders', lambda: pg.get_by_text('Clean test workspace:', exact=False).wait_for())
    def overview_zero():
        txt=pg.locator('main').inner_text()
        assert 'Active purchase orders\n0' in txt
        assert 'In production\n0' in txt
        assert 'Containers in transit\n0' in txt
        assert 'Critical flags\n0' in txt
    check('Overview starts at zero business activity', overview_zero)
    def clean_views():
        for view in ['orders','vendors','prices','plm','items','payments','shipments','documents']:
            nav(view)
            text=pg.locator('main').inner_text()
            assert 'DEMO-LAE' not in text
            assert 'Demo supplier' not in text
    check('All business modules render without seeded records', clean_views)
    def add_vendor():
        nav('vendors')
        pg.get_by_role('button',name='Add vendor',exact=True).click()
        pg.locator('[name=code]').fill('TEST-V001')
        pg.locator('[name=name]').fill('Test Supplier')
        pg.locator('[name=productionDays]').fill('30')
        pg.get_by_role('button',name='Save',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        assert 'TEST-V001' in pg.locator('main').inner_text()
    check('Clean build accepts first manually entered vendor', add_vendor)
    pg.screenshot(path=str(OUT/'clean_overview.png'),full_page=True)
    report['passed']=sum(x['result']=='PASS' for x in report['checks']); report['failed']=sum(x['result']=='FAIL' for x in report['checks'])
    (OUT/'clean-browser-results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2))
    b.close()
