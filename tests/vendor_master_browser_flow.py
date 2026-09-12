import json, os, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]
out=root/'test-output'
out.mkdir(exist_ok=True)
html='http://127.0.0.1:8877/Farming_Hub_Purchase_Management_Clean_Review.html'
res={'passed':0,'failed':0,'checks':[]}
def check(name,fn):
    try:
        fn(); res['passed']+=1; res['checks'].append({'name':name,'status':'PASS'}); print('PASS',name)
    except Exception as e:
        res['failed']+=1; res['checks'].append({'name':name,'status':'FAIL','error':str(e)}); print('FAIL',name,str(e))
server=subprocess.Popen(['python3','-m','http.server','8877','--bind','127.0.0.1'], cwd=str(root), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=b.new_page(viewport={'width':1500,'height':1050})
        page.goto(html,wait_until='domcontentloaded')
        page.wait_for_selector('text=Purchase workspace',timeout=10000)
        check('Overview has zero active purchase orders', lambda: expect(page.locator('text=Active purchase orders').locator('xpath=..')).to_contain_text('0'))
        page.click('button:has-text("Vendor master")')
        page.wait_for_selector('text=Vendor code master')
        check('Vendor Master Library loads final supplier records', lambda: expect(page.locator('body')).to_contain_text('37 records'))
        check('V01-SWAC reference is visible', lambda: expect(page.locator('body')).to_contain_text('V01-SWAC'))
        check('Duplicate fixed code XMMS is surfaced', lambda: expect(page.locator('body')).to_contain_text('XMMS'))
        page.fill('#view-search','BMCM')
        check('Search by fixed supplier code finds Basewin', lambda: expect(page.locator('body')).to_contain_text('CHONGQING BASEWIN'))
        page.screenshot(path=str(out/'vendor_master_library.png'), full_page=True)
        page.click('button:has-text("Item master")')
        page.wait_for_selector('text=Item master')
        check('Item Master remains empty awaiting upload', lambda: expect(page.locator('body')).to_contain_text('No item rows are preloaded'))
        page.screenshot(path=str(out/'item_master_empty_ready.png'), full_page=True)
        b.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
(root/'docs/vendor-master-browser-results.json').write_text(json.dumps(res,indent=2))
print(json.dumps(res,indent=2))
raise SystemExit(1 if res['failed'] else 0)
