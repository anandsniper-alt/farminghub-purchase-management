import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from '../server/index.mjs';

test('browser startup module graph is served without authentication', async () => {
  const server = makeServer(null);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const visited = new Set();
  async function visit(path) {
    if (visited.has(path)) return;
    visited.add(path);
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /javascript/, path);
    const source = await response.text();
    for (const match of source.matchAll(/^import\s+[^;\n]*?\bfrom\s*['"]([^'"]+)['"]/gm)) {
      await visit(new URL(match[1], origin + path).pathname);
    }
  }
  try {
    await visit('/app.mjs');
    await visit('/experience.mjs');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
