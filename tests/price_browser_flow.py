from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'
OUT.mkdir(exist_ok=True)
HTML=ROOT/'Farming_Hub_PLM_Shipping_LAE_Import_Review.html'
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':1100})
    pg.set_default_timeout(7000)
    pg.on('pageerror',lambda e:report['errors'].append(str(e)))
    pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
    pg.set_content(HTML.read_text(),wait_until='load')
    pg.wait_for_selector('h1')
    def check(name,fn):
        try:
            fn(); report['checks'].append({'name':name,'result':'PASS'}); print('PASS',name,flush=True)
        except Exception as e:
            report['checks'].append({'name':name,'result':'FAIL','detail':str(e)}); print('FAIL',name,str(e)[:900],flush=True); pg.screenshot(path=str(OUT/'price_failure.png'),full_page=True)
    def nav(view):
        pg.locator(f'.sidebar [data-to="{view}"]').click(); pg.wait_for_timeout(160)
    def snap(name): pg.screenshot(path=str(OUT/(name+'.png')),full_page=True)

    def price_register():
        nav('prices')
        pg.get_by_role('heading',name='Supplier price lists').wait_for()
        text=pg.locator('main').inner_text()
        assert 'GJPW12' in text and 'RMB / CNY' in text and 'USD' in text
        assert '1,680' in text and '240' in text
        snap('supplier_price_lists')
    check('Supplier price list shows separate current CNY and USD prices for the same SKU',price_register)

    def revise_price():
        row=pg.locator('tbody tr',has_text='GJPW12').filter(has_text='RMB / CNY').first
        row.get_by_role('button',name='Revise',exact=True).click()
        pg.locator('[name=unitPrice]').fill('1710')
        pg.locator('[name=reference]').fill('Browser test revision')
        pg.locator('[name=remarks]').fill('Supplier confirmed revised RMB price for browser test.')
        pg.get_by_role('button',name='Save current price',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        row=pg.locator('tbody tr',has_text='GJPW12').filter(has_text='RMB / CNY').first
        txt=row.inner_text()
        assert '1,710' in txt and 'Rev 2' in txt and '2 revisions' in txt
    check('Revising a supplier price creates a new current revision without deleting history',revise_price)

    def price_history():
        row=pg.locator('tbody tr',has_text='GJPW12').filter(has_text='RMB / CNY').first
        row.get_by_role('button',name='History',exact=True).click()
        body=pg.locator('.modal-body').inner_text()
        assert 'Rev 2' in body and 'Rev 1' in body and '1,710' in body and '1,680' in body
        assert 'APPROVED' in body and 'SUPERSEDED' in body
        pg.get_by_role('button',name='Close',exact=True).click()
    check('Price history visibly retains approved and superseded revisions',price_history)

    def po_autofill_and_warning():
        nav('orders')
        pg.get_by_role('button',name='Create purchase order',exact=True).click()
        pg.locator('[name=number]').fill('PRICE-TEST-001')
        pg.locator('[name=vendorId]').select_option('vendor-1')
        assert pg.locator('[name=currency]').input_value()=='CNY'
        pg.locator('[name="item-0"]').select_option('sku-GJPW12')
        assert pg.locator('[name="price-0"]').input_value() in ('1710','1710.00')
        hint=pg.locator('[data-price-hint="0"]')
        assert 'Current supplier price matched' in hint.inner_text() and '1710.00' in hint.inner_text()
        pg.locator('[name="price-0"]').fill('1700')
        assert 'Warning: entered price differs' in hint.inner_text()
        pg.locator('[name=planningTat]').fill('60')
        pg.get_by_role('button',name='Save draft',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        pg.wait_for_function("document.querySelector('main').innerText.includes('PRICE-TEST-001')")
        # Order detail should show a visible override while retaining source revision.
        pg.get_by_role('button',name='Items & artwork',exact=True).click()
        text=pg.locator('main').inner_text()
        assert 'Override' in text and 'Rev 2' in text and 'CN¥1,700.00' in text
        snap('po_price_override_warning')
    check('PO auto-fills latest matching supplier price and warns but allows a manual override',po_autofill_and_warning)

    def later_revision_does_not_rewrite_draft_snapshot():
        nav('prices')
        row=pg.locator('tbody tr',has_text='GJPW12').filter(has_text='RMB / CNY').first
        row.get_by_role('button',name='Revise',exact=True).click()
        pg.locator('[name=unitPrice]').fill('1750')
        pg.locator('[name=reference]').fill('Later browser test price')
        pg.get_by_role('button',name='Save current price',exact=True).click()
        pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
        nav('orders')
        pg.locator('tr.row-click',has_text='PRICE-TEST-001').click(); pg.wait_for_timeout(150)
        pg.get_by_role('button',name='Items & artwork',exact=True).click()
        text=pg.locator('main').inner_text()
        assert 'CN¥1,700.00' in text and 'Rev 2' in text and '1,750' not in text
    check('Later supplier price revision does not rewrite an existing PO price-list snapshot',later_revision_does_not_rewrite_draft_snapshot)

    report['passed']=sum(x['result']=='PASS' for x in report['checks'])
    report['failed']=sum(x['result']=='FAIL' for x in report['checks'])
    report['runtime_errors']=report['errors']
    (OUT/'price-browser-results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2))
    b.close()
