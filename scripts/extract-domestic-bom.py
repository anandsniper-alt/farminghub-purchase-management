"""Extract the user supplied FINAL BOM cells and both Excel/WPS in-cell photos.
Reads the workbook only; never evaluates workbook formulas or macros.
"""
import sys, zipfile, json, re, posixpath, hashlib
from pathlib import Path
from xml.etree import ElementTree as E

source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
assets = root / 'web/assets/domestic-bom'
assets.mkdir(parents=True, exist_ok=True)
ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'rd':'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata',
      'a':'http://schemas.openxmlformats.org/drawingml/2006/main',
      'xdr':'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'}
with zipfile.ZipFile(source) as z:
    strings = [''.join(n.itertext()) for n in E.fromstring(z.read('xl/sharedStrings.xml'))]
    def rels(part, base):
        return {n.get('Id'):posixpath.normpath(posixpath.join(base,n.get('Target'))) for n in E.fromstring(z.read(part))}
    rr = rels('xl/richData/_rels/richValueRel.xml.rels','xl/richData')
    richrel = [rr[n.get('{'+ns['r']+'}id')] for n in E.fromstring(z.read('xl/richData/richValueRel.xml'))]
    richvalues = [int(n[0].text) for n in E.fromstring(z.read('xl/richData/rdrichvalue.xml'))]
    meta = E.fromstring(z.read('xl/metadata.xml'))
    future = [int(n.find('.//rd:rvb',ns).get('i')) for n in meta.find('s:futureMetadata',ns)]
    values = [int(n[0].get('v')) for n in meta.find('s:valueMetadata',ns)]
    cr = rels('xl/_rels/cellimages.xml.rels','xl')
    wps = {n.find('.//xdr:cNvPr',ns).get('name'):cr[n.find('.//a:blip',ns).get('{'+ns['r']+'}embed')] for n in E.fromstring(z.read('xl/cellimages.xml'))}
    rows=[]
    for row in E.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('s:sheetData/s:row',ns):
        cells={re.sub(r'\d','',c.get('r')):c for c in row}
        def value(col):
            c=cells.get(col)
            if c is None: return None
            v=c.find('s:v',ns)
            if v is None: return None
            return strings[int(v.text)] if c.get('t')=='s' else v.text
        if not value('A') or not value('A').isdigit() or not value('C'): continue
        c=cells['E']; path=None
        if c.get('vm'):
            path=richrel[richvalues[future[values[int(c.get('vm'))-1]]]]
        else:
            formula=c.find('s:f',ns)
            found=re.search(r'"(ID_[^"]+)"',formula.text if formula is not None else '')
            if found: path=wps[found.group(1)]
        assert path and path in z.namelist(), f'Missing image for {c.get("r")}'
        name=Path(path).name
        (assets/name).write_bytes(z.read(path))
        rows.append({'sourceRow':int(row.get('r')),'serial':int(value('A')),'segment':value('B'),
                     'description':value('C').strip(),'uom':value('D'),'rate':value('F'),
                     'imageAsset':name,'sourceCell':c.get('r'),'imageSha256':hashlib.sha256(z.read(path)).hexdigest()})
    assert len(rows)==33 and len(set(r['imageAsset'] for r in rows))==30
    assert all(r['rate'] is None for r in rows)
    data={'sourceName':source.name,'sheet':'FINAL BOM','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
          'columns':['S.No','segment','Item Description','UOM','Picture','Rate (before GST)'],'items':rows}
    out=root/'data-reference/domestic-bom.json';out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'items':len(rows),'embeddedPictures':30,'missingRates':33,'mappedImageCells':len(rows),'output':str(out)}))
