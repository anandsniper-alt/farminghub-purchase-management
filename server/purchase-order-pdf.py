"""Render the server's purchase order HTML without external resources."""

import base64
import sys

from weasyprint import HTML


def embedded_png(url):
    prefix = 'data:image/png;base64,'
    if url.startswith(prefix) and len(url) < 200000:
        body = base64.b64decode(url[len(prefix):], validate=True)
        if body.startswith(b'\x89PNG\r\n\x1a\n'):
            return {'string': body, 'mime_type': 'image/png'}
    raise ValueError('External document resources are unavailable.')


def main():
    limit = 4 * 1024 * 1024
    source = sys.stdin.buffer.read(limit + 1)
    if len(source) > limit:
        raise ValueError('Purchase order HTML is too large.')
    document = HTML(string=source.decode('utf-8'), url_fetcher=embedded_png).render()
    if len(document.pages) > 250:
        raise ValueError('Purchase order has too many pages.')
    document.write_pdf(sys.stdout.buffer)


if __name__ == '__main__':
    main()
