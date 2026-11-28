import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {makeServer} from '../server/index.mjs';
import {Store} from '../server/store.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';

const api = '/api/development-requests';
const password = 'Synthetic-requests-password-2026';
const create = (title, extra = {}) => ({title, description: 'Page detail from the reporter', requestId: randomUUID(), ...extra});
const update = (expectedVersion, status, note = '') => ({status, note, expectedVersion, requestId: randomUUID()});

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
