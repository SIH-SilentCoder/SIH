const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const os = require('os');

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'kisan_data')
  : path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');
let localDbData = {};

function initLocalStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      localDbData = JSON.parse(content || '{}');
    } else {
      localDbData = {};
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(localDbData, null, 2), 'utf-8');
      } catch (e) {
        // Read-only filesystem fallback
      }
    }
  } catch (err) {
    localDbData = {};
  }
}

function saveLocalDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(localDbData, null, 2), 'utf-8');
  } catch (err) {
    // Silent catch for read-only filesystem environments
  }
}

const getDb = () => require('../config/db');

const registry = new Map();

const associationMap = {
  farmerId: 'User',
  userId: 'User',
  centreId: 'ProcurementCentre',
  cropId: 'Crop',
  slotId: 'Slot',
  bookingId: 'Booking',
  procurementId: 'Procurement',
  paymentId: 'Payment',
  officerId: 'User',
  farmerIdNumber: 'User',
  officerIds: 'User',
  availableCrops: 'Crop',
};

const sqlIdentifier = (value) => `"${value.replace(/"/g, '""')}"`;
const postgresType = (instance) => ({
  String: 'TEXT',
  Number: 'DOUBLE PRECISION',
  Boolean: 'BOOLEAN',
  Date: 'TIMESTAMPTZ',
  ObjectId: 'TEXT',
}[instance] || 'JSONB');
const jsonKey = (field) => `'${field.replace(/'/g, "''")}'`;

function addSchemaFields(fields, schema) {
  if (schema?.paths) {
    for (const [path, definition] of Object.entries(schema.paths)) {
      if (path === '_id' || path === '__v') continue;
      const root = path.split('.')[0];
      if (path.includes('.') || definition.instance === 'Array' || definition.instance === 'Embedded') {
        fields.set(root, 'JSONB');
      } else {
        fields.set(root, postgresType(definition.instance));
      }
    }
    return;
  }

  for (const [path, definition] of Object.entries(schema || {})) {
    const root = path.split('.')[0];
    const type = definition?.type;
    if (Array.isArray(definition) || (type && Array.isArray(type)) || (typeof definition === 'object' && !type)) {
      fields.set(root, 'JSONB');
    } else {
      const instance = type?.name || type?.instance || (typeof type === 'function' ? type.name : type);
      fields.set(root, postgresType(instance));
    }
  }
}

const idValue = (value) => (value && value._id ? value._id : value);
const valuesEqual = (left, right) => String(idValue(left)) === String(idValue(right));

function getPath(document, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), document);
}

function setPath(document, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {};
    return current[key];
  }, document);
  target[last] = value;
}

function matchesValue(value, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return Object.entries(expected).every(([operator, operand]) => {
      if (operator === '$ne') return !valuesEqual(value, operand);
      if (operator === '$in') return operand.some((item) => Array.isArray(value) ? value.some((entry) => valuesEqual(entry, item)) : valuesEqual(value, item));
      if (operator === '$nin') return !operand.some((item) => valuesEqual(value, item));
      if (operator === '$gte' || operator === '$gt' || operator === '$lte' || operator === '$lt') {
        const toNum = (val) => {
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'string' && val.includes('-') && !isNaN(Date.parse(val))) return Date.parse(val);
          const num = Number(val);
          return isNaN(num) ? val : num;
        };
        const v = toNum(value);
        const o = toNum(operand);
        if (operator === '$gte') return v >= o;
        if (operator === '$gt') return v > o;
        if (operator === '$lte') return v <= o;
        if (operator === '$lt') return v < o;
      }
      if (operator === '$exists') return operand ? value !== undefined : value === undefined;
      if (operator === '$regex') {
        try {
          const flags = expected.$options || '';
          const re = new RegExp(operand, flags);
          return Array.isArray(value)
            ? value.some((item) => re.test(String(item || '')))
            : re.test(String(value || ''));
        } catch {
          return false;
        }
      }
      if (operator === '$options') return true;
      if (operator === '$size') {
        return Array.isArray(value) && value.length === Number(operand);
      }
      if (operator === '$elemMatch') {
        if (!Array.isArray(value)) return false;
        return value.some((item) => {
          if (item && typeof item === 'object') return matches(item, operand);
          return matchesValue(item, operand);
        });
      }
      return valuesEqual(value, expected);
    });
  }
  if (Array.isArray(value)) return value.some((item) => valuesEqual(item, expected));
  return valuesEqual(value, expected);
}

function matches(document, filter = {}) {
  return Object.entries(filter).every(([path, expected]) => {
    if (path === '$or') return expected.some((item) => matches(document, item));
    if (path === '$and') return expected.every((item) => matches(document, item));
    return matchesValue(getPath(document, path), expected);
  });
}

function applyUpdate(document, update = {}) {
  const operators = Object.keys(update).some((key) => key.startsWith('$'));
  if (!operators) return Object.assign(document, update);
  for (const [path, value] of Object.entries(update.$set || {})) setPath(document, path, value);
  for (const [path, value] of Object.entries(update.$inc || {})) setPath(document, path, (getPath(document, path) || 0) + value);
  for (const [path, value] of Object.entries(update.$push || {})) {
    const current = getPath(document, path) || [];
    current.push(value);
    setPath(document, path, current);
  }
  for (const [path, value] of Object.entries(update.$addToSet || {})) {
    const current = getPath(document, path) || [];
    const additions = value && value.$each ? value.$each : [value];
    additions.forEach((item) => { if (!current.some((entry) => valuesEqual(entry, item))) current.push(item); });
    setPath(document, path, current);
  }
  for (const path of update.$unset ? Object.keys(update.$unset) : []) delete document[path];
  return document;
}

class Document {
  constructor(model, data) {
    this._model = model;
    Object.assign(this, data);
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    await this._model._write(this);
    return this;
  }

  toObject() {
    const copyValue = (value, seen = new WeakSet()) => {
      if (value instanceof Date) return value.toISOString();
      if (value === null || typeof value !== 'object') return typeof value === 'function' ? undefined : value;
      if (seen.has(value)) return undefined;
      seen.add(value);
      if (Array.isArray(value)) return value.map((item) => copyValue(item, seen));
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key, item]) => key !== '_model' && typeof item !== 'function')
          .map(([key, item]) => [key, copyValue(item, seen)])
      );
    };
    return copyValue(this);
  }

  toJSON() {
    const copy = this.toObject();
    if (this._model.name === 'User') delete copy.password;
    if (this._model.name === 'Slot') copy.available = copy.capacity - copy.booked;
    return copy;
  }
}

class Query {
  constructor(model, operation) {
    this.model = model;
    this.operation = operation;
    this.transforms = [];
  }

  populate(path) { this.transforms.push({ type: 'populate', path }); return this; }
  sort(spec) { this.transforms.push({ type: 'sort', spec }); return this; }
  skip(value) { this.transforms.push({ type: 'skip', value: Number(value) }); return this; }
  limit(value) { this.transforms.push({ type: 'limit', value: Number(value) }); return this; }
  select(fields) { this.transforms.push({ type: 'select', fields }); return this; }
  session() { return this; }

  async execute() {
    let result = await this.operation();
    const many = Array.isArray(result);
    let documents = many ? result : [result];
    for (const transform of this.transforms) {
      if (transform.type === 'sort') {
        const entries = Object.entries(transform.spec);
        documents.sort((left, right) => {
          for (const [path, direction] of entries) {
            const a = getPath(left, path); const b = getPath(right, path);
            if (a === b) continue;
            return (a > b ? 1 : -1) * direction;
          }
          return 0;
        });
      } else if (transform.type === 'skip') documents = documents.slice(transform.value);
      else if (transform.type === 'limit') documents = documents.slice(0, transform.value);
      else if (transform.type === 'select') {
        const fields = transform.fields.split(/\s+/).filter(Boolean);
        const exclude = fields.filter((field) => field.startsWith('-')).map((field) => field.slice(1));
        if (exclude.length) documents.forEach((item) => item && exclude.forEach((field) => delete item[field]));
      } else if (transform.type === 'populate') {
        await Promise.all(documents.map((item) => item ? this.model._populate(item, transform.path) : null));
      }
    }
    return many ? documents : documents[0] || null;
  }

  then(resolve, reject) { return this.execute().then(resolve, reject); }
  catch(reject) { return this.execute().catch(reject); }
}

class PostgresModel {
  constructor(name, defaults = {}, methods = {}, schema = null) {
    this.name = name;
    const snakeName = name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    this.tableName = snakeName.endsWith('y') && !/[aeiou]y$/.test(snakeName)
      ? `${snakeName.slice(0, -1)}ies`
      : `${snakeName}s`;
    this.defaults = defaults;
    this.methods = methods;
    this.fields = new Map([
      ['_id', 'TEXT'],
      ['createdAt', 'TIMESTAMPTZ'],
      ['updatedAt', 'TIMESTAMPTZ'],
    ]);
    addSchemaFields(this.fields, schema);
    Object.keys(defaults).forEach((key) => {
      if (!this.fields.has(key)) this.fields.set(key, defaults[key] && typeof defaults[key] === 'object' ? 'JSONB' : postgresType(typeof defaults[key] === 'number' ? 'Number' : typeof defaults[key] === 'boolean' ? 'Boolean' : 'String'));
    });
    registry.set(name, this);
  }

  async ensureTable() {
    const db = getDb();
    if (!db.isConnected || !db.isConnected()) return;
    const pool = db.pool;

    const columns = [...this.fields.entries()].map(([field, type]) => `${sqlIdentifier(field === '_id' ? 'id' : field)} ${type}`).join(', ');
    await pool.query(`CREATE TABLE IF NOT EXISTS ${sqlIdentifier(this.tableName)} (${columns}, PRIMARY KEY ("id"))`);

    const alterCols = [...this.fields.entries()]
      .filter(([field]) => field !== '_id')
      .map(([field, type]) => `ADD COLUMN IF NOT EXISTS ${sqlIdentifier(field)} ${type}`);
    if (alterCols.length) {
      await pool.query(`ALTER TABLE ${sqlIdentifier(this.tableName)} ${alterCols.join(', ')}`);
    }

    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'data'`,
      [this.tableName]
    );
    if (rows.length) {
      for (const [field, type] of this.fields) {
        if (field === '_id') continue;
        const expression = type === 'JSONB' ? `data->${jsonKey(field)}` : `NULLIF(data->>${jsonKey(field)}, '')::${type}`;
        await pool.query(`UPDATE ${sqlIdentifier(this.tableName)} SET ${sqlIdentifier(field)} = ${expression} WHERE ${sqlIdentifier(field)} IS NULL AND data ? ${jsonKey(field)}`);
      }
      await pool.query(`ALTER TABLE ${sqlIdentifier(this.tableName)} DROP COLUMN data`);
    }

    const legacyColumns = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name IN ('created_at', 'updated_at')`,
      [this.tableName]
    );
    if (legacyColumns.rows.some(({ column_name }) => column_name === 'created_at')) {
      await pool.query(`UPDATE ${sqlIdentifier(this.tableName)} SET "createdAt" = "created_at" WHERE "createdAt" IS NULL`);
      await pool.query(`ALTER TABLE ${sqlIdentifier(this.tableName)} DROP COLUMN "created_at"`);
    }
    if (legacyColumns.rows.some(({ column_name }) => column_name === 'updated_at')) {
      await pool.query(`UPDATE ${sqlIdentifier(this.tableName)} SET "updatedAt" = "updated_at" WHERE "updatedAt" IS NULL`);
      await pool.query(`ALTER TABLE ${sqlIdentifier(this.tableName)} DROP COLUMN "updated_at"`);
    }
  }

  _document(data) {
    if (data instanceof Document) return data;
    const document = new Document(this, data);
    Object.entries(this.methods).forEach(([name, method]) => { document[name] = method.bind(document); });
    return document;
  }

  async _all() {
    const db = getDb();
    if (db.isConnected && db.isConnected()) {
      const { rows } = await db.pool.query(`SELECT * FROM ${sqlIdentifier(this.tableName)}`);
      return rows.map((row) => this._document(Object.fromEntries([...this.fields].map(([field]) => [field, row[field === '_id' ? 'id' : field]]))));
    }
    const tableData = localDbData[this.tableName] || [];
    return tableData.map((doc) => this._document({ ...doc }));
  }

  async _write(document) {
    const data = document.toObject();
    const db = getDb();
    if (db.isConnected && db.isConnected()) {
      const fields = [...this.fields.keys()];
      const columns = fields.map((field) => sqlIdentifier(field === '_id' ? 'id' : field)).join(', ');
      const values = fields.map((_, index) => `$${index + 1}`).join(', ');
      const updates = fields.filter((field) => field !== '_id').map((field) => `${sqlIdentifier(field)} = EXCLUDED.${sqlIdentifier(field)}`).join(', ');
      const parameters = fields.map((field) => {
        const value = data[field];
        return this.fields.get(field) === 'JSONB' && value !== undefined ? JSON.stringify(value) : value;
      });
      await db.pool.query(
        `INSERT INTO ${sqlIdentifier(this.tableName)} (${columns}) VALUES (${values}) ON CONFLICT ("id") DO UPDATE SET ${updates}`,
        parameters
      );
    } else {
      if (!localDbData[this.tableName]) localDbData[this.tableName] = [];
      const idx = localDbData[this.tableName].findIndex((item) => String(item._id) === String(data._id));
      if (idx >= 0) {
        localDbData[this.tableName][idx] = data;
      } else {
        localDbData[this.tableName].push(data);
      }
      saveLocalDb();
    }
  }

  _query(filter = {}, many = false) {
    return new Query(this, async () => {
      const found = (await this._all()).filter((item) => matches(item, filter));
      return many ? found : found[0] || null;
    });
  }

  find(filter) { return this._query(filter, true); }
  findOne(filter) { return this._query(filter, false); }
  findById(id) { return this._query({ _id: id }, false); }
  countDocuments(filter = {}) { return this._all().then((items) => items.filter((item) => matches(item, filter)).length); }
  create(data) {
    if (Array.isArray(data)) return Promise.all(data.map((item) => this.create(item)));
    const now = new Date().toISOString();
    const document = this._document({ ...this.defaults, ...data, _id: data._id || randomUUID(), createdAt: data.createdAt || now, updatedAt: now });
    if (this.name === 'User' && document.password && !document.password.startsWith('$2')) {
      return bcrypt.hash(document.password, 12).then((password) => { document.password = password; return document.save(); });
    }
    return document.save();
  }
  insertMany(data) { return this.create(data); }
  async deleteMany(filter = {}) {
    const db = getDb();
    if (Object.keys(filter).length === 0) {
      if (db.isConnected && db.isConnected()) {
        await db.pool.query(`DELETE FROM ${sqlIdentifier(this.tableName)}`);
      } else {
        localDbData[this.tableName] = [];
        saveLocalDb();
      }
      return { deletedCount: 0 };
    }
    const items = (await this._all()).filter((item) => matches(item, filter));
    if (items.length) {
      if (db.isConnected && db.isConnected()) {
        await db.pool.query(`DELETE FROM ${sqlIdentifier(this.tableName)} WHERE id = ANY($1)`, [items.map((item) => item._id)]);
      } else {
        const idsToDelete = new Set(items.map((item) => String(item._id)));
        localDbData[this.tableName] = (localDbData[this.tableName] || []).filter((item) => !idsToDelete.has(String(item._id)));
        saveLocalDb();
      }
    }
    return { deletedCount: items.length };
  }
  async _update(filter, update, options = {}) {
    let document = (await this._all()).find((item) => matches(item, filter));
    if (!document) {
      if (options && options.upsert) {
        const createData = { ...filter };
        applyUpdate(createData, update);
        return this.create(createData);
      }
      return null;
    }
    applyUpdate(document, update);
    await document.save();
    return document;
  }
  findByIdAndUpdate(id, update, options) { return new Query(this, () => this._update({ _id: id }, update, options)); }
  findOneAndUpdate(filter, update, options) { return new Query(this, () => this._update(filter, update, options)); }
  async findByIdAndDelete(id) { const item = await this.findById(id); if (item) await this.deleteMany({ _id: id }); return item; }

  async _populate(document, path) {
    if (!document) return document;
    const modelName = associationMap[path] || associationMap[path.replace(/s$/, '')];
    if (!modelName) return document;
    const target = registry.get(modelName);
    if (!target) return document;
    const value = getPath(document, path);
    const values = Array.isArray(value) ? value : [value];
    const populated = await Promise.all(values.filter(Boolean).map((id) => target.findById(id)));
    setPath(document, path, Array.isArray(value) ? populated.filter(Boolean) : populated[0] || value);
    return document;
  }

  async aggregate(pipeline) {
    let rows = await this._all();
    for (const stage of pipeline) {
      if (stage.$match) rows = rows.filter((row) => matches(row, stage.$match));
      if (stage.$unwind) rows = rows.flatMap((row) => {
        const path = stage.$unwind.replace('$', ''); const value = getPath(row, path);
        return Array.isArray(value) ? value.map((item) => { const copy = JSON.parse(JSON.stringify(row)); setPath(copy, path, item); return copy; }) : [row];
      });
      if (stage.$sort) rows.sort((a, b) => Object.entries(stage.$sort).reduce((result, [path, dir]) => result || ((getPath(a, path) > getPath(b, path) ? 1 : -1) * dir), 0));
      if (stage.$limit) rows = rows.slice(0, stage.$limit);
      if (stage.$project) rows = rows.map((row) => Object.fromEntries(Object.entries(stage.$project).filter(([, include]) => include).map(([key, expression]) => [key, expression === 1 ? getPath(row, key) : getPath(row, String(expression).replace('$', ''))])));
    }
    return rows;
  }
}

module.exports = { PostgresModel, registry, initLocalStorage };
