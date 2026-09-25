"""Verify PDFs produced by domestic-orders-browser.mjs (requires pypdf)."""
import json, sys
from pathlib import Path
from pypdf import PdfReader
out = Path(sys.argv[1])
reports = []
for mode in ['server', 'review']:
    for kind in ['issued', 'multipage']:
        doc = PdfReader(out / f'{mode}-{kind}-po.pdf')
        texts = [' '.join(p.extract_text().split()) for p in doc.pages]
        text = ' '.join(texts)
        assert 'Bill to' in texts[0] and 'Ship to' in texts[0]
        assert all('Bill to' not in t and 'Ship to' not in t for t in texts[1:])
        assert 'DEMO-A' not in text and 'FARMING HUB PRIVATE LIMITED' not in text
        assert '5,240.00' in text
        if kind == 'multipage':
            assert len(doc.pages) > 1
            for i in range(1, 31):
                assert text.count(f'PAGINATION-PART-{i:02}') == 1
            for t in texts:
                if 'PAGINATION-PART' in t:
                    assert 'PICTURE' in t.upper() and 'ORDER QUANTITY' in t.upper()
        reports.append({'mode': mode, 'kind': kind, 'pages': len(doc.pages), 'status': 'PASS'})
(out / 'pdf-verification.json').write_text(json.dumps(reports, indent=2), encoding='utf-8')
print(json.dumps(reports))
