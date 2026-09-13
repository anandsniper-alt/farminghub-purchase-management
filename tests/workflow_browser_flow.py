from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output'; OUT.mkdir(exist_ok=True)
HTML=ROOT/'Farming_Hub_PLM_Shipping_LAE_Import_Review.html'
report={'checks':[],'errors':[]}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1500,'height':1150})
    pg.set_default_timeout(6000)
    pg.on('pageerror',lambda e:report['errors'].append(str(e)))
    pg.evaluate((ROOT/'tests/browser_storage_shim.js').read_text())
    pg.set_content(HTML.read_text(),wait_until='load'); pg.wait_for_selector('h1')
    def check(name,fn):
        try:
            fn(); report['checks'].append({'name':name,'result':'PASS'}); print('PASS',name,flush=True)
        except Exception as e:
            report['checks'].append({'name':name,'result':'FAIL','detail':str(e)}); print('FAIL',name,str(e)[:800],flush=True); pg.screenshot(path=str(OUT/'workflow_failure.png'),full_page=True)
            raise
    def nav(view): pg.locator(f'.sidebar [data-to="{view}"]').click(); pg.wait_for_timeout(100)
    def close(): pg.wait_for_function("document.querySelector('#modal-root').children.length === 0")
    def stage(): return pg.locator('.current-stage-card h2').inner_text().strip()
    def upload(name,content=b'TEST EVIDENCE'): pg.locator('[name=file]').set_input_files({'name':name,'mimeType':'text/plain','buffer':content})
    nav('orders')
    # Create a full 100-unit CNY order against the mapped V08 supplier.
    pg.get_by_role('button',name='Create purchase order',exact=True).click()
    pg.locator('[name=number]').fill('FLOW-LAE-001')
    pg.locator('[name=vendorId]').select_option(label='Demo supplier · V08 FPPL')
    pg.locator('[name=currency]').select_option('CNY')
    pg.locator('[name="item-0"]').select_option(label='GJPW12 · Power weeder · Gaja Hi-Tech Agro')
    pg.locator('[name="qty-0"]').fill('100')
    pg.locator('[name="price-0"]').fill('1680')
    pg.locator('[name=planningTat]').fill('100')
    pg.get_by_role('button',name='Save draft',exact=True).click(); close()
    check('Draft starts at submitted-for-approval stage',lambda: (stage()=='Submitted for approval') or (_ for _ in ()).throw(AssertionError(stage())))
    # PO approval.
    pg.get_by_role('button',name='Submit for approval',exact=True).click(); pg.get_by_role('button',name='Approve & issue',exact=True).click()
    check('Issued PO exposes supplier acknowledgement as next visible stage',lambda: (stage()=='Supplier PO acknowledgement') or (_ for _ in ()).throw(AssertionError(stage())))
    # Supplier PO acknowledgement.
    pg.get_by_role('button',name='Supplier PO acknowledgement',exact=True).first.click(); upload('po-ack.txt'); pg.locator('[name=remarks]').fill('Supplier acknowledged issued PO by email.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('Supplier acknowledgement advances to PI received',lambda: (stage()=='PI received') or (_ for _ in ()).throw(AssertionError(stage())))
    # PI receive / verify / approve.
    pg.get_by_role('button',name='Record supplier PI',exact=True).click(); pg.locator('[name=number]').fill('FLOW-PI-001'); upload('pi.txt'); pg.locator('[name=termsConfirmed]').check(); pg.locator('[name=commitmentConfirmed]').check(); pg.get_by_role('button',name='Save for purchase verification',exact=True).click(); close()
    check('PI upload advances to PI approval stage',lambda: (stage()=='PI approved') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='Verify PI',exact=True).first.click(); pg.get_by_role('button',name='Approve PI',exact=True).first.click()
    check('PI approval advances to technical specification confirmation',lambda: (stage()=='Technical specification confirmation') or (_ for _ in ()).throw(AssertionError(stage())))
    # Technical confirmation.
    pg.get_by_role('button',name='Technical specification confirmation',exact=True).first.click(); upload('technical-confirmation.txt'); pg.locator('[name=remarks]').fill('Supplier confirmed current technical package.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('Technical confirmation advances to artwork confirmation',lambda: (stage()=='Artwork confirmation') or (_ for _ in ()).throw(AssertionError(stage())))
    # Artwork submit + PM approval + supplier acknowledgement.
    pg.get_by_role('button',name='Submit artwork',exact=True).first.click(); upload('artwork.txt'); pg.locator('[name=remarks]').fill('Current brand decal and packaging artwork.'); pg.get_by_role('button',name='Submit for approval',exact=True).click(); close()
    pg.locator('#demo-role').select_option('u-product'); pg.get_by_role('button',name='Approve artwork',exact=True).first.click(); pg.locator('#demo-role').select_option('u-manager')
    pg.get_by_role('button',name='Supplier artwork confirmation',exact=True).first.click(); upload('artwork-supplier-ack.txt'); pg.locator('[name=remarks]').fill('Supplier confirmed approved artwork.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('Artwork confirmation advances to payment',lambda: (stage()=='Payment complete') or (_ for _ in ()).throw(AssertionError(stage())))
    # Initial payment with SWIFT.
    pg.get_by_role('button',name='Complete payment',exact=True).first.click(); pg.locator('[name=currency]').select_option('CNY'); pg.locator('[name=amount]').fill('50400'); pg.locator('[name=invoiceRate]').fill('1'); pg.locator('[name=inrRate]').fill('12'); pg.locator('[name=bankCharges]').fill('500'); pg.locator('[name=reference]').fill('FLOW-SWIFT-ADV'); upload('swift-advance.txt'); pg.locator('[name=remarks]').fill('30 percent advance remitted.'); pg.get_by_role('button',name='Record payment complete',exact=True).click(); close()
    check('Payment starts visible production lead-time stage',lambda: (stage()=='Production lead time') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.screenshot(path=str(OUT/'workflow_commercial_to_production.png'),full_page=True)
    # Separate sample completion and approval.
    pg.get_by_role('button',name='Record sample completion',exact=True).first.click(); pg.locator('[name=remarks]').fill('Supplier completed pre-production sample.'); upload('sample-complete.txt'); pg.get_by_role('button',name='Record sample completed',exact=True).click(); close()
    check('Sample completion advances to separate approval stage',lambda: (stage()=='Pre-production sample approved') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='Approve pre-production sample',exact=True).first.click(); pg.locator('[name=remarks]').fill('Purchase approved sample.'); pg.get_by_role('button',name='Record sample approval',exact=True).click(); close()
    check('Sample approval advances to bulk production start',lambda: (stage()=='Bulk production start') or (_ for _ in ()).throw(AssertionError(stage())))
    # Bulk production / QC / completion.
    pg.get_by_role('button',name='Start bulk production',exact=True).first.click(); pg.locator('[name=remarks]').fill('Bulk production started.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('Bulk start advances to bulk QC stage',lambda: (stage()=='Bulk production QC') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='Record bulk QC',exact=True).first.click(); pg.locator('[name=remarks]').fill('Bulk QC passed.'); upload('bulk-qc.txt'); pg.locator('#modal-root').get_by_role('button',name='Record bulk QC',exact=True).click(); close()
    check('Bulk QC advances to production completion',lambda: (stage()=='Production completion') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='Complete production',exact=True).click(); pg.locator('[name=remarks]').fill('Bulk production completed after QC.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('Production completion advances to container booking',lambda: (stage()=='Container booking') or (_ for _ in ()).throw(AssertionError(stage())))
    # One full-container shipment.
    pg.get_by_role('button',name='Plan shipment',exact=True).first.click(); pg.locator('[name=number]').fill('FLOW-SHIP-001'); pg.locator('[name="shipqty-0"]').fill('100'); pg.get_by_role('button',name='Save shipment allocation',exact=True).click(); close()
    pg.get_by_role('button',name='Book container',exact=True).first.click(); pg.locator('[name=forwarderId]').select_option(index=1); pg.locator('[name=forwarderRef]').fill('FLOW-REF-001'); pg.locator('[name=freightUsd]').fill('3800'); pg.locator('[name=rateRouteKey]').select_option(index=1); pg.locator('[name=remarks]').fill('Forwarder confirmed container booking.'); pg.get_by_role('button',name='Confirm container booked',exact=True).click(); close()
    check('Container booked advances to container release',lambda: (stage()=='Container release') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='Container released',exact=True).first.click(); pg.locator('[name=container]').fill('FLOW1234567'); pg.locator('[name=remarks]').fill('Empty container released for factory loading.'); pg.get_by_role('button',name='Confirm release',exact=True).click(); close()
    check('Container release advances to China inland tracking',lambda: (stage()=='China inland tracking') or (_ for _ in ()).throw(AssertionError(stage())))
    # Structured inland tracking.
    pg.get_by_role('button',name='Update China inland tracking',exact=True).first.click(); pg.locator('[name=milestone]').select_option('INLAND_ORIGIN'); pg.locator('[name=status]').select_option('COMPLETED'); pg.locator('[name=actualDate]').fill('2026-09-12'); pg.locator('[name=location]').fill('Factory / inland departure'); pg.locator('[name=remarks]').fill('Container departed inland origin.'); pg.get_by_role('button',name='Post tracking update',exact=True).click(); close()
    check('Inland update advances to visible CI/PL document stage',lambda: (stage()=='Shipping docs (CI + PL)') or (_ for _ in ()).throw(AssertionError(stage())))
    # Required pre-vessel docs surfaced one-by-one.
    for dtype,filename in [('COMMERCIAL_INVOICE','commercial-invoice.txt'),('PACKING_LIST','packing-list.txt')]:
        btn=pg.get_by_role('button',name='Upload '+dtype.replace('_',' ').lower(),exact=True)
        btn.first.click(); pg.locator('[name=type]').select_option(dtype); assert pg.locator('[name=type]').input_value()==dtype; upload(filename); pg.get_by_role('button',name='Save',exact=True).click(); close()
    # 70% before-shipment payment is explicitly surfaced instead of being a hidden dispatch error.
    assert pg.get_by_role('button',name='Before-shipment payment due',exact=True).count()>=1
    pg.get_by_role('button',name='Before-shipment payment due',exact=True).first.click()
    pg.get_by_role('button',name='Authorize',exact=True).last.click()
    pg.get_by_role('button',name='Record bank payment',exact=True).click()
    pg.locator('[name=currency]').select_option('CNY'); pg.locator('[name=amount]').fill('117600'); pg.locator('[name=inrRate]').fill('12');
    # Select the authorized shipment milestone (the last option after the already-paid advance).
    pg.locator('[name="aterm-0"]').select_option(index=pg.locator('[name="aterm-0"] option').count()-1)
    pg.locator('[name="aamount-0"]').fill('117600'); pg.locator('[name="arate-0"]').fill('1'); pg.locator('[name=reference]').fill('FLOW-SWIFT-BAL'); upload('swift-balance.txt'); pg.locator('[name=remarks]').fill('70 percent before shipment remitted.'); pg.get_by_role('button',name='Save payment & allocations',exact=True).click(); close()
    pg.locator('.tab[data-value=overview]').click()
    check('Before-shipment payment resolves and vessel loading becomes next action',lambda: pg.get_by_role('button',name='Loaded on vessel',exact=True).first.wait_for())
    # Loaded on vessel -> final BL -> insurance -> in transit -> India port.
    pg.get_by_role('button',name='Loaded on vessel',exact=True).first.click(); pg.locator('[name=vessel]').fill('FLOW VESSEL'); pg.locator('[name=voyage]').fill('FLOW-001'); pg.locator('[name=remarks]').fill('Container loaded on vessel.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('Vessel loading advances to final BL verification',lambda: (stage()=='Final BL / verification') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='Final BL / verify',exact=True).first.click(); pg.locator('[name=number]').fill('FLOW-BL-001'); upload('final-bl.txt'); pg.locator('[name=remarks]').fill('Final BL verified after vessel loading.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('Final BL advances to insurance',lambda: (stage()=='Insurance completed') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='Complete insurance',exact=True).first.click(); pg.locator('[name=masterPolicy]').fill('FH-MASTER-POLICY'); pg.locator('[name=declarationNumber]').fill('FLOW-INS-001'); pg.locator('[name=insuredValue]').fill('168000'); pg.locator('[name=currency]').select_option('CNY'); upload('insurance.txt'); pg.locator('[name=remarks]').fill('Shipment insured under company master policy.'); pg.get_by_role('button',name='Record shipment insurance',exact=True).click(); close()
    check('Insurance completion leaves order visibly in transit until India port arrival',lambda: (stage()=='In transit') or (_ for _ in ()).throw(AssertionError(stage())))
    pg.get_by_role('button',name='India port arrival',exact=True).first.click(); pg.locator('[name=remarks]').fill('Container arrived at Chennai port.'); pg.get_by_role('button',name='Save',exact=True).click(); close()
    check('India port arrival completes the operational workflow',lambda: ('Order complete to India port' in pg.locator('.current-stage-card h2').inner_text()))
    # All mandatory top stages exist and pre-dispatch QC is absent.
    labels=pg.locator('.progress-track').inner_text()
    required=['Supplier PO acknowledgement','PI received','Technical specification confirmation','Artwork confirmation','Payment complete','Production lead time','Pre-production sample completed','Pre-production sample approved','Bulk production QC','Container booking','Container release','China inland tracking','Shipping docs (CI + PL)','Loaded on vessel','Final BL / verification','Insurance completed','In transit','India port arrival']
    check('Top timeline exposes every corrected mandatory stage with no pre-dispatch QC',lambda: (all(x in labels for x in required) and 'pre-dispatch' not in labels.lower()) or (_ for _ in ()).throw(AssertionError(labels)))
    pg.screenshot(path=str(OUT/'workflow_complete_to_india_port.png'),full_page=True)
    report['passed']=sum(x['result']=='PASS' for x in report['checks']); report['failed']=sum(x['result']=='FAIL' for x in report['checks']); report['runtime_errors']=report['errors']
    (OUT/'workflow-browser-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':report['errors']},indent=2))
    b.close()
