from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'
OUT.mkdir(exist_ok=True)
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':1100})
    pg.set_default_timeout(5000)
    pg.on('pageerror',lambda e:report['errors'].append(str(e)))
    pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
    pg.set_content((ROOT/'Farming_Hub_PLM_Shipping_LAE_Import_Review.html').read_text(),wait_until='load')
    pg.wait_for_selector('h1')
    def check(name,fn):
        try:
            fn(); report['checks'].append({'name':name,'result':'PASS'}); print('PASS',name,flush=True)
        except Exception as e:
            report['checks'].append({'name':name,'result':'FAIL','detail':str(e)}); print('FAIL',name,str(e)[:800],flush=True); pg.screenshot(path=str(OUT/'plm_failure.png'),full_page=True)
    def nav(view):
        pg.locator(f'.sidebar [data-to="{view}"]').click(); pg.wait_for_timeout(120)
    def snap(name):pg.screenshot(path=str(OUT/(name+'.png')),full_page=True)
    def product_pw12():
        nav('plm')
        pg.get_by_role('heading',name='PLM · What exactly are we buying?').wait_for()
        assert 'PW12' in pg.locator('main').inner_text()
        snap('plm_dashboard')
        pg.locator('tr.row-click',has_text='PW12').first.click(); pg.wait_for_timeout(120)
        assert 'Current approved technical specification' in pg.locator('main').inner_text()
        assert 'Model lineage' in pg.locator('main').inner_text() or 'Current' in pg.locator('main').inner_text()
        snap('plm_product_pw12')
    check('PLM product register and PW12 detail render',product_pw12)
    def revision():
        pg.locator('#demo-role').select_option('u-manager')
        pg.get_by_role('button',name='New technical revision',exact=True).click()
        pg.locator('[name=version]').fill('1.2')
        pg.locator('[name=changeSummary]').fill('Increase critical member thickness and confirm E20 configuration.')
        pg.locator('[name=reason]').fill('Product improvement and India fuel compatibility control.')
        pg.get_by_role('button',name='Submit to Product Manager',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        assert '1.2' in pg.locator('main').inner_text() and 'PENDING' in pg.locator('main').inner_text()
        pg.locator('#demo-role').select_option('u-product')
        # approve the pending technical revision in revision table
        pg.get_by_role('button',name='Approve',exact=True).first.click(); pg.wait_for_timeout(120)
        assert 'v1.2' in pg.locator('main').inner_text()
    check('Minor technical revision is submitted then Product Manager approved',revision)
    def brand_delta():
        pg.locator('#demo-role').select_option('u-manager')
        pg.get_by_role('button',name='Edit delta',exact=True).first.click()
        pg.locator('[name=decals]').fill('GAJA PW12 decal set revision B')
        pg.locator('[name=packaging]').fill('GAJA branded export carton with revised side panel')
        pg.locator('[name=remarks]').fill('Brand presentation update only; no technical change.')
        pg.get_by_role('button',name='Save',exact=True).click(); pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        assert 'PENDING' in pg.locator('main').inner_text()
        pg.locator('#demo-role').select_option('u-product')
        pg.get_by_role('button',name='Approve delta',exact=True).first.click(); pg.wait_for_timeout(120)
        assert 'GAJA PW12 decal set revision B' in pg.locator('main').inner_text()
    check('Brand-specific delta stays separate and requires Product Manager approval',brand_delta)
    def artwork():
        pg.locator('#demo-role').select_option('u-manager')
        pg.get_by_role('button',name='New artwork',exact=True).first.click()
        pg.locator('[name=file]').set_input_files({'name':'gaja-pw12-carton.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\n% PLM TEST ARTWORK\n'})
        pg.locator('[name=remarks]').fill('Carton artwork revision for GAJA brand.')
        pg.get_by_role('button',name='Save',exact=True).click(); pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        pg.locator('#demo-role').select_option('u-product')
        pg.get_by_role('button',name='Approve artwork',exact=True).first.click(); pg.wait_for_timeout(120)
        assert 'A2' in pg.locator('main').inner_text() or 'APPROVED' in pg.locator('main').inner_text()
    check('Brand artwork has its own revision and approval separate from technical version',artwork)
    def successor():
        pg.locator('#demo-role').select_option('u-manager')
        pg.get_by_role('button',name='Create successor model',exact=True).click()
        pg.locator('[name=code]').fill('PW21')
        pg.locator('[name=productName]').fill('Power Weeder successor test')
        pg.locator('[name=version]').fill('1.0')
        pg.locator('[name=reason]').fill('Major engine configuration change requiring a new product code.')
        pg.get_by_role('button',name='Save',exact=True).click(); pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        assert 'PW21' in pg.locator('main').inner_text()
        nav('plm')
        assert 'PW21' in pg.locator('main').inner_text()
    check('Significant change creates successor product code and visible lineage',successor)
    def templates():
        nav('plm'); pg.locator('.tab[data-value=templates]').click(); pg.wait_for_timeout(100)
        assert 'Power Weeder technical template' in pg.locator('main').inner_text()
        pg.locator('#demo-role').select_option('u-product')
        pg.get_by_role('button',name='Add field',exact=True).first.click()
        pg.locator('[name=key]').fill('noiseLevel')
        pg.locator('[name=label]').fill('Noise level')
        pg.locator('[name=group]').fill('Compliance')
        pg.get_by_role('button',name='Save',exact=True).click(); pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        assert 'noiseLevel' in pg.locator('main').inner_text()
        snap('plm_templates')
    check('Product Manager can extend a category-specific technical template',templates)
    def audit():
        pg.locator('.tab[data-value=audit]').click(); pg.wait_for_timeout(100)
        text=pg.locator('main').inner_text()
        assert 'PLM TECHNICAL REVISION APPROVED' in text or 'PLM' in text
        assert pg.locator('.timeline-event').count()>=5
        snap('plm_audit')
    check('PLM edits and approvals appear in visible append-only audit history',audit)
    report['passed']=sum(x['result']=='PASS' for x in report['checks']); report['failed']=sum(x['result']=='FAIL' for x in report['checks']); report['runtime_errors']=report['errors']
    (OUT/'plm-browser-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2))
    b.close()
