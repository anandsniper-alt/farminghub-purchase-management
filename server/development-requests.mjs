import {createHash, randomUUID} from 'node:crypto';
import {RuleError} from '../shared/domain.mjs';

export const DEVELOPMENT_REQUESTS_API = '/api/development-requests';
export const isDevelopmentRequestsApi = path => path === DEVELOPMENT_REQUESTS_API || path.startsWith(DEVELOPMENT_REQUESTS_API + '/');

const maxImages = 5;
const maxImageBytes = 5 * 1024 * 1024;
const maxEncodedImageLength = Math.ceil(maxImageBytes / 3) * 4;
export const DEVELOPMENT_REQUEST_CREATE_BYTES = maxImages * maxEncodedImageLength + 64 * 1024;

const statuses = ['Open', 'In progress', 'Resolved', 'Closed'];
const priorities = ['Normal', 'High', 'Low'];
const createFields = ['title', 'description', 'screen', 'route', 'priority', 'requestId', 'images'];
const updateFields = ['status', 'note', 'expectedVersion', 'requestId'];
const canManage = actor => ['ADMIN', 'MANAGER'].includes(actor.role);
const person = (id, name) => ({id, name});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

function hasPngStructure(bytes) {
  if (bytes.length < 57 || !bytes.subarray(0, 16).equals(pngHeader) ||
    !bytes.readUInt32BE(16) || !bytes.readUInt32BE(20)) return false;
  let imageData = false;
  for (let start = 33; start + 12 <= bytes.length;) {
    const size = bytes.readUInt32BE(start);
    const type = bytes.toString('latin1', start + 4, start + 8);
    start += size + 12;
    if (start > bytes.length) return false;
    if (type === 'IDAT' && size > 0) imageData = true;
    if (type === 'IEND') return imageData && size === 0 && start === bytes.length;
  }
  return false;
}

function hasJpegStructure(bytes) {
  if (bytes.length < 20 || bytes.readUInt16BE() !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return false;
  let frame = false;
  for (let start = 2; start + 4 <= bytes.length;) {
    if (bytes[start++] !== 0xff) return false;
    while (start < bytes.length && bytes[start] === 0xff) start++;
    if (start + 3 > bytes.length) return false;
    const marker = bytes[start++];
    const size = bytes.readUInt16BE(start);
    if (size < 2 || start + size > bytes.length - 2) return false;
    if (marker === 0xda) return frame && size >= 6 && start + size < bytes.length - 2;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (size < 8 || !bytes.readUInt16BE(start + 3) || !bytes.readUInt16BE(start + 5)) return false;
      frame = true;
    }
    start += size;
  }
  return false;
}

function imageType(bytes) {
  if (hasPngStructure(bytes)) return 'image/png';
  if (hasJpegStructure(bytes)) return 'image/jpeg';
  if (bytes.length >= 26 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.readUInt32LE(4) === bytes.length - 8 &&
    bytes.toString('latin1', 8, 12) === 'WEBP') {
    const firstChunk = bytes.toString('latin1', 12, 16);
    const size = bytes.readUInt32LE(16);
    if (firstChunk === 'VP8 ' && size >= 10 && size <= bytes.length - 20 &&
      bytes.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) return 'image/webp';
    if (firstChunk === 'VP8L' && size >= 5 && size <= bytes.length - 20 && bytes[20] === 0x2f) return 'image/webp';
    if (firstChunk === 'VP8X' && size === 10 && bytes.length >= 38) return 'image/webp';
  }
  return null;
}

function readImages(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > maxImages) throw new RuleError('Attach up to five images.');
  return input.map(image => {
    if (!image || typeof image !== 'object' || Array.isArray(image) || Object.keys(image).some(key => !['name', 'type', 'data'].includes(key))) {
      throw new RuleError('Invalid image attachment.');
    }
    const name = field(image.name, 'Image name', 200, {required: true});
    if (!name.isWellFormed() || /[\\/]/.test(name)) throw new RuleError('Invalid image name.');
    const {type, data} = image;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw new RuleError('Choose PNG, JPEG or WebP images.');
    if (typeof data !== 'string' || !data.length || data.length > maxEncodedImageLength) throw new RuleError('Each image must contain data and be 5 MB or smaller.');
    const bytes = Buffer.from(data, 'base64');
    if (bytes.toString('base64') !== data) throw new RuleError('Invalid image encoding.');
    if (!bytes.length || bytes.length > maxImageBytes) throw new RuleError('Each image must contain data and be 5 MB or smaller.');
    if (imageType(bytes) !== type) throw new RuleError('An attachment does not match its image format.');
    return {name, type, bytes, digest: createHash('sha256').update(bytes).digest('hex')};
  });
}

function requestView(row) {
  return {
    id: row.id, title: row.title, description: row.description, screen: row.screen, route: row.route,
    priority: row.priority, status: row.status, createdBy: person(row.created_by_id, row.created_by_name),
    createdAt: row.created_at, updatedAt: row.updated_at, version: row.version,
  };
}

function eventView(row) {
  return {
    id: row.id, actor: person(row.actor_id, row.actor_name), fromStatus: row.from_status,
    toStatus: row.to_status, note: row.note, at: row.at, version: row.version,
  };
}

function field(input, label, max, {required = false, multiline = false} = {}) {
  const value = input === undefined ? '' : input;
  const controlCharacters = multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/;
  if (typeof value !== 'string' || value.length > max || controlCharacters.test(value) || (required && !value.trim())) {
    throw new RuleError(`${label} must contain ${required ? '1 to ' : 'up to '}${max} characters.`);
  }
  return value.trim();
}

function validateCommand(input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !fields.includes(key))) {
    throw new RuleError('Invalid development request.');
  }
  if (typeof input.requestId !== 'string' || !/^[A-Za-z0-9_-]{12,120}$/.test(input.requestId)) {
    throw new RuleError('A valid request ID is required.');
  }
}

function positiveInteger(value, fallback, max, label) {
  if (value === null) return fallback;
  if (!/^[1-9][0-9]*$/.test(value) || Number(value) > max) throw new RuleError(`Invalid ${label}.`);
  return Number(value);
}

export class DevelopmentRequestStore {
  constructor(store, application) {
    this.store = store;
    this.db = store.db;
    this.application = application;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS development_requests (
        application TEXT NOT NULL CHECK(application IN ('purchase', 'implements')),
        id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        screen TEXT NOT NULL,
        route TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('Normal', 'High', 'Low')),
        status TEXT NOT NULL CHECK(status IN ('Open', 'In progress', 'Resolved', 'Closed')),
        created_by_id TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL CHECK(version >= 1),
        search_text TEXT NOT NULL,
        PRIMARY KEY(application, id)
      );
      CREATE INDEX IF NOT EXISTS development_requests_by_reporter
        ON development_requests(application, created_by_id, created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS development_requests_by_date
        ON development_requests(application, created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS development_requests_by_status
        ON development_requests(application, status, created_at DESC, id DESC);
      CREATE TABLE IF NOT EXISTS development_request_events (
        application TEXT NOT NULL,
        id TEXT NOT NULL PRIMARY KEY,
        request_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        note TEXT NOT NULL,
        at TEXT NOT NULL,
        version INTEGER NOT NULL,
        retry_key TEXT NOT NULL,
        digest TEXT NOT NULL,
        access TEXT NOT NULL,
        FOREIGN KEY(application, request_id) REFERENCES development_requests(application, id),
        UNIQUE(application, request_id, version),
        UNIQUE(application, actor_id, retry_key)
      );
      CREATE TRIGGER IF NOT EXISTS development_request_events_no_update
        BEFORE UPDATE ON development_request_events BEGIN SELECT RAISE(ABORT,'Development request history is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS development_request_events_no_delete
        BEFORE DELETE ON development_request_events BEGIN SELECT RAISE(ABORT,'Development request history is append-only'); END;
      CREATE TABLE IF NOT EXISTS development_request_images (
        application TEXT NOT NULL,
        request_id TEXT NOT NULL,
        id TEXT NOT NULL,
        position INTEGER NOT NULL CHECK(position BETWEEN 1 AND ${maxImages}),
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('image/png', 'image/jpeg', 'image/webp')),
        size INTEGER NOT NULL CHECK(size BETWEEN 1 AND ${maxImageBytes}),
        content BLOB NOT NULL CHECK(length(content) = size),
        PRIMARY KEY(application, request_id, id),
        UNIQUE(application, request_id, position),
        FOREIGN KEY(application, request_id) REFERENCES development_requests(application, id)
      );
    `);
  }

  #transaction(callback, write = false) {
    this.db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
    try {
      const result = callback();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  #actor(sessionToken) {
    const actor = this.store.session(sessionToken)?.user;
    if (!actor) throw new RuleError('An active sign-in is required.', 'FORBIDDEN');
    return actor;
  }

  list(sessionToken, params) {
    const status = params.get('status') ?? '';
    if (status && !statuses.includes(status)) throw new RuleError('Select a valid status.');
    const search = field(params.get('search') ?? '', 'Search', 120).toLowerCase();
    const reporterId = field(params.get('reporterId') ?? '', 'Reporter ID', 128);
    const mine = params.get('mine');
    if (![null, '', '0', '1'].includes(mine) || (mine === '1' && reporterId)) {
      throw new RuleError('Select one valid reporter filter.');
    }
    const page = positiveInteger(params.get('page'), 1, Math.floor(Number.MAX_SAFE_INTEGER / 100), 'page');
    const pageSize = positiveInteger(params.get('pageSize'), 20, 100, 'page size');

    return this.#transaction(() => {
      const actor = this.#actor(sessionToken);
      const manager = canManage(actor);
      if (!manager && reporterId && reporterId !== actor.id) throw new RuleError('Reporter access is not permitted.', 'FORBIDDEN');
      const clauses = ['application = ?'];
      const values = [this.application];
      if (!manager || mine === '1' || reporterId) {
        clauses.push('created_by_id = ?');
        values.push(!manager || mine === '1' ? actor.id : reporterId);
      }
      if (status) {
        clauses.push('status = ?');
        values.push(status);
      }
      if (search) {
        clauses.push('instr(search_text, ?) > 0');
        values.push(search);
      }
      const where = clauses.join(' AND ');
      const total = this.db.prepare(`SELECT count(*) AS count FROM development_requests WHERE ${where}`).get(...values).count;
      const requests = this.db.prepare(`
        SELECT * FROM development_requests WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
      `).all(...values, pageSize, (page - 1) * pageSize).map(requestView);
      const reporterScope = manager ? '' : ' AND created_by_id = ?';
      const reporterArgs = manager ? [this.application] : [this.application, actor.id];
      const reporters = this.db.prepare(`
        WITH counts AS (
          SELECT count(*) AS count, max(rowid) AS latest FROM development_requests
          WHERE application = ?${reporterScope} GROUP BY created_by_id
        )
        SELECT request.created_by_id AS id, request.created_by_name AS name, counts.count
        FROM counts JOIN development_requests AS request ON request.rowid = counts.latest
        ORDER BY name COLLATE NOCASE, id
      `).all(...reporterArgs);
      return {requests, total, page, pageSize, reporters, canManage: manager};
    });
  }

  #request(actor, id) {
    const row = this.db.prepare('SELECT * FROM development_requests WHERE application = ? AND id = ?').get(this.application, id);
    if (!row || (!canManage(actor) && row.created_by_id !== actor.id)) throw new RuleError('Request not found.', 'NOT_FOUND');
    return requestView(row);
  }

  #detail(actor, id) {
    const request = this.#request(actor, id);
    const history = this.db.prepare(`
      SELECT * FROM development_request_events WHERE application = ? AND request_id = ? ORDER BY version
    `).all(this.application, id).map(eventView);
    const images = this.db.prepare(`
      SELECT id, name, type, size FROM development_request_images WHERE application = ? AND request_id = ? ORDER BY position
    `).all(this.application, id);
    return {request, history, images, canManage: canManage(actor)};
  }

  detail(sessionToken, id) {
    return this.#transaction(() => this.#detail(this.#actor(sessionToken), id));
  }

  image(sessionToken, requestId, imageId) {
    return this.#transaction(() => {
      this.#request(this.#actor(sessionToken), requestId);
      const image = this.db.prepare(`
        SELECT name, type, size, content FROM development_request_images WHERE application = ? AND request_id = ? AND id = ?
      `).get(this.application, requestId, imageId);
      if (!image) throw new RuleError('Image not found.', 'NOT_FOUND');
      return image;
    });
  }

  #save(sessionToken, requestId, digest, write, {managerOnly = false} = {}) {
    return this.#transaction(() => {
      const actor = this.#actor(sessionToken);
      if (managerOnly && !canManage(actor)) throw new RuleError('Manager or administrator access is required.', 'FORBIDDEN');
      const access = hash([actor.role, [...actor.scopes].sort()]);
      const prior = this.db.prepare(`
        SELECT request_id, digest, access FROM development_request_events
        WHERE application = ? AND actor_id = ? AND retry_key = ?
      `).get(this.application, actor.id, requestId);
      if (prior) {
        if (prior.digest !== digest) throw new RuleError('This request ID was already used for different content.', 'CONFLICT');
        if (prior.access !== access) throw new RuleError('Account access changed. Review the saved request before continuing.', 'FORBIDDEN');
        return this.#detail(actor, prior.request_id);
      }
      const at = new Date().toISOString();
      const event = write(actor, at);
      this.db.prepare(`
        INSERT INTO development_request_events
          (application, id, request_id, actor_id, actor_name, from_status, to_status, note, at, version, retry_key, digest, access)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(this.application, randomUUID(), event.id, actor.id, actor.name, event.fromStatus, event.toStatus, event.note,
        at, event.version, requestId, digest, access);
      return this.#detail(actor, event.id);
    }, true);
  }

  create(sessionToken, input) {
    validateCommand(input, createFields);
    const title = field(input.title, 'Title', 120, {required: true});
    const description = field(input.description, 'Description', 4000, {required: true, multiline: true});
    const screen = field(input.screen, 'Screen', 120);
    const route = field(input.route, 'Route', 500);
    if (route && (!route.startsWith('/') || route.startsWith('//') || route.includes('\\'))) throw new RuleError('Enter a local screen route.');
    const priority = input.priority === undefined ? 'Normal' : input.priority;
    if (!priorities.includes(priority)) throw new RuleError('Select a valid priority.');
    const images = readImages(input.images);
    const fingerprint = ['create', title, description, screen, route, priority];
    if (images.length) fingerprint.push(images.map(({name, type, digest}) => [name, type, digest]));

    return this.#save(sessionToken, input.requestId, hash(fingerprint), (actor, at) => {
      const id = 'DR-' + randomUUID();
      const search = [id, title, description, screen, route, actor.name].join('\n').toLowerCase();
      this.db.prepare(`
        INSERT INTO development_requests
          (application, id, title, description, screen, route, priority, status, created_by_id, created_by_name, created_at, updated_at, version, search_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, 1, ?)
      `).run(this.application, id, title, description, screen, route, priority, actor.id, actor.name, at, at, search);
      if (images.length) {
        const insert = this.db.prepare(`
          INSERT INTO development_request_images (application, request_id, id, position, name, type, size, content)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        images.forEach(({name, type, bytes}, index) => insert.run(this.application, id, randomUUID(), index + 1, name, type, bytes.length, bytes));
      }
      return {id, fromStatus: null, toStatus: 'Open', note: '', version: 1};
    });
  }

  update(sessionToken, id, input) {
    validateCommand(input, updateFields);
    const {status, expectedVersion, requestId} = input;
    if (!statuses.includes(status)) throw new RuleError('Select a valid status.');
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new RuleError('Reload the request before saving.');
    const note = field(input.note, 'Note', 2000, {multiline: true});

    return this.#save(sessionToken, requestId, hash(['update', id, status, note, expectedVersion]), (actor, at) => {
      const current = this.#request(actor, id);
      if (current.version !== expectedVersion) throw new RuleError('This request changed. Reload and review before saving.', 'CONFLICT');
      if (current.status === status && !note) throw new RuleError('Change the status or add a note.');
      this.db.prepare(`
        UPDATE development_requests SET status = ?, updated_at = ?, version = version + 1
        WHERE application = ? AND id = ?
      `).run(status, at, this.application, id);
      return {id, fromStatus: current.status, toStatus: status, note, version: expectedVersion + 1};
    }, {managerOnly: true});
  }
}
