import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=root/'Farming_Hub_Purchase_Management_Clean_Review.html'
results=[]
def check(name,cond):
    results.append({'name':name,'passed':bool(cond)})
    if not cond: raise AssertionError(name)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    pg=b.new_page()
    pg.evaluate((root/'tests/browser_storage_shim.js').read_text())
    pg.set_content(html.read_text(),wait_until='load')
    pg.wait_for_selector('h1')
    pg.locator('[data-action=nav][data-to=plm]').click()
    pg.locator('[data-action=plm-tab][data-value=templates]').click()
    text=pg.locator('main').inner_text()
    check('Detailed Power Weeder template renders','Power Weeder detailed technical template v2' in text)
    check('Sample-derived source is identified','sample-derived' in text.lower())
    check('Engine fields render','Engine model / specification' in text and 'Carburetor specification' in text)
    check('Transmission fields render','Gearbox brand / specification' in text and 'PTO shaft' in text)
    check('Blade and packing fields render','Blade arrangement' in text and 'Wooden packing thickness' in text)
    check('Downstream metadata badges render','PP QC' in text and 'Bulk QC' in text and 'Supplier confirm' in text)
    b.close()
out=root/'docs/plm-template-browser-results.json'
out.write_text(json.dumps({'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'results':results},indent=2))
print(json.dumps({'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results)}))
