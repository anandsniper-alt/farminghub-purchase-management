import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {crc32} from 'node:zlib';
import test from 'node:test';
import {makeServer} from '../server/index.mjs';
import {Store} from '../server/store.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';

const api = '/api/development-requests';
const password = 'Synthetic-requests-password-2026';
const create = (title, extra = {}) => ({title, description: 'Page detail from the reporter', requestId: randomUUID(), ...extra});
const update = (expectedVersion, status, note = '') => ({status, note, expectedVersion, requestId: randomUUID()});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPocDEGAAJXAQCuNfOCAAAAAElFTkSuQmCC', 'base64');
const webp = Buffer.from('UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoBAAEAAUAmJaACdLoAA5gA/vDEC/G7LOHB7/43jwK8l2OgAAA=', 'base64');
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAABv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AJP/Z', 'base64');
const image = (name, bytes = png, type = 'image/png') => ({name, type, data: bytes.toString('base64')});

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'fh-development-requests-'));
  const database = join(directory, 'pilot.sqlite');
  const initial = createCleanSeed('2026-11-28');
  const roles = ['u-admin', 'u-manager', 'u-exec', 'u-viewer'];
  for (const user of initial.users.filter(({id}) => ['u-exec', 'u-viewer'].includes(id))) user.name = 'Shared name';
  const first = new Store(database, initial);
  for (const id of roles) first.addAccount(id, id + '@example.test', password);
  const resources = new Set();
  t.after(async () => {
    for (const close of resources) await close();
    rmSync(directory, {recursive: true, force: true});
  });

  async function open(store = new Store(database), applicationMode = 'purchase') {
    const server = makeServer(store, {applicationMode, log: () => {}});
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const close = async () => {
      resources.delete(close);
      await new Promise(resolve => server.close(resolve));
      store.close();
    };
    resources.add(close);

    async function request(path, actor, {method = 'GET', payload, requestOrigin = origin, csrf = actor?.csrf} = {}) {
      return fetch(origin + path, {
        method,
        headers: {
          ...(method === 'GET' ? {} : {Origin: requestOrigin}),
          ...(actor ? {Cookie: `fh_session=${actor.token}`} : {}),
          ...(csrf ? {'X-CSRF-Token': csrf} : {}),
          ...(payload === undefined ? {} : {'Content-Type': 'application/json'}),
        },
        ...(payload === undefined ? {} : {body: JSON.stringify(payload)}),
      });
    }

    async function json(path, actor, options) {
      const response = await request(path, actor, options);
      return {status: response.status, data: await response.json(), headers: response.headers};
    }

    async function login(id) {
      const response = await request('/api/login', null, {method: 'POST', payload: {email: id + '@example.test', password}});
      assert.equal(response.status, 200);
      const token = response.headers.get('set-cookie').match(/fh_session=([^;]+)/)[1];
      const session = await json('/api/session', {token});
      assert.equal(session.status, 200);
      return {token, ...session.data};
    }

    return {store, close, request, json, login, post: (path, actor, payload, options) => json(path, actor, {method: 'POST', payload, ...options})};
  }
  return {open, first, directory};
}

test('requires an authenticated reporter, limits readers to their own entries, and groups managers by stable reporter ID', async t => {
  const f = fixture(t);
  const app = await f.open(f.first);
  assert.equal((await app.json(api)).status, 401);
  assert.equal((await app.post(api, null, create('Unsigned'))).status, 401);
  const viewer = await app.login('u-viewer');
  const exec = await app.login('u-exec');
  const manager = await app.login('u-manager');
  const administrator = await app.login('u-admin');
  const unsigned = await app.json(api, viewer);
  assert.equal(unsigned.headers.get('cache-control'), 'no-store');
  assert.deepEqual(unsigned.data, {requests: [], total: 0, page: 1, pageSize: 20, reporters: [], canManage: false, csrf: viewer.csrf});
  assert.equal((await app.post(api, viewer, create('No token'), {csrf: ''})).status, 403);
  assert.equal((await app.post(api, viewer, create('Other origin'), {requestOrigin: 'https://other.example'})).status, 403);
  assert.equal((await app.post(api, viewer, create('Forged reporter', {createdBy: administrator.user}))).status, 400);

  const description = 'First line\n<t>Literal markup & detail</t>';
  const report = await app.post(api, viewer, create('Availability is 100% in this report', {
    screen: 'Costing', route: '/#costing', priority: 'High', description,
  }));
  assert.equal(report.status, 201);
  const saved = report.data.request;
  assert.match(saved.id, /^DR-[0-9a-f-]+$/);
  assert.deepEqual(saved, {
    id: saved.id, title: 'Availability is 100% in this report', description, screen: 'Costing', route: '/#costing',
    priority: 'High', status: 'Open', createdBy: {id: viewer.user.id, name: viewer.user.name},
    createdAt: saved.createdAt, updatedAt: saved.createdAt, version: 1,
  });
  assert.equal(new Date(saved.createdAt).toISOString(), saved.createdAt);
  assert.equal(report.data.history.length, 1);
  assert.deepEqual(report.data.history[0], {
    id: report.data.history[0].id, actor: saved.createdBy, fromStatus: null, toStatus: 'Open', note: '', at: saved.createdAt, version: 1,
  });
  const second = await app.post(api, exec, create('Another reporter’s request'));
  const third = await app.post(api, manager, create('Manager concern'));
  assert.equal(second.status, 201);
  assert.equal(third.status, 201);
  assert.deepEqual((await app.json(api + '/' + saved.id, viewer)).data, report.data);
  assert.equal((await app.json(api + '/' + saved.id, exec)).status, 404);
  const unknown = await app.json(api + '/DR-' + randomUUID(), exec);
  assert.deepEqual((await app.json(api + '/' + saved.id, exec)).data, unknown.data);
  assert.equal((await app.post(api + '/' + saved.id, viewer, update(1, 'Closed'))).status, 403);
  assert.deepEqual((await app.json(api, viewer)).data.requests.map(row => row.id), [saved.id]);
  assert.equal((await app.json(api + '?reporterId=' + exec.user.id, viewer)).status, 403);

  const all = await app.json(api, manager);
  assert.equal(all.data.total, 3);
  assert.equal(all.data.canManage, true);
  assert.deepEqual(all.data.reporters.map(r => [r.id, r.name, r.count]), [
    [manager.user.id, manager.user.name, 1], [exec.user.id, 'Shared name', 1], [viewer.user.id, 'Shared name', 1],
  ]);
  assert.deepEqual((await app.json(api, viewer)).data.reporters, [{id: viewer.user.id, name: viewer.user.name, count: 1}]);
  const admin = await app.json(api + '?reporterId=' + viewer.user.id + '&status=Open&search=100%25', administrator);
  assert.equal(admin.data.canManage, true);
  assert.deepEqual(admin.data.requests.map(row => row.id), [saved.id]);
  assert.deepEqual(admin.data.reporters, all.data.reporters);
  assert.equal((await app.json(api + '?search=%25never', manager)).data.total, 0);
  assert.equal((await app.json(api + '?search=100%25&status=Closed', manager)).data.total, 0);
  assert.deepEqual((await app.json(api + '?mine=1', manager)).data.requests.map(row => row.id), [third.data.request.id]);
  assert.equal((await app.json(api + '?mine=1&reporterId=' + viewer.user.id, manager)).status, 400);
  const p1 = (await app.json(api + '?page=1&pageSize=1', manager)).data;
  const p2 = (await app.json(api + '?page=2&pageSize=1', manager)).data;
  assert.equal(p1.total, 3);
  assert.equal(p2.total, 3);
  assert.notEqual(p1.requests[0].id, p2.requests[0].id);
  assert.equal((await app.json(api + '?page=4&pageSize=1', manager)).data.requests.length, 0);
  assert.equal((await app.json(api + '?pageSize=1000', manager)).status, 400);
  assert.equal((await app.json(api + '?status=Pending', manager)).status, 400);
});

test('validates requests, retries safely, detects stale changes, and restores history from the main recovery snapshot', async t => {
  const f = fixture(t);
  const app = await f.open(f.first);
  const viewer = await app.login('u-viewer');
  const manager = await app.login('u-manager');
  const administrator = await app.login('u-admin');
  const revision = app.store.revision();
  for (const limits of [{title: ''}, {title: 'x'.repeat(121)}, {description: ''}, {description: 'x'.repeat(4001)},
    {priority: 'Urgent'}, {route: '//other.example'}, {route: '/\\other.example'}, {route: 'https://other.example'}, {requestId: ''}]) {
    assert.equal((await app.post(api, viewer, create('Invalid request', limits))).status, 400, JSON.stringify(Object.keys(limits)));
  }
  const command = create('Retry after the response is lost');
  const submissions = await Promise.all([app.post(api, viewer, command), app.post(api, viewer, command)]);
  assert.equal(submissions[0].status, 201);
  assert.deepEqual(submissions[0].data, submissions[1].data);
  assert.equal((await app.post(api, viewer, {...command, title: 'Different input'})).status, 409);
  assert.equal((await app.json(api, viewer)).data.total, 1);

  const id = submissions[0].data.request.id;
  const endpoint = api + '/' + id;
  const draft = update(1, 'Open');
  assert.equal((await app.post(endpoint, manager, draft)).status, 400);
  assert.equal((await app.post(endpoint, manager, update(1, 'Resolved', 'x'.repeat(2001)))).status, 400);
  assert.equal((await app.post(endpoint, manager, update(0, 'Resolved'))).status, 400);
  assert.equal((await app.post(endpoint, manager, {...update(1, 'Resolved'), actor: viewer.user})).status, 400);

  const edits = [[manager, update(1, 'In progress', 'First review')],
    [administrator, update(1, 'In progress', 'Concurrent review')]];
  const changes = await Promise.all(edits.map(([actor, command]) => app.post(endpoint, actor, command)));
  assert.deepEqual(changes.map(change => change.status).sort(), [200, 409]);
  assert.equal(changes.find(change => change.status === 409).data.code, 'CONFLICT');
  const winner = changes.findIndex(change => change.status === 200);
  const [winningActor, winningCommand] = edits[winner];
  assert.deepEqual((await app.post(endpoint, winningActor, winningCommand)).data, changes[winner].data);
  const note = await app.post(endpoint, manager, update(2, 'In progress', 'Note without a status change'));
  assert.equal(note.status, 200);
  const resolved = await app.post(endpoint, administrator, update(3, 'Resolved', 'Confirmed in review'));
  assert.equal(resolved.status, 200);
  assert.deepEqual(resolved.data.history.map(({actor, fromStatus, toStatus, version}) => [actor.id, fromStatus, toStatus, version]), [
    [viewer.user.id, null, 'Open', 1], [winningActor.user.id, 'Open', 'In progress', 2],
    [manager.user.id, 'In progress', 'In progress', 3], [administrator.user.id, 'In progress', 'Resolved', 4],
  ]);
  assert.equal(app.store.revision(), revision);
  assert.throws(() => app.store.db.prepare('UPDATE development_request_events SET note = ? WHERE request_id = ?').run('Changed', id), /append-only/);

  const recovery = await app.request('/api/admin/recovery', administrator, {method: 'POST'});
  assert.equal(recovery.status, 200);
  const restoredDatabase = join(f.directory, 'recovery.sqlite');
  writeFileSync(restoredDatabase, Buffer.from(await recovery.arrayBuffer()));
  const snapshot = new DatabaseSync(restoredDatabase, {readOnly: true});
  try {
    assert.equal(snapshot.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(snapshot.prepare('PRAGMA foreign_key_check').all().length, 0);
    assert.equal(snapshot.prepare('SELECT status FROM development_requests WHERE id = ?').get(id).status, 'Resolved');
    assert.equal(snapshot.prepare('SELECT count(*) AS n FROM development_request_events WHERE request_id = ?').get(id).n, 4);
  } finally {
    snapshot.close();
  }
  await app.close();
  const restarted = await f.open();
  assert.deepEqual((await restarted.json(endpoint, manager)).data, resolved.data);
  assert.equal((await restarted.post(api, viewer, command)).data.request.id, id);
  assert.equal((await restarted.post(endpoint, winningActor, winningCommand)).data.history.length, 4);
});

test('Purchase and standalone Implements registers and retries are isolated even on a shared database', async t => {
  const f = fixture(t);
  const purchase = await f.open(f.first);
  const standalone = await f.open(undefined, 'implements');
  const administrator = await purchase.login('u-admin');
  const command = create('A concern captured in each app');
  const p = await purchase.post(api, administrator, command);
  assert.equal(p.status, 201);
  assert.equal((await standalone.json(api, administrator)).data.total, 0);
  assert.equal((await standalone.json(api + '/' + p.data.request.id, administrator)).status, 404);

  const i = await standalone.post(api, administrator, command);
  assert.equal(i.status, 201);
  assert.notEqual(i.data.request.id, p.data.request.id);
  assert.equal((await purchase.json(api + '/' + i.data.request.id, administrator)).status, 404);
  assert.equal((await standalone.post(api + '/' + p.data.request.id, administrator, update(1, 'Closed'))).status, 404);
  assert.deepEqual((await purchase.json(api, administrator)).data.requests.map(row => row.id), [p.data.request.id]);
  assert.deepEqual((await standalone.json(api, administrator)).data.requests.map(row => row.id), [i.data.request.id]);
  assert.equal(purchase.store.db.prepare('SELECT count(*) AS n FROM request_receipts').get().n, 0);
});

test('saves five private images in order, replays atomically, and restores their exact bytes', async t => {
  const f = fixture(t);
  const app = await f.open(f.first);
  const owner = await app.login('u-exec');
  const viewer = await app.login('u-viewer');
  const manager = await app.login('u-manager');
  const administrator = await app.login('u-admin');
  const files = [image("Review (operator's).png"), image('二.png'), image('three.png'),
    image('four.webp', webp, 'image/webp'), image('five.jpg', jpeg, 'image/jpeg')];
  const command = create('Review screenshots', {images: files});
  const results = await Promise.all([app.post(api, owner, command), app.post(api, owner, command)]);
  assert.equal(results[0].status, 201);
  assert.equal(results[1].status, 201);
  assert.deepEqual(results[0].data, results[1].data);
  const {request, images, history} = results[0].data;
  assert.equal(history.length, 1);
  assert.deepEqual(images.map(({name, type, size}) => [name, type, size]), files.map(({name, type, data}) => [name, type, Buffer.from(data, 'base64').length]));
  assert.equal(new Set(images.map(({id}) => id)).size, 5);
  assert.equal(app.store.db.prepare('SELECT count(*) AS count FROM development_request_images').get().count, 5);
  assert.equal((await app.post(api, owner, {...command, images: [...files].reverse()})).status, 409);
  assert.deepEqual((await app.json(api + '/' + request.id, manager)).data.images, images);
  assert.equal((await app.json(api, owner)).data.requests[0].images, undefined);
  assert.deepEqual((await app.post(api + '/' + request.id, manager, update(1, 'In progress'))).data.images, images);

  const url = api + '/' + request.id + '/images/' + images[0].id;
  assert.equal((await app.json(url)).status, 401);
  assert.equal((await app.json(url, viewer)).status, 404);
  const other = await app.post(api, owner, create('Different request without images'));
  assert.deepEqual(other.data.images, []);
  assert.equal((await app.json(api + '/' + other.data.request.id + '/images/' + images[0].id, owner)).status, 404);
  const implementsApp = await f.open(undefined, 'implements');
  assert.equal((await implementsApp.json(url, administrator)).status, 404);

  for (const actor of [owner, manager, administrator]) {
    const served = await app.request(url, actor);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/png');
    assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(served.headers.get('cache-control'), 'private, no-store');
    assert.equal(served.headers.get('content-length'), String(png.length));
    assert.equal(served.headers.get('content-disposition'), "inline; filename*=UTF-8''Review%20%28operator%27s%29.png");
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
  }
  const head = await app.request(url, owner, {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const lastImage = await app.request(api + '/' + request.id + '/images/' + images.at(-1).id, owner);
  assert.equal(lastImage.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await lastImage.arrayBuffer()), jpeg);

  const recovery = await app.request('/api/admin/recovery', administrator, {method: 'POST'});
  assert.equal(recovery.status, 200);
  const restored = join(f.directory, 'images-recovery.sqlite');
  writeFileSync(restored, Buffer.from(await recovery.arrayBuffer()));
  const restoredApp = await f.open(new Store(restored));
  const restoredOwner = await restoredApp.login('u-exec');
  const imageAfterRestore = await restoredApp.request(url, restoredOwner);
  assert.equal(imageAfterRestore.status, 200);
  assert.deepEqual(Buffer.from(await imageAfterRestore.arrayBuffer()), png);
  assert.deepEqual((await restoredApp.json(api + '/' + request.id, restoredOwner)).data.images, images);
});

test('rejects excess or invalid image attachments without leaving a partial request', async t => {
  const f = fixture(t);
  const app = await f.open(f.first);
  const owner = await app.login('u-exec');
  const valid = image('one.png');
  const badFiles = [
    Array(6).fill(valid),
    [valid, {...valid, type: 'image/svg+xml'}],
    [valid, {...valid, type: 'image/jpeg'}],
    [valid, {...valid, data: 'data:image/png;base64,' + valid.data}],
    [valid, {...valid, data: valid.data.slice(0, -1)}],
    [valid, {...valid, name: '../screenshot.png'}],
    [valid, {name: 'oversize.png', type: 'image/png', data: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')}],
  ];
  for (const images of badFiles) {
    assert.equal((await app.post(api, owner, create('Invalid attachment', {images}))).status, 400);
  }
  assert.equal((await app.json(api, owner)).data.total, 0);
  assert.equal(app.store.db.prepare('SELECT count(*) AS count FROM development_request_images').get().count, 0);
  assert.equal(app.store.db.prepare('SELECT count(*) AS count FROM development_request_events').get().count, 0);

  const command = create('Text-only backwards compatibility');
  const stored = await app.post(api, owner, command);
  assert.equal(stored.status, 201);
  assert.deepEqual((await app.post(api, owner, {...command, images: []})).data, stored.data);
  const noWrite = await app.post(api + '/' + stored.data.request.id, owner, {...update(1, 'Closed'), images: [valid]});
  assert.equal(noWrite.status, 400);
});

test('accepts five images at the per-image byte limit in a single submission', async t => {
  const f = fixture(t);
  const app = await f.open(f.first);
  const owner = await app.login('u-exec');
  const limit = 5 * 1024 * 1024;
  const chunk = Buffer.alloc(limit - png.length, 0x61);
  chunk.writeUInt32BE(chunk.length - 12);
  chunk.write('tEXtNote\0', 4, 'latin1');
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  const atLimit = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
  const images = Array.from({length: 5}, (_, index) => image(`Limit ${index + 1}.png`, atLimit));
  const saved = await app.post(api, owner, create('Full attachment allowance', {images}));
  assert.equal(saved.status, 201);
  assert.deepEqual(saved.data.images.map(({size}) => size), Array(5).fill(limit));
});
