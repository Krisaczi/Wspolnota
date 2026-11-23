"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/db/client.ts
var import_sql = __toESM(require("sql.js"), 1);

// wasm-url:/tmp/cc-agent/73074522/project/node_modules/sql.js/dist/sql-wasm.wasm
var sql_wasm_default = "/tmp/cc-agent/73074522/project/node_modules/sql.js/dist/sql-wasm.wasm";

// .harness/persistenceStub.ts
async function loadDatabaseBytes() {
  return null;
}
async function saveDatabaseBytes(_bytes) {
}

// src/db/schema/accountingSchema.ts
var ACCOUNTING_SCHEMA_SQL = `
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY')),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    system_account INTEGER NOT NULL DEFAULT 0 CHECK (system_account IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    description TEXT NOT NULL CHECK (length(trim(description)) > 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    source_type TEXT CHECK (source_type IS NULL OR source_type IN ('payment')),
    source_id INTEGER,
    reversal_of_id INTEGER REFERENCES journal_entries(id) ON DELETE RESTRICT
  );
  CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
  CREATE INDEX idx_journal_entries_source ON journal_entries(source_type, source_id);

  CREATE TABLE journal_entry_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit_amount REAL NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount REAL NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
  );
  CREATE INDEX idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
  CREATE INDEX idx_journal_lines_account ON journal_entry_lines(account_id);

  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    summary TEXT NOT NULL
  );

  INSERT INTO accounts (code, name, type, system_account) VALUES
    ('1010', 'Bank Account', 'ASSET', 1),
    ('1020', 'Cash Account', 'ASSET', 1),
    ('1100', 'Receivables from Owners', 'ASSET', 1),
    ('2010', 'Owner Prepayments', 'LIABILITY', 1),
    ('2020', 'Supplier Payables', 'LIABILITY', 1),
    ('4010', 'Cleaning Services', 'EXPENSE', 1),
    ('4020', 'Electricity', 'EXPENSE', 1),
    ('4030', 'Water and Sewage', 'EXPENSE', 1),
    ('4040', 'Waste Disposal', 'EXPENSE', 1),
    ('4050', 'Bank Charges', 'EXPENSE', 1),
    ('4060', 'Maintenance and Repairs', 'EXPENSE', 1),
    ('4070', 'Insurance', 'EXPENSE', 1),
    ('4080', 'Administrative Costs', 'EXPENSE', 1),
    ('7010', 'Monthly Community Fees', 'INCOME', 1),
    ('7020', 'Interest Income', 'INCOME', 1),
    ('7090', 'Other Income', 'INCOME', 1);
`;

// src/db/migrations.ts
var migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT
      );

      CREATE TABLE apartments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_number TEXT NOT NULL UNIQUE,
        owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
        area_m2 REAL NOT NULL DEFAULT 0 CHECK (area_m2 >= 0),
        residents_count INTEGER NOT NULL DEFAULT 0 CHECK (residents_count >= 0),
        share_ratio REAL NOT NULL DEFAULT 0 CHECK (share_ratio >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
      );

      CREATE TABLE charge_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        calculation_method TEXT NOT NULL CHECK (calculation_method IN ('per_sqm', 'per_resident', 'fixed', 'percentage')),
        rate REAL NOT NULL DEFAULT 0 CHECK (rate >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
      );

      CREATE TABLE monthly_charges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        charge_type_id INTEGER NOT NULL REFERENCES charge_types(id) ON DELETE RESTRICT,
        billing_period TEXT NOT NULL,
        amount REAL NOT NULL,
        UNIQUE (apartment_id, charge_type_id, billing_period)
      );
      CREATE INDEX idx_monthly_charges_period ON monthly_charges(billing_period);

      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        description TEXT
      );
      CREATE INDEX idx_payments_apartment ON payments(apartment_id);

      CREATE TABLE meter_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        meter_type_id INTEGER NOT NULL REFERENCES meter_types(id) ON DELETE RESTRICT,
        reading_date TEXT NOT NULL,
        reading_value REAL NOT NULL CHECK (reading_value >= 0),
        UNIQUE (apartment_id, meter_type_id, reading_date)
      );

      CREATE TABLE ownership_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        from_owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
        to_owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
        transfer_date TEXT NOT NULL,
        note TEXT
      );

      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT INTO meter_types (name) VALUES ('Cold water'), ('Hot water'), ('Electricity'), ('Gas'), ('Heating');
    `
  },
  {
    version: 2,
    sql: ACCOUNTING_SCHEMA_SQL
  },
  {
    version: 3,
    sql: `ALTER TABLE meter_readings ADD COLUMN rate REAL;`
  },
  {
    version: 4,
    sql: `ALTER TABLE apartments ADD COLUMN starting_balance REAL NOT NULL DEFAULT 0;`
  },
  {
    version: 5,
    sql: `
      ALTER TABLE meter_readings ADD COLUMN advance_months INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meter_readings ADD COLUMN advance_monthly_amount REAL NOT NULL DEFAULT 0;
    `
  }
];
function runMigrations(db) {
  const currentVersion = Number(db.exec("PRAGMA user_version")[0].values[0][0]);
  let applied = false;
  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    db.exec("BEGIN TRANSACTION");
    try {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec("COMMIT");
      applied = true;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return applied;
}

// src/db/client.ts
var SAVE_DEBOUNCE_MS = 400;
var database = null;
var saveTimer;
var saveChain = Promise.resolve();
function requireDatabase() {
  if (!database) throw new Error("Database has not been opened yet");
  return database;
}
async function persistNow() {
  const bytes = requireDatabase().export();
  saveChain = saveChain.then(() => saveDatabaseBytes(bytes));
  await saveChain;
}
function scheduleSave() {
  if (saveTimer !== void 0) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = void 0;
    void persistNow();
  }, SAVE_DEBOUNCE_MS);
}
async function openDatabase() {
  const SQL = await (0, import_sql.default)({ locateFile: () => sql_wasm_default });
  const stored = await loadDatabaseBytes();
  database = stored ? new SQL.Database(stored) : new SQL.Database();
  database.exec("PRAGMA foreign_keys = ON");
  if (runMigrations(database) || !stored) {
    await persistNow();
  }
}
function queryRows(sql, params = []) {
  const statement = requireDatabase().prepare(sql);
  try {
    statement.bind(params);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}
function execute(sql, params = []) {
  const db = requireDatabase();
  db.run(sql, params);
  scheduleSave();
  return db.getRowsModified();
}
function lastInsertId() {
  return Number(queryRows("SELECT last_insert_rowid() AS id")[0].id);
}
var transactionDepth = 0;
function withTransaction(operation) {
  const db = requireDatabase();
  const isOutermost = transactionDepth === 0;
  const savepoint = `sp_${transactionDepth}`;
  db.exec(isOutermost ? "BEGIN TRANSACTION" : `SAVEPOINT ${savepoint}`);
  transactionDepth += 1;
  try {
    const result = operation();
    transactionDepth -= 1;
    db.exec(isOutermost ? "COMMIT" : `RELEASE ${savepoint}`);
    if (isOutermost) scheduleSave();
    return result;
  } catch (error) {
    transactionDepth -= 1;
    db.exec(isOutermost ? "ROLLBACK" : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
    throw error;
  }
}

// node_modules/i18next/dist/esm/i18next.js
var isString = (obj) => typeof obj === "string";
var defer = () => {
  let res;
  let rej;
  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });
  promise.resolve = res;
  promise.reject = rej;
  return promise;
};
var makeString = (object) => {
  if (object == null) return "";
  return String(object);
};
var isSafeLanguageCode = (code) => isString(code) && /^[A-Za-z0-9_@.-]{1,128}$/.test(code) && !code.includes("..") && !["__proto__", "constructor", "prototype"].includes(code);
var callbackApiOf = (plugin) => plugin?.callbackApi ?? plugin?.constructor?.callbackApi;
var copy = (a, s, t2) => {
  a.forEach((m) => {
    if (s[m]) t2[m] = s[m];
  });
};
var lastOfPathSeparatorRegExp = /###/g;
var cleanKey = (key) => key && key.includes("###") ? key.replace(lastOfPathSeparatorRegExp, ".") : key;
var canNotTraverseDeeper = (object) => !object || isString(object);
var getLastOfPath = (object, path, Empty) => {
  const stack = !isString(path) ? path : path.split(".");
  let stackIndex = 0;
  while (stackIndex < stack.length - 1) {
    if (canNotTraverseDeeper(object)) return {};
    const key = cleanKey(stack[stackIndex]);
    if (!object[key] && Empty) object[key] = new Empty();
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      object = object[key];
    } else {
      object = {};
    }
    ++stackIndex;
  }
  if (canNotTraverseDeeper(object)) return {};
  return {
    obj: object,
    k: cleanKey(stack[stackIndex])
  };
};
var setPath = (object, path, newValue) => {
  const {
    obj,
    k
  } = getLastOfPath(object, path, Object);
  if (obj !== void 0 || path.length === 1) {
    obj[k] = newValue;
    return;
  }
  let e = path[path.length - 1];
  let p = path.slice(0, path.length - 1);
  let last = getLastOfPath(object, p, Object);
  while (last.obj === void 0 && p.length) {
    e = `${p[p.length - 1]}.${e}`;
    p = p.slice(0, p.length - 1);
    last = getLastOfPath(object, p, Object);
    if (last?.obj && typeof last.obj[`${last.k}.${e}`] !== "undefined") {
      last.obj = void 0;
    }
  }
  last.obj[`${last.k}.${e}`] = newValue;
};
var pushPath = (object, path, newValue, concat) => {
  const {
    obj,
    k
  } = getLastOfPath(object, path, Object);
  obj[k] = obj[k] || [];
  obj[k].push(newValue);
};
var getPath = (object, path) => {
  const {
    obj,
    k
  } = getLastOfPath(object, path);
  if (!obj) return void 0;
  if (!Object.prototype.hasOwnProperty.call(obj, k)) return void 0;
  return obj[k];
};
var getPathWithDefaults = (data, defaultData, key) => {
  const value = getPath(data, key);
  if (value !== void 0) {
    return value;
  }
  return getPath(defaultData, key);
};
var deepExtend = (target, source, overwrite) => {
  for (const prop in source) {
    if (prop !== "__proto__" && prop !== "constructor") {
      if (Object.prototype.hasOwnProperty.call(target, prop)) {
        if (isString(target[prop]) || target[prop] instanceof String || isString(source[prop]) || source[prop] instanceof String) {
          if (overwrite) target[prop] = source[prop];
        } else {
          deepExtend(target[prop], source[prop], overwrite);
        }
      } else {
        target[prop] = source[prop];
      }
    }
  }
  return target;
};
var regexEscape = (str) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
var _entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var escape = (data) => {
  if (isString(data)) {
    return data.replace(/[&<>"']/g, (s) => _entityMap[s]);
  }
  return data;
};
var RegExpCache = class {
  constructor(capacity) {
    this.capacity = capacity;
    this.regExpMap = /* @__PURE__ */ new Map();
    this.regExpQueue = [];
  }
  getRegExp(pattern) {
    const regExpFromCache = this.regExpMap.get(pattern);
    if (regExpFromCache !== void 0) {
      return regExpFromCache;
    }
    const regExpNew = new RegExp(pattern);
    if (this.regExpQueue.length === this.capacity) {
      this.regExpMap.delete(this.regExpQueue.shift());
    }
    this.regExpMap.set(pattern, regExpNew);
    this.regExpQueue.push(pattern);
    return regExpNew;
  }
};
var chars = [" ", ",", "?", "!", ";"];
var looksLikeObjectPathRegExpCache = new RegExpCache(20);
var looksLikeObjectPath = (key, nsSeparator, keySeparator) => {
  nsSeparator = nsSeparator || "";
  keySeparator = keySeparator || "";
  const possibleChars = chars.filter((c) => !nsSeparator.includes(c) && !keySeparator.includes(c));
  if (possibleChars.length === 0) return true;
  const r = looksLikeObjectPathRegExpCache.getRegExp(`(${possibleChars.map((c) => c === "?" ? "\\?" : c).join("|")})`);
  let matched = !r.test(key);
  if (!matched) {
    const ki = key.indexOf(keySeparator);
    if (ki > 0 && !r.test(key.substring(0, ki))) {
      matched = true;
    }
  }
  return matched;
};
var deepFind = (obj, path, keySeparator = ".") => {
  if (!obj) return void 0;
  if (obj[path]) {
    if (!Object.prototype.hasOwnProperty.call(obj, path)) return void 0;
    return obj[path];
  }
  if (!keySeparator) {
    return Object.prototype.hasOwnProperty.call(obj, path) ? obj[path] : void 0;
  }
  const tokens = path.split(keySeparator);
  let current = obj;
  for (let i = 0; i < tokens.length; ) {
    if (!current || typeof current !== "object") {
      return void 0;
    }
    let next;
    let nextPath = "";
    for (let j = i; j < tokens.length; ++j) {
      if (j !== i) {
        nextPath += keySeparator;
      }
      nextPath += tokens[j];
      next = current[nextPath];
      if ((typeof next === "function" || nextPath === "__proto__") && !Object.prototype.hasOwnProperty.call(current, nextPath)) {
        next = void 0;
      }
      if (next !== void 0) {
        if (["string", "number", "boolean"].includes(typeof next) && j < tokens.length - 1) {
          continue;
        }
        i += j - i + 1;
        break;
      }
    }
    current = next;
  }
  return current;
};
var getCleanedCode = (code) => code?.replace(/_/g, "-");
var consoleLogger = {
  type: "logger",
  log(args) {
    this.output("log", args);
  },
  warn(args) {
    this.output("warn", args);
  },
  error(args) {
    this.output("error", args);
  },
  output(type, args) {
    console?.[type]?.apply?.(console, args);
  }
};
var Logger = class _Logger {
  constructor(concreteLogger, options = {}) {
    this.init(concreteLogger, options);
  }
  init(concreteLogger, options = {}) {
    this.prefix = options.prefix || "i18next:";
    this.logger = concreteLogger || consoleLogger;
    this.options = options;
    this.debug = options.debug;
    this.seen = /* @__PURE__ */ new Set();
  }
  log(...args) {
    return this.forward(args, "log", "", true);
  }
  warn(...args) {
    return this.forward(args, "warn", "", true);
  }
  error(...args) {
    return this.forward(args, "error", "");
  }
  deprecate(...args) {
    return this.forward(args, "warn", "WARNING DEPRECATED: ", true);
  }
  once(key, lvl, ...args) {
    if (!this.debug || this.seen.has(key) || this.seen.size >= 1e3) return null;
    this.seen.add(key);
    return this[lvl](...args);
  }
  forward(args, lvl, prefix, debugOnly) {
    if (debugOnly && !this.debug) return null;
    args = args.map((a) => isString(a) ? a.replace(/[\r\n\x00-\x1F\x7F]/g, " ") : a);
    if (isString(args[0])) args[0] = `${prefix}${this.prefix} ${args[0]}`;
    return this.logger[lvl](args);
  }
  create(moduleName) {
    return new _Logger(this.logger, {
      ...{
        prefix: `${this.prefix}:${moduleName}:`
      },
      ...this.options
    });
  }
  clone(options) {
    options = options || this.options;
    options.prefix = options.prefix || this.prefix;
    return new _Logger(this.logger, options);
  }
};
var baseLogger = new Logger();
var EventEmitter = class {
  constructor() {
    this.observers = {};
  }
  on(events, listener) {
    events.split(" ").forEach((event) => {
      if (!this.observers[event]) this.observers[event] = /* @__PURE__ */ new Map();
      const numListeners = this.observers[event].get(listener) || 0;
      this.observers[event].set(listener, numListeners + 1);
    });
    return this;
  }
  off(events, listener) {
    (typeof events === "string" ? events.split(" ") : [events]).forEach((event) => {
      if (!this.observers[event]) return;
      if (!listener) {
        delete this.observers[event];
        return;
      }
      this.observers[event].delete(listener);
    });
  }
  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
    return this;
  }
  emit(event, ...args) {
    if (this.observers[event]) {
      const cloned = Array.from(this.observers[event].entries());
      cloned.forEach(([observer, numTimesAdded]) => {
        for (let i = 0; i < numTimesAdded; i++) {
          observer(...args);
        }
      });
    }
    if (this.observers["*"]) {
      const cloned = Array.from(this.observers["*"].entries());
      cloned.forEach(([observer, numTimesAdded]) => {
        for (let i = 0; i < numTimesAdded; i++) {
          observer(event, ...args);
        }
      });
    }
  }
};
var nonEmptyBundles = /* @__PURE__ */ new WeakSet();
var assertSeparateArguments = (method, ...args) => {
  if (args.some((a) => !isString(a))) {
    throw new TypeError(`${method}: pass language, namespace${method === "addResource" ? " and key" : ""} as separate strings; the dotted form ('en.translation.key') was removed in i18next v27`);
  }
};
var ResourceStore = class extends EventEmitter {
  constructor(data, options = {
    ns: ["translation"],
    defaultNS: "translation"
  }, logger = baseLogger) {
    super();
    this.data = data || {};
    this.options = options;
    this.logger = logger.create("resourceStore");
    if (this.options.keySeparator === void 0) {
      this.options.keySeparator = ".";
    }
    if (this.options.ignoreJSONStructure === void 0) {
      this.options.ignoreJSONStructure = true;
    }
  }
  addNamespaces(ns) {
    if (!this.options.ns.includes(ns)) {
      this.options.ns.push(ns);
    }
  }
  removeNamespaces(ns) {
    const index = this.options.ns.indexOf(ns);
    if (index > -1) {
      this.options.ns.splice(index, 1);
    }
  }
  getResource(lng, ns, key, options = {}) {
    const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
    const ignoreJSONStructure = options.ignoreJSONStructure !== void 0 ? options.ignoreJSONStructure : this.options.ignoreJSONStructure;
    const path = [lng, ns];
    if (key) {
      if (Array.isArray(key)) {
        path.push(...key);
      } else if (isString(key) && keySeparator) {
        path.push(...key.split(keySeparator));
      } else {
        path.push(key);
      }
    }
    const result = getPath(this.data, path);
    if (result != null || !ignoreJSONStructure || !isString(key)) return result;
    return deepFind(this.data?.[lng]?.[ns], key, keySeparator);
  }
  addResource(lng, ns, key, value, options = {
    silent: false
  }) {
    assertSeparateArguments("addResource", lng, ns, key);
    const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
    let path = [lng, ns];
    if (key) path = path.concat(keySeparator ? key.split(keySeparator) : key);
    this.addNamespaces(ns);
    setPath(this.data, path, value);
    if (!options.silent) this.emit("added", lng, ns, key, value);
  }
  addResources(lng, ns, resources, options = {
    silent: false
  }) {
    assertSeparateArguments("addResources", lng, ns);
    Object.keys(resources || {}).forEach((m) => {
      if (m === "__proto__" || m === "constructor") return;
      this.addResource(lng, ns, m, resources[m], {
        silent: true
      });
    });
    if (!options.silent) this.emit("added", lng, ns, resources);
  }
  addResourceBundle(lng, ns, resources, deep, overwrite, options = {
    silent: false,
    skipCopy: false
  }) {
    assertSeparateArguments("addResourceBundle", lng, ns);
    const path = [lng, ns];
    this.addNamespaces(ns);
    let pack = getPath(this.data, path) || {};
    if (!options.skipCopy) resources = JSON.parse(JSON.stringify(resources));
    if (deep) {
      deepExtend(pack, resources, overwrite);
    } else {
      pack = {
        ...pack,
        ...resources
      };
    }
    setPath(this.data, path, pack);
    if (!options.silent) this.emit("added", lng, ns, resources);
  }
  removeResourceBundle(lng, ns) {
    if (this.hasResourceBundle(lng, ns)) {
      delete this.data[lng][ns];
    }
    this.removeNamespaces(ns);
    this.emit("removed", lng, ns);
  }
  hasResourceBundle(lng, ns) {
    return this.getResource(lng, ns) !== void 0;
  }
  getResourceBundle(lng, ns) {
    if (!ns) ns = this.options.defaultNS;
    return this.getResource(lng, ns);
  }
  getDataByLanguage(lng) {
    return this.data[lng];
  }
  hasLanguageSomeTranslations(lng) {
    const data = this.getDataByLanguage(lng);
    const n = data && Object.keys(data) || [];
    return !!n.find((v) => {
      const bundle = data[v];
      if (nonEmptyBundles.has(bundle)) return true;
      if (!bundle || Object.keys(bundle).length === 0) return false;
      if (typeof bundle === "object") nonEmptyBundles.add(bundle);
      return true;
    });
  }
  toJSON() {
    return this.data;
  }
};
var PATH_KEY = Symbol("i18next/PATH_KEY");
function createProxy() {
  const state = [];
  const handler = /* @__PURE__ */ Object.create(null);
  let proxy;
  handler.get = (target, key) => {
    proxy?.revoke?.();
    if (key === PATH_KEY) return state;
    state.push(key);
    proxy = Proxy.revocable(target, handler);
    return proxy.proxy;
  };
  return Proxy.revocable(/* @__PURE__ */ Object.create(null), handler).proxy;
}
function keysFromSelector(selector, opts) {
  const {
    [PATH_KEY]: path
  } = selector(createProxy());
  const keySeparator = opts?.keySeparator || ".";
  const nsSeparator = opts?.nsSeparator ?? ":";
  const strict = opts?.enableSelector === "strict";
  if (path.length > 1 && nsSeparator) {
    const ns = opts?.ns;
    const nsList = strict ? Array.isArray(ns) ? ns : ns ? [ns] : null : Array.isArray(ns) ? ns : null;
    if (nsList) {
      const candidates = strict ? nsList : nsList.length > 1 ? nsList.slice(1) : [];
      if (candidates.includes(path[0])) {
        return `${path[0]}${nsSeparator}${path.slice(1).join(keySeparator)}`;
      }
    }
  }
  return path.join(keySeparator);
}
var shouldHandleAsObject = (res) => !isString(res) && typeof res !== "boolean" && typeof res !== "number";
var Translator = class _Translator extends EventEmitter {
  constructor(services, options = {}) {
    super();
    copy(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils", "postProcessors"], services, this);
    this.options = options;
    if (this.options.keySeparator === void 0) {
      this.options.keySeparator = ".";
    }
    this.logger = (services.logger || baseLogger).create("translator");
    this.checkedLoadedFor = {};
  }
  changeLanguage(lng) {
    if (lng) this.language = lng;
  }
  exists(key, o = {
    interpolation: {}
  }) {
    const opt = {
      ...o
    };
    if (key == null) return false;
    const resolved = this.resolve(key, opt);
    if (resolved?.res === void 0) return false;
    const isObject = shouldHandleAsObject(resolved.res);
    if (opt.returnObjects === false && isObject) {
      return false;
    }
    return true;
  }
  extractFromKey(key, opt) {
    let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
    if (nsSeparator === void 0) nsSeparator = ":";
    const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
    let namespaces = opt.ns || this.options.defaultNS || [];
    const wouldCheckForNsInKey = nsSeparator && key.includes(nsSeparator);
    const seemsNaturalLanguage = !this.options.userDefinedKeySeparator && !opt.keySeparator && !this.options.userDefinedNsSeparator && !opt.nsSeparator && !looksLikeObjectPath(key, nsSeparator, keySeparator);
    if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
      const m = key.match(this.interpolator.nestingRegexp);
      if (m && m.length > 0) {
        return {
          key,
          namespaces: isString(namespaces) ? [namespaces] : namespaces
        };
      }
      const parts = key.split(nsSeparator);
      if (nsSeparator !== keySeparator || nsSeparator === keySeparator && this.options.ns.includes(parts[0])) namespaces = parts.shift();
      key = parts.join(keySeparator);
    }
    return {
      key,
      namespaces: isString(namespaces) ? [namespaces] : namespaces
    };
  }
  translate(keys, o, lastKey) {
    let opt = typeof o === "object" ? {
      ...o
    } : o;
    if (typeof opt !== "object" && this.options.overloadTranslationOptionHandler) {
      opt = this.options.overloadTranslationOptionHandler(arguments);
    }
    if (typeof opt === "object") opt = {
      ...opt
    };
    if (!opt) opt = {};
    if (keys == null) return "";
    if (typeof keys === "function") keys = keysFromSelector(keys, {
      ...this.options,
      ...opt
    });
    if (!Array.isArray(keys)) keys = [String(keys)];
    keys = keys.map((k) => typeof k === "function" ? keysFromSelector(k, {
      ...this.options,
      ...opt
    }) : String(k));
    const returnDetails = opt.returnDetails !== void 0 ? opt.returnDetails : this.options.returnDetails;
    const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
    const {
      key,
      namespaces
    } = this.extractFromKey(keys[keys.length - 1], opt);
    const namespace = namespaces[namespaces.length - 1];
    let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
    if (nsSeparator === void 0) nsSeparator = ":";
    const lng = opt.lng || this.language;
    const appendNamespaceToCIMode = opt.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
    if (lng?.toLowerCase() === "cimode") {
      if (appendNamespaceToCIMode) {
        if (returnDetails) {
          return {
            res: `${namespace}${nsSeparator}${key}`,
            usedKey: key,
            exactUsedKey: key,
            usedLng: lng,
            usedNS: namespace,
            usedParams: this.getUsedParamsDetails(opt)
          };
        }
        return `${namespace}${nsSeparator}${key}`;
      }
      if (returnDetails) {
        return {
          res: key,
          usedKey: key,
          exactUsedKey: key,
          usedLng: lng,
          usedNS: namespace,
          usedParams: this.getUsedParamsDetails(opt)
        };
      }
      return key;
    }
    const resolved = this.resolve(keys, opt);
    let res = resolved?.res;
    const resUsedKey = resolved?.usedKey || key;
    const resExactUsedKey = resolved?.exactUsedKey || key;
    const noObject = ["[object Number]", "[object Function]", "[object RegExp]"];
    const joinArrays = opt.joinArrays !== void 0 ? opt.joinArrays : this.options.joinArrays;
    const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
    const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
    const hasDefaultValue = _Translator.hasDefaultValue(opt);
    const defaultValueSuffix = needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, opt) : "";
    const defaultValueSuffixOrdinalFallback = opt.ordinal && needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, {
      ordinal: false
    }) : "";
    const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
    const sep = this.options.pluralSeparator;
    const defaultValue = needsZeroSuffixLookup && opt[`defaultValue${sep}zero`] || opt[`defaultValue${defaultValueSuffix}`] || opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] || (opt.defaultValue ?? (needsPluralHandling ? opt[`defaultValue${opt.ordinal ? `${sep}ordinal${sep}` : sep}other`] : void 0));
    let resForObjHndl = res;
    if (handleAsObjectInI18nFormat && !res && hasDefaultValue) {
      resForObjHndl = defaultValue;
    }
    const handleAsObject = shouldHandleAsObject(resForObjHndl);
    const resType = Object.prototype.toString.apply(resForObjHndl);
    const isObjectHit = handleAsObjectInI18nFormat && resForObjHndl && handleAsObject && !noObject.includes(resType) && !(isString(joinArrays) && Array.isArray(resForObjHndl));
    const objectNotReturned = isObjectHit && !opt.returnObjects && !this.options.returnObjects;
    if (objectNotReturned && this.options.returnedObjectHandler) {
      const r = this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
        ...opt,
        ns: namespaces
      });
      if (returnDetails) {
        resolved.res = r;
        resolved.usedParams = this.getUsedParamsDetails(opt);
        return resolved;
      }
      return r;
    }
    if (objectNotReturned) {
      this.logger.warn("accessing an object - but returnObjects options is not enabled!");
    }
    if (isObjectHit && !objectNotReturned) {
      if (keySeparator) {
        const resTypeIsArray = Array.isArray(resForObjHndl);
        const copy2 = resTypeIsArray ? [] : {};
        const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
        for (const m in resForObjHndl) {
          if (Object.prototype.hasOwnProperty.call(resForObjHndl, m)) {
            const deepKey = `${newKeyToUse}${keySeparator}${m}`;
            if (hasDefaultValue && !res) {
              copy2[m] = this.translate(deepKey, {
                ...opt,
                defaultValue: shouldHandleAsObject(defaultValue) ? defaultValue[m] : void 0,
                ...{
                  joinArrays: false,
                  ns: namespaces
                }
              });
            } else {
              copy2[m] = this.translate(deepKey, {
                ...opt,
                ...{
                  joinArrays: false,
                  ns: namespaces
                }
              });
            }
            if (copy2[m] === deepKey) copy2[m] = resForObjHndl[m];
          }
        }
        res = copy2;
      }
    } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
      res = res.join(joinArrays);
      if (res) res = this.extendTranslation(res, keys, opt, resolved, lastKey);
    } else {
      let usedDefault = false;
      let usedKey = false;
      if (objectNotReturned) res = void 0;
      if (!this.isValidLookup(res) && hasDefaultValue && !(objectNotReturned && shouldHandleAsObject(defaultValue))) {
        usedDefault = true;
        res = defaultValue;
      }
      if (!this.isValidLookup(res) && !(usedDefault && res === "")) {
        usedKey = true;
        res = key;
      }
      const missingKeyNoValueFallbackToKey = opt.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
      const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? void 0 : res;
      const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
      if (!objectNotReturned && (usedKey || usedDefault || updateMissing)) {
        this.logger.log(updateMissing ? "updateKey" : "missingKey", lng, namespace, needsPluralHandling && !updateMissing ? `${key}${this.pluralResolver.getSuffix(lng, opt.count, opt)}` : key, updateMissing ? defaultValue : res);
        if (keySeparator) {
          const fk = this.resolve(key, {
            ...opt,
            keySeparator: false
          });
          if (fk && fk.res) this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
        }
        let lngs = [];
        const fallbackLngs = this.languageUtils.getFallbackCodes(this.options.fallbackLng, opt.lng || this.language);
        if (this.options.saveMissingTo === "fallback" && fallbackLngs && fallbackLngs[0]) {
          for (let i = 0; i < fallbackLngs.length; i++) {
            lngs.push(fallbackLngs[i]);
          }
        } else if (this.options.saveMissingTo === "all") {
          lngs = this.languageUtils.toResolveHierarchy(opt.lng || this.language);
        } else {
          lngs.push(opt.lng || this.language);
        }
        const send = (l, k, specificDefaultValue) => {
          const defaultForMissing = hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
          if (this.options.missingKeyHandler) {
            this.options.missingKeyHandler(l, namespace, k, defaultForMissing, updateMissing, opt);
          } else if (this.backendConnector?.saveMissing) {
            this.backendConnector.saveMissing(l, namespace, k, defaultForMissing, updateMissing, opt, void 0, this.utils?.hasLoadedNamespace);
          }
          this.emit("missingKey", l, namespace, k, res);
        };
        if (this.options.saveMissing) {
          if (this.options.saveMissingPlurals && needsPluralHandling) {
            lngs.forEach((language) => {
              const suffixes = this.pluralResolver.getSuffixes(language, opt);
              if (needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] && !suffixes.includes(`${this.options.pluralSeparator}zero`)) {
                suffixes.push(`${this.options.pluralSeparator}zero`);
              }
              suffixes.forEach((suffix) => {
                send([language], key + suffix, opt[`defaultValue${suffix}`] || defaultValue);
              });
            });
          } else {
            send(lngs, key, defaultValue);
          }
        }
      }
      res = this.extendTranslation(res, keys, opt, resolved, lastKey);
      if (usedKey && res === key && this.options.appendNamespaceToMissingKey) {
        res = `${namespace}${nsSeparator}${key}`;
      }
      if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
        res = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${namespace}${nsSeparator}${key}` : key, usedDefault ? res : void 0, opt);
      }
    }
    if (returnDetails) {
      resolved.res = res;
      resolved.usedParams = this.getUsedParamsDetails(opt);
      return resolved;
    }
    return res;
  }
  extendTranslation(res, key, opt, resolved, lastKey) {
    if (this.i18nFormat?.parse) {
      res = this.i18nFormat.parse(res, {
        ...this.options.interpolation.defaultVariables,
        ...opt
      }, opt.lng || this.language || resolved.usedLng, resolved.usedNS, resolved.usedKey, {
        resolved
      });
    } else if (!opt.skipInterpolation) {
      if (opt.interpolation) this.interpolator.init({
        ...opt,
        ...{
          interpolation: {
            ...this.options.interpolation,
            ...opt.interpolation
          }
        }
      });
      const skipOnVariables = isString(res) && (opt?.interpolation?.skipOnVariables !== void 0 ? opt.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
      let nestBef;
      if (skipOnVariables) {
        const nb = res.includes(this.interpolator.nestingPrefixText) ? res.match(this.interpolator.nestingRegexp) : null;
        nestBef = nb && nb.length;
      }
      let data = opt.replace && !isString(opt.replace) ? opt.replace : opt;
      if (this.options.interpolation.defaultVariables) data = {
        ...this.options.interpolation.defaultVariables,
        ...data
      };
      res = this.interpolator.interpolate(res, data, opt.lng || this.language || resolved.usedLng, opt);
      if (skipOnVariables) {
        const na = res.includes(this.interpolator.nestingPrefixText) ? res.match(this.interpolator.nestingRegexp) : null;
        const nestAft = na && na.length;
        if (nestBef < nestAft) opt.nest = false;
      }
      if (!opt.lng && resolved && resolved.res) opt.lng = this.language || resolved.usedLng;
      if (opt.nest !== false) res = this.interpolator.nest(res, (...args) => {
        if (lastKey?.[0] === args[0] && !opt.context) {
          this.logger.warn(`It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`);
          return null;
        }
        return this.translate(...args, key);
      }, opt);
      if (opt.interpolation) this.interpolator.reset();
    }
    const postProcess = opt.postProcess || this.options.postProcess;
    const postProcessorNames = isString(postProcess) ? [postProcess] : postProcess;
    if (res != null && postProcessorNames?.length && opt.applyPostProcessor !== false) {
      const ppOptions = this.options?.postProcessPassResolved ? {
        i18nResolved: {
          ...resolved,
          usedParams: this.getUsedParamsDetails(opt)
        },
        ...opt
      } : opt;
      postProcessorNames.forEach((name) => {
        const processor = this.postProcessors?.[name];
        if (!processor) {
          this.logger.once(`postProcess:${name}`, "warn", `postProcess: '${name}' is not registered on this i18next instance; call use() with it on this instance`);
          return;
        }
        res = processor.process(res, key, ppOptions, this) ?? res;
      });
    }
    return res;
  }
  resolve(keys, opt = {}) {
    let found;
    let usedKey;
    let exactUsedKey;
    let usedLng;
    let usedNS;
    if (isString(keys)) keys = [keys];
    if (Array.isArray(keys)) keys = keys.map((k) => typeof k === "function" ? keysFromSelector(k, {
      ...this.options,
      ...opt
    }) : k);
    keys.forEach((k) => {
      if (this.isValidLookup(found)) return;
      const extracted = this.extractFromKey(k, opt);
      const key = extracted.key;
      usedKey = key;
      let namespaces = extracted.namespaces;
      if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);
      const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
      const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
      const needsContextHandling = opt.context !== void 0 && (isString(opt.context) || typeof opt.context === "number") && opt.context !== "";
      const codes = opt.lngs ? opt.lngs : this.languageUtils.toResolveHierarchy(opt.lng || this.language, opt.fallbackLng);
      namespaces.forEach((ns) => {
        if (this.isValidLookup(found)) return;
        usedNS = ns;
        if (!this.checkedLoadedFor[`${codes[0]}-${ns}`] && this.utils?.hasLoadedNamespace && !this.utils?.hasLoadedNamespace(usedNS)) {
          this.checkedLoadedFor[`${codes[0]}-${ns}`] = true;
          this.logger.warn(`key "${usedKey}" for languages "${codes.join(", ")}" won't get resolved as namespace "${usedNS}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
        }
        codes.forEach((code) => {
          if (this.isValidLookup(found)) return;
          usedLng = code;
          const finalKeys = [key];
          if (this.i18nFormat?.addLookupKeys) {
            this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, opt);
          } else {
            let pluralSuffix;
            if (needsPluralHandling) pluralSuffix = this.pluralResolver.getSuffix(code, opt.count, opt);
            const zeroSuffix = `${this.options.pluralSeparator}zero`;
            const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
            if (needsPluralHandling) {
              if (opt.ordinal && pluralSuffix.startsWith(ordinalPrefix)) {
                finalKeys.push(key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
              }
              finalKeys.push(key + pluralSuffix);
              if (needsZeroSuffixLookup) {
                finalKeys.push(key + zeroSuffix);
              }
            }
            if (needsContextHandling) {
              const contextKey = `${key}${this.options.contextSeparator || "_"}${opt.context}`;
              finalKeys.push(contextKey);
              if (needsPluralHandling) {
                if (opt.ordinal && pluralSuffix.startsWith(ordinalPrefix)) {
                  finalKeys.push(contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                }
                finalKeys.push(contextKey + pluralSuffix);
                if (needsZeroSuffixLookup) {
                  finalKeys.push(contextKey + zeroSuffix);
                }
              }
            }
            if (needsPluralHandling) {
              const otherSuffix = `${opt.ordinal ? ordinalPrefix : this.options.pluralSeparator}other`;
              if (pluralSuffix !== otherSuffix) {
                if (needsContextHandling) {
                  finalKeys.unshift(`${key}${this.options.contextSeparator || "_"}${opt.context}${otherSuffix}`);
                }
                finalKeys.unshift(key + otherSuffix);
              }
            }
          }
          let possibleKey;
          while (possibleKey = finalKeys.pop()) {
            if (!this.isValidLookup(found)) {
              exactUsedKey = possibleKey;
              found = this.getResource(code, ns, possibleKey, opt);
            }
          }
        });
      });
    });
    return {
      res: found,
      usedKey,
      exactUsedKey,
      usedLng,
      usedNS
    };
  }
  isValidLookup(res) {
    return res !== void 0 && !(!this.options.returnNull && res === null) && !(!this.options.returnEmptyString && res === "");
  }
  getResource(code, ns, key, options = {}) {
    if (this.i18nFormat?.getResource) return this.i18nFormat.getResource(code, ns, key, options);
    return this.resourceStore.getResource(code, ns, key, options);
  }
  getUsedParamsDetails(options = {}) {
    const optionsKeys = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"];
    const useOptionsReplaceForData = options.replace && !isString(options.replace);
    let data = useOptionsReplaceForData ? options.replace : options;
    if (useOptionsReplaceForData && typeof options.count !== "undefined") {
      data = {
        ...data,
        count: options.count
      };
    }
    if (this.options.interpolation.defaultVariables) {
      data = {
        ...this.options.interpolation.defaultVariables,
        ...data
      };
    }
    if (!useOptionsReplaceForData) {
      data = {
        ...data
      };
      for (const key of optionsKeys) {
        delete data[key];
      }
    }
    return data;
  }
  static hasDefaultValue(options) {
    const prefix = "defaultValue";
    for (const option in options) {
      if (Object.prototype.hasOwnProperty.call(options, option) && option.startsWith(prefix) && void 0 !== options[option]) {
        return true;
      }
    }
    return false;
  }
};
var LanguageUtil = class {
  constructor(options, logger = baseLogger) {
    this.options = options;
    this.supportedLngs = this.options.supportedLngs || false;
    this.logger = logger.create("languageUtils");
    this.resolveHierarchyCache = {};
    this.formattedCodes = /* @__PURE__ */ new Map();
  }
  clearCache() {
    this.resolveHierarchyCache = {};
    this.formattedCodes.clear();
  }
  getScriptPartFromCode(code) {
    code = getCleanedCode(code);
    if (!code || !code.includes("-")) return null;
    const p = code.split("-");
    if (p.length === 2) return null;
    p.pop();
    if (p[p.length - 1].toLowerCase() === "x") return null;
    return this.formatLanguageCode(p.join("-"));
  }
  getLanguagePartFromCode(code) {
    code = getCleanedCode(code);
    if (!code || !code.includes("-")) return code;
    const p = code.split("-");
    return this.formatLanguageCode(p[0]);
  }
  formatLanguageCode(code) {
    if (!isString(code)) return code;
    let formatted = this.formattedCodes.get(code);
    if (formatted !== void 0) return formatted;
    formatted = this.formatUncached(code);
    if (this.formattedCodes.size >= 1e3) this.formattedCodes.clear();
    this.formattedCodes.set(code, formatted);
    return formatted;
  }
  formatUncached(code) {
    const hasSubtags = code.includes("-");
    if (hasSubtags || this.options.cleanCode !== false) {
      let canonical;
      try {
        canonical = Intl.getCanonicalLocales(code)[0];
      } catch (e) {
      }
      if (canonical && (hasSubtags || canonical.toLowerCase() === code.toLowerCase())) {
        return this.options.lowerCaseLng ? canonical.toLowerCase() : canonical;
      }
      if (canonical) return code.toLowerCase();
    }
    return this.options.lowerCaseLng || this.options.cleanCode && !hasSubtags ? code.toLowerCase() : code;
  }
  isSupportedCode(code) {
    if (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) {
      code = this.getLanguagePartFromCode(code);
    }
    return !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.includes(code);
  }
  getBestMatchFromCodes(codes) {
    if (!codes) return null;
    let found;
    codes.forEach((code) => {
      if (found) return;
      const cleanedLng = this.formatLanguageCode(code);
      if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng)) found = cleanedLng;
    });
    if (!found && this.options.supportedLngs) {
      codes.forEach((code) => {
        if (found) return;
        const lngScOnly = this.getScriptPartFromCode(code);
        if (this.isSupportedCode(lngScOnly)) return found = lngScOnly;
        const lngOnly = this.getLanguagePartFromCode(code);
        if (this.isSupportedCode(lngOnly)) return found = lngOnly;
        found = this.options.supportedLngs.find((supportedLng) => {
          if (supportedLng === lngOnly) return true;
          if (!supportedLng.includes("-") && !lngOnly.includes("-")) return false;
          if (supportedLng.includes("-") && !lngOnly.includes("-") && supportedLng.slice(0, supportedLng.indexOf("-")) === lngOnly) return true;
          return false;
        });
      });
    }
    if (!found) found = this.getFallbackCodes(this.options.fallbackLng)[0];
    return found;
  }
  getFallbackCodes(fallbacks, code) {
    if (!fallbacks) return [];
    if (typeof fallbacks === "function") fallbacks = fallbacks(code);
    if (isString(fallbacks)) fallbacks = [fallbacks];
    if (Array.isArray(fallbacks)) return fallbacks;
    if (!code) return fallbacks.default || [];
    let found = fallbacks[code];
    if (!found) found = fallbacks[this.getScriptPartFromCode(code)];
    if (!found) found = fallbacks[this.formatLanguageCode(code)];
    if (!found) found = fallbacks[this.getLanguagePartFromCode(code)];
    if (!found) found = fallbacks.default;
    return found || [];
  }
  toResolveHierarchy(code, fallbackCode) {
    const fallbackLng = this.options.fallbackLng;
    const fallbackLngKey = Array.isArray(fallbackLng) ? fallbackLng.join("|") : fallbackLng;
    if (fallbackLngKey !== this._cachedFallbackLng) {
      this.resolveHierarchyCache = {};
      this._cachedFallbackLng = fallbackLngKey;
    }
    const hasCacheableFallback = fallbackCode === void 0 || fallbackCode === false || isString(fallbackCode);
    const usesUncacheableOptionsFallback = fallbackCode === void 0 && typeof this.options.fallbackLng === "function";
    const cacheable = isString(code) && hasCacheableFallback && !usesUncacheableOptionsFallback;
    let cacheKey = null;
    if (cacheable) {
      let fallbackCacheKey;
      if (fallbackCode === void 0) fallbackCacheKey = "undefined";
      else if (fallbackCode === false) fallbackCacheKey = "boolean:false";
      else fallbackCacheKey = `string:${fallbackCode}`;
      cacheKey = `${code.length}:${code}|${fallbackCacheKey}`;
    }
    if (cacheKey !== null) {
      const cached = this.resolveHierarchyCache[cacheKey];
      if (cached !== void 0) return cached.slice();
    }
    const fallbackCodes = this.getFallbackCodes((fallbackCode === false ? [] : fallbackCode) || this.options.fallbackLng || [], code);
    const codes = [];
    const addCode = (c) => {
      if (!c) return;
      if (this.isSupportedCode(c)) {
        codes.push(c);
      } else {
        this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
      }
    };
    if (isString(code) && (code.includes("-") || code.includes("_"))) {
      if (this.options.load !== "languageOnly") addCode(this.formatLanguageCode(code));
      if (this.options.load !== "languageOnly" && this.options.load !== "currentOnly") addCode(this.getScriptPartFromCode(code));
      if (this.options.load !== "currentOnly") addCode(this.getLanguagePartFromCode(code));
    } else if (isString(code)) {
      addCode(this.formatLanguageCode(code));
    }
    fallbackCodes.forEach((fc) => {
      const formattedFc = this.formatLanguageCode(fc);
      if (!codes.includes(formattedFc)) addCode(formattedFc);
    });
    if (cacheKey !== null) {
      this.resolveHierarchyCache[cacheKey] = codes;
      return codes.slice();
    }
    return codes;
  }
};
var suffixesOrder = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 4,
  other: 5
};
var dummyRule = {
  select: (count) => count === 1 ? "one" : "other",
  resolvedOptions: () => ({
    pluralCategories: ["one", "other"]
  })
};
var PluralResolver = class {
  constructor(languageUtils, options = {}, logger = baseLogger) {
    this.languageUtils = languageUtils;
    this.options = options;
    this.logger = logger.create("pluralResolver");
    this.pluralRulesCache = {};
  }
  clearCache() {
    this.pluralRulesCache = {};
  }
  getRule(code, options = {}) {
    const cleanedCode = getCleanedCode(code === "dev" ? "en" : code);
    const type = options.ordinal ? "ordinal" : "cardinal";
    const cacheKey = JSON.stringify({
      cleanedCode,
      type
    });
    if (cacheKey in this.pluralRulesCache) {
      return this.pluralRulesCache[cacheKey];
    }
    let rule;
    try {
      rule = new Intl.PluralRules(cleanedCode, {
        type
      });
    } catch (err) {
      if (typeof Intl === "undefined") {
        this.logger.error("No Intl support, please use an Intl polyfill!");
        return dummyRule;
      }
      if (!code.match(/-|_/)) return dummyRule;
      const lngPart = this.languageUtils.getLanguagePartFromCode(code);
      rule = this.getRule(lngPart, options);
    }
    this.pluralRulesCache[cacheKey] = rule;
    return rule;
  }
  needsPlural(code, options = {}) {
    let rule = this.getRule(code, options);
    if (!rule) rule = this.getRule("dev", options);
    return rule?.resolvedOptions().pluralCategories.length > 1;
  }
  getPluralFormsOfKey(code, key, options = {}) {
    return this.getSuffixes(code, options).map((suffix) => `${key}${suffix}`);
  }
  getSuffixes(code, options = {}) {
    let rule = this.getRule(code, options);
    if (!rule) rule = this.getRule("dev", options);
    if (!rule) return [];
    return rule.resolvedOptions().pluralCategories.sort((pluralCategory1, pluralCategory2) => suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2]).map((pluralCategory) => `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${pluralCategory}`);
  }
  getSuffix(code, count, options = {}) {
    const rule = this.getRule(code, options);
    if (rule) {
      return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${rule.select(count)}`;
    }
    this.logger.warn(`no plural rule found for: ${code}`);
    return this.getSuffix("dev", count, options);
  }
};
var deepFindWithDefaults = (data, defaultData, key, keySeparator = ".", ignoreJSONStructure = true) => {
  let path = getPathWithDefaults(data, defaultData, key);
  if (path == null && ignoreJSONStructure && isString(key)) {
    path = deepFind(data, key, keySeparator);
    if (path === void 0) path = deepFind(defaultData, key, keySeparator);
  }
  return path;
};
var Interpolator = class {
  constructor(options = {}, logger = baseLogger) {
    this.logger = logger.create("interpolator");
    this.options = options;
    this.format = options?.interpolation?.format || ((value) => value);
    this.init(options);
  }
  init(options = {}) {
    if (!options.interpolation) options.interpolation = {
      escapeValue: true
    };
    const {
      escape: escape$1,
      escapeValue,
      useRawValueToEscape,
      prefix,
      suffix,
      formatSeparator,
      unescapeSuffix,
      unescapePrefix,
      nestingPrefix,
      nestingSuffix,
      nestingOptionsSeparator,
      maxReplaces,
      alwaysFormat
    } = options.interpolation;
    this.escape = escape$1 !== void 0 ? escape$1 : escape;
    this.escapeValue = escapeValue !== void 0 ? escapeValue : true;
    this.useRawValueToEscape = useRawValueToEscape !== void 0 ? useRawValueToEscape : false;
    this.prefix = prefix ? regexEscape(prefix) : "{{";
    this.suffix = suffix ? regexEscape(suffix) : "}}";
    this.formatSeparator = formatSeparator || ",";
    this.unescapePrefix = unescapeSuffix ? "" : unescapePrefix ? regexEscape(unescapePrefix) : "-";
    this.unescapeSuffix = this.unescapePrefix ? "" : unescapeSuffix ? regexEscape(unescapeSuffix) : "";
    this.prefixText = prefix || "{{";
    this.nestingPrefixText = nestingPrefix || "$t(";
    this.nestingPrefix = regexEscape(nestingPrefix || "$t(");
    this.nestingSuffix = regexEscape(nestingSuffix || ")");
    this.nestingOptionsSeparator = nestingOptionsSeparator || ",";
    this.maxReplaces = maxReplaces || 1e3;
    this.alwaysFormat = alwaysFormat !== void 0 ? alwaysFormat : false;
    this.resetRegExp();
  }
  reset() {
    if (this.options) this.init(this.options);
  }
  resetRegExp() {
    const getOrResetRegExp = (existingRegExp, pattern) => {
      if (existingRegExp?.source === pattern) {
        existingRegExp.lastIndex = 0;
        return existingRegExp;
      }
      return new RegExp(pattern, "g");
    };
    this.regexp = getOrResetRegExp(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
    this.regexpUnescape = getOrResetRegExp(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`);
    this.nestingRegexp = getOrResetRegExp(this.nestingRegexp, `${this.nestingPrefix}((?:[^()"']|"[^"]*"|'[^']*'|\\((?:[^()"']|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`);
  }
  interpolate(str, data, lng, options) {
    let match;
    let value;
    let replaces;
    const original = str;
    const defaultData = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
    const handleFormat = (key) => {
      if (!key.includes(this.formatSeparator)) {
        const path = deepFindWithDefaults(data, defaultData, key, this.options.keySeparator, this.options.ignoreJSONStructure);
        return this.alwaysFormat ? this.format(path, void 0, lng, {
          ...options,
          ...data,
          interpolationkey: key
        }) : path;
      }
      const p = key.split(this.formatSeparator);
      const k = p.shift().trim();
      const f = p.join(this.formatSeparator).trim();
      return this.format(deepFindWithDefaults(data, defaultData, k, this.options.keySeparator, this.options.ignoreJSONStructure), f, lng, {
        ...options,
        ...data,
        interpolationkey: k
      });
    };
    this.resetRegExp();
    if (!this.escapeValue && typeof str === "string" && /\$t\([^)]*\{[^}]*\{\{/.test(str)) {
      this.logger.warn("nesting options string contains interpolated variables with escapeValue: false \u2014 if any of those values are attacker-controlled they can inject additional nesting options (e.g. redirect lng/ns). Sanitise untrusted input before passing it to t(), or keep escapeValue: true.");
    }
    const missingInterpolationHandler = options?.missingInterpolationHandler || this.options.missingInterpolationHandler;
    const skipOnVariables = options?.interpolation?.skipOnVariables !== void 0 ? options.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
    if (isString(str) && !str.includes(this.prefixText)) return str;
    const todos = [{
      regex: this.regexpUnescape,
      safeValue: (val) => val
    }, {
      regex: this.regexp,
      safeValue: (val) => this.escapeValue ? this.escape(val) : val
    }];
    const unescapedValues = [];
    let shift = 0;
    todos.forEach((todo) => {
      replaces = 0;
      while (match = todo.regex.exec(str)) {
        const at = match.index - shift;
        const written = unescapedValues.find(([start, end]) => at >= start && at < end);
        if (written) {
          todo.regex.lastIndex = written[1] + shift;
          continue;
        }
        const matchedVar = match[1].trim();
        value = handleFormat(matchedVar);
        if (value === void 0) {
          if (typeof missingInterpolationHandler === "function") {
            const temp = missingInterpolationHandler(str, match, options);
            value = isString(temp) ? temp : "";
          } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
            value = "";
          } else if (skipOnVariables) {
            if (this.logger.debug) {
              this.logger.once(`${original}\0${match[0]}`, "warn", `missed to pass in variable ${matchedVar} for interpolating ${original}`);
            }
            value = match[0];
            continue;
          } else {
            this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
            value = "";
          }
        } else if (!isString(value) && !this.useRawValueToEscape) {
          value = makeString(value);
        }
        const safeValue = makeString(todo.safeValue(value));
        str = str.slice(0, match.index) + safeValue + str.slice(match.index + match[0].length);
        if (skipOnVariables) {
          if (todo.regex === this.regexpUnescape) {
            unescapedValues.push([match.index, match.index + safeValue.length]);
          } else {
            shift += safeValue.length - match[0].length;
          }
          todo.regex.lastIndex += safeValue.length;
          todo.regex.lastIndex -= match[0].length;
        } else {
          todo.regex.lastIndex = 0;
        }
        replaces++;
        if (replaces >= this.maxReplaces) {
          break;
        }
      }
    });
    return str;
  }
  nest(str, fc, options = {}) {
    let match;
    let value;
    let clonedOptions;
    const handleHasOptions = (key, inheritedOptions) => {
      const sep = this.nestingOptionsSeparator;
      if (!key.includes(sep)) return key;
      const c = key.split(new RegExp(`${regexEscape(sep)}[ ]*{`));
      let optionsString = `{${c[1]}`;
      key = c[0];
      optionsString = this.interpolate(optionsString, clonedOptions);
      const matchedSingleQuotes = optionsString.match(/'/g);
      const matchedDoubleQuotes = optionsString.match(/"/g);
      if ((matchedSingleQuotes?.length ?? 0) % 2 === 0 && !matchedDoubleQuotes || (matchedDoubleQuotes?.length ?? 0) % 2 !== 0) {
        optionsString = optionsString.replace(/'/g, '"');
      }
      try {
        clonedOptions = JSON.parse(optionsString);
        if (inheritedOptions) clonedOptions = {
          ...inheritedOptions,
          ...clonedOptions
        };
      } catch (e) {
        this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
        return `${key}${sep}${optionsString}`;
      }
      if (clonedOptions.defaultValue && clonedOptions.defaultValue.includes(this.prefix)) delete clonedOptions.defaultValue;
      return key;
    };
    if (isString(str) && !str.includes(this.nestingPrefixText)) return str;
    const nestingRegexp = new RegExp(this.nestingRegexp);
    let out = "";
    let lastEnd = 0;
    while (match = nestingRegexp.exec(str)) {
      let formatters = [];
      clonedOptions = {
        ...options
      };
      clonedOptions = clonedOptions.replace && !isString(clonedOptions.replace) ? clonedOptions.replace : clonedOptions;
      clonedOptions.applyPostProcessor = false;
      delete clonedOptions.defaultValue;
      const keyEndIndex = /{.*}/s.test(match[1]) ? match[1].lastIndexOf("}") + 1 : match[1].indexOf(this.formatSeparator);
      if (keyEndIndex !== -1) {
        formatters = match[1].slice(keyEndIndex).split(this.formatSeparator).map((elem) => elem.trim()).filter(Boolean);
        match[1] = match[1].slice(0, keyEndIndex);
      }
      value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);
      if (value && match[0] === str && !isString(value)) return value;
      if (!isString(value)) value = makeString(value);
      if (!value) {
        this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
        value = "";
      }
      if (formatters.length) {
        value = formatters.reduce((v, f) => this.format(v, f, options.lng, {
          ...options,
          interpolationkey: match[1].trim()
        }), value.trim());
      }
      out += str.slice(lastEnd, match.index) + makeString(value);
      lastEnd = nestingRegexp.lastIndex;
      this.regexp.lastIndex = 0;
    }
    return lastEnd ? out + str.slice(lastEnd) : str;
  }
};
var parseFormatStr = (formatStr) => {
  let formatName = formatStr.toLowerCase().trim();
  const formatOptions = {};
  if (formatStr.includes("(")) {
    const p = formatStr.split("(");
    formatName = p[0].toLowerCase().trim();
    const optStr = p[1].slice(0, -1);
    if (formatName === "currency" && !optStr.includes(":")) {
      if (!formatOptions.currency) formatOptions.currency = optStr.trim();
    } else if (formatName === "relativetime" && !optStr.includes(":")) {
      if (!formatOptions.range) formatOptions.range = optStr.trim();
    } else {
      const opts = optStr.split(";");
      opts.forEach((opt) => {
        if (opt) {
          const [key, ...rest] = opt.split(":");
          const val = rest.join(":").trim().replace(/^'+|'+$/g, "");
          const trimmedKey = key.trim();
          if (!formatOptions[trimmedKey]) formatOptions[trimmedKey] = val;
          if (val === "false") formatOptions[trimmedKey] = false;
          if (val === "true") formatOptions[trimmedKey] = true;
          if (!isNaN(val)) formatOptions[trimmedKey] = parseInt(val, 10);
        }
      });
    }
  }
  return {
    formatName,
    formatOptions
  };
};
var cachedFormattersLimit = 1e3;
var createCachedFormatter = (fn) => {
  const cache = /* @__PURE__ */ new Map();
  return (v, l, o) => {
    let optForCache = o;
    if (o && o.interpolationkey && o.formatParams && o.formatParams[o.interpolationkey] && o[o.interpolationkey]) {
      optForCache = {
        ...optForCache,
        [o.interpolationkey]: void 0
      };
    }
    let key;
    try {
      key = l + JSON.stringify(optForCache);
    } catch (e) {
      return fn(getCleanedCode(l), o)(v);
    }
    let frm = cache.get(key);
    if (!frm) {
      frm = fn(getCleanedCode(l), o);
      if (cache.size >= cachedFormattersLimit) cache.delete(cache.keys().next().value);
      cache.set(key, frm);
    }
    return frm(v);
  };
};
var createNonCachedFormatter = (fn) => (v, l, o) => fn(getCleanedCode(l), o)(v);
var Formatter = class {
  constructor(options = {}) {
    this.logger = baseLogger.create("formatter");
    this.options = options;
    this.init(options);
  }
  init(services, options = {
    interpolation: {}
  }) {
    if (services?.logger?.create) this.logger = services.logger.create("formatter");
    this.formatSeparator = options.interpolation.formatSeparator || ",";
    const cf = options.cacheInBuiltFormats ? createCachedFormatter : createNonCachedFormatter;
    this.formats = {
      number: cf((lng, opt) => {
        const formatter = new Intl.NumberFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val);
      }),
      currency: cf((lng, opt) => {
        const formatter = new Intl.NumberFormat(lng, {
          ...opt,
          style: "currency"
        });
        return (val) => formatter.format(val);
      }),
      datetime: cf((lng, opt) => {
        const formatter = new Intl.DateTimeFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val);
      }),
      relativetime: cf((lng, opt) => {
        const formatter = new Intl.RelativeTimeFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val, opt.range || "day");
      }),
      list: cf((lng, opt) => {
        const formatter = new Intl.ListFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val);
      })
    };
  }
  add(name, fc) {
    this.formats[name.toLowerCase().trim()] = fc;
  }
  addCached(name, fc) {
    this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
  }
  format(value, format, lng, options = {}) {
    if (!format) return value;
    if (value == null) return value;
    const rawFormats = format.split(this.formatSeparator);
    const formats = [];
    for (let i = 0; i < rawFormats.length; i++) {
      let f = rawFormats[i];
      while (f.indexOf("(") > -1 && !f.includes(")") && i + 1 < rawFormats.length) {
        f = `${f}${this.formatSeparator}${rawFormats[++i]}`;
      }
      formats.push(f);
    }
    const result = formats.reduce((mem, f) => {
      const {
        formatName,
        formatOptions
      } = parseFormatStr(f);
      if (this.formats[formatName]) {
        let formatted = mem;
        try {
          const valOptions = options?.formatParams?.[options.interpolationkey] || {};
          const l = valOptions.locale || valOptions.lng || options.locale || options.lng || lng;
          formatted = this.formats[formatName](mem, l, {
            ...formatOptions,
            ...options,
            ...valOptions
          });
        } catch (error) {
          this.logger.warn(error);
        }
        return formatted;
      } else {
        this.logger.warn(`there was no format function for ${formatName}`);
      }
      return mem;
    }, value);
    return result;
  }
};
var removePending = (q, name) => {
  if (q.pending[name] !== void 0) {
    delete q.pending[name];
    q.pendingCount--;
  }
};
var Connector = class extends EventEmitter {
  constructor(backend, store, services, options = {}) {
    super();
    this.backend = backend;
    this.store = store;
    this.services = services;
    this.languageUtils = services.languageUtils;
    this.options = options;
    this.logger = (services.logger || baseLogger).create("backendConnector");
    this.waitingReads = [];
    this.maxParallelReads = options.maxParallelReads || 10;
    this.readingCalls = 0;
    this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 5;
    this.retryTimeout = options.retryTimeout >= 1 ? options.retryTimeout : 350;
    this.state = {};
    this.queue = [];
    this.backend?.init?.(services, options.backend, options);
    this.callbackApi = callbackApiOf(this.backend);
    if (this.backend && this.callbackApi === void 0 && (this.backend.read || this.backend.create)) {
      this.logger.deprecate("backend: set callbackApi to declare the calling convention (true: read(language, namespace, callback) and create(languages, namespace, key, fallbackValue, callback, options); false: both return a promise or a value); guessing it from the number of parameters is deprecated");
    }
  }
  queueLoad(languages, namespaces, options, callback) {
    const toLoad = {};
    const pending = {};
    const toLoadLanguages = {};
    const toLoadNamespaces = {};
    languages.forEach((lng) => {
      let hasAllNamespaces = true;
      namespaces.forEach((ns) => {
        const name = `${lng}|${ns}`;
        if (!options.reload && this.store.hasResourceBundle(lng, ns)) {
          this.state[name] = 2;
        } else if (!options.reload && this.state[name] < 0) ;
        else if (this.state[name] === 1) {
          if (pending[name] === void 0) pending[name] = true;
        } else {
          this.state[name] = 1;
          hasAllNamespaces = false;
          if (pending[name] === void 0) pending[name] = true;
          if (toLoad[name] === void 0) toLoad[name] = true;
          if (toLoadNamespaces[ns] === void 0) toLoadNamespaces[ns] = true;
        }
      });
      if (!hasAllNamespaces) toLoadLanguages[lng] = true;
    });
    if (Object.keys(toLoad).length || Object.keys(pending).length) {
      this.queue.push({
        pending,
        pendingCount: Object.keys(pending).length,
        loaded: {},
        errors: [],
        callback
      });
    }
    return {
      toLoad: Object.keys(toLoad),
      pending: Object.keys(pending),
      toLoadLanguages: Object.keys(toLoadLanguages),
      toLoadNamespaces: Object.keys(toLoadNamespaces)
    };
  }
  loaded(name, err, data) {
    const s = name.split("|");
    const lng = s[0];
    const ns = s[1];
    if (err) this.emit("failedLoading", lng, ns, err);
    if (!err && data) {
      this.store.addResourceBundle(lng, ns, data, void 0, void 0, {
        skipCopy: true
      });
    }
    this.state[name] = err ? -1 : 2;
    if (err && data) this.state[name] = 0;
    const loaded = {};
    this.queue.forEach((q) => {
      pushPath(q.loaded, [lng], ns);
      removePending(q, name);
      if (err) q.errors.push(err);
      if (q.pendingCount === 0 && !q.done) {
        Object.keys(q.loaded).forEach((l) => {
          if (!loaded[l]) loaded[l] = {};
          const loadedKeys = q.loaded[l];
          if (loadedKeys.length) {
            loadedKeys.forEach((n) => {
              if (loaded[l][n] === void 0) loaded[l][n] = true;
            });
          }
        });
        q.done = true;
        if (q.errors.length) {
          q.callback(q.errors);
        } else {
          q.callback();
        }
      }
    });
    this.emit("loaded", loaded);
    this.queue = this.queue.filter((q) => !q.done);
  }
  read(lng, ns, fcName, tried = 0, wait = this.retryTimeout, callback) {
    if (!lng.length) return callback(null, {});
    if (this.readingCalls >= this.maxParallelReads) {
      this.waitingReads.push({
        lng,
        ns,
        fcName,
        tried,
        wait,
        callback
      });
      return;
    }
    this.readingCalls++;
    const resolver = (err, data) => {
      this.readingCalls--;
      if (this.waitingReads.length > 0) {
        const next = this.waitingReads.shift();
        this.read(next.lng, next.ns, next.fcName, next.tried, next.wait, next.callback);
      }
      if (err && data && tried < this.maxRetries) {
        setTimeout(() => {
          this.read(lng, ns, fcName, tried + 1, wait * 2, callback);
        }, wait);
        return;
      }
      callback(err, data);
    };
    const fc = this.backend[fcName].bind(this.backend);
    if (this.callbackApi === false || this.callbackApi === void 0 && fc.length === 2) {
      try {
        const r = fc(lng, ns);
        if (r && typeof r.then === "function") {
          r.then((data) => resolver(null, data)).catch(resolver);
        } else {
          resolver(null, r);
        }
      } catch (err) {
        resolver(err);
      }
      return;
    }
    return fc(lng, ns, resolver);
  }
  prepareLoading(languages, namespaces, options = {}, callback) {
    if (!this.backend) {
      this.logger.warn("No backend was added via i18next.use. Will not load resources.");
      return callback && callback();
    }
    if (isString(languages)) languages = this.languageUtils.toResolveHierarchy(languages);
    if (isString(namespaces)) namespaces = [namespaces];
    const toLoad = this.queueLoad(languages, namespaces, options, callback);
    if (!toLoad.toLoad.length) {
      if (!toLoad.pending.length) callback();
      return null;
    }
    toLoad.toLoad.forEach((name) => {
      this.loadOne(name);
    });
  }
  load(languages, namespaces, callback) {
    this.prepareLoading(languages, namespaces, {}, callback);
  }
  reload(languages, namespaces, callback) {
    this.prepareLoading(languages, namespaces, {
      reload: true
    }, callback);
  }
  loadOne(name, prefix = "") {
    const s = name.split("|");
    const lng = s[0];
    const ns = s[1];
    this.read(lng, ns, "read", void 0, void 0, (err, data) => {
      if (err) this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
      if (!err && data) this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);
      this.loaded(name, err, data);
    });
  }
  saveMissing(languages, namespace, key, fallbackValue, isUpdate, options = {}, clb = () => {
  }, hasLoadedNamespace2 = this.newestCloneHasLoadedNamespace || this.services?.utils?.hasLoadedNamespace) {
    if (hasLoadedNamespace2 && !hasLoadedNamespace2(namespace)) {
      this.logger.warn(`did not save key "${key}" as the namespace "${namespace}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
      return;
    }
    if (key === void 0 || key === null || key === "") return;
    if (this.backend?.create) {
      const opts = {
        ...options,
        isUpdate
      };
      const fc = this.backend.create.bind(this.backend);
      if (this.callbackApi === false || this.callbackApi === void 0 && fc.length < 6) {
        try {
          let r;
          if (this.callbackApi === false || fc.length === 5) {
            r = fc(languages, namespace, key, fallbackValue, opts);
          } else {
            r = fc(languages, namespace, key, fallbackValue);
          }
          if (r && typeof r.then === "function") {
            r.then((data) => clb(null, data)).catch(clb);
          } else {
            clb(null, r);
          }
        } catch (err) {
          clb(err);
        }
      } else {
        fc(languages, namespace, key, fallbackValue, clb, opts);
      }
    }
    if (!languages || !languages[0]) return;
    this.store.addResource(languages[0], namespace, key, fallbackValue);
  }
};
var get = () => ({
  debug: false,
  initAsync: true,
  ns: ["translation"],
  defaultNS: ["translation"],
  fallbackLng: false,
  fallbackNS: false,
  supportedLngs: false,
  nonExplicitSupportedLngs: false,
  load: "all",
  preload: false,
  keySeparator: ".",
  nsSeparator: ":",
  pluralSeparator: "_",
  contextSeparator: "_",
  enableSelector: false,
  partialBundledLanguages: false,
  saveMissing: false,
  updateMissing: false,
  saveMissingTo: "fallback",
  saveMissingPlurals: true,
  missingKeyHandler: false,
  missingInterpolationHandler: false,
  postProcess: false,
  postProcessPassResolved: false,
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,
  joinArrays: false,
  returnedObjectHandler: false,
  parseMissingKeyHandler: false,
  appendNamespaceToMissingKey: false,
  appendNamespaceToCIMode: false,
  overloadTranslationOptionHandler: (args) => {
    let ret = {};
    if (typeof args[1] === "object") ret = args[1];
    if (isString(args[1])) ret.defaultValue = args[1];
    if (isString(args[2])) ret.tDescription = args[2];
    if (typeof args[2] === "object" || typeof args[3] === "object") {
      const options = args[3] || args[2];
      Object.keys(options).forEach((key) => {
        ret[key] = options[key];
      });
    }
    return ret;
  },
  interpolation: {
    escapeValue: true,
    prefix: "{{",
    suffix: "}}",
    formatSeparator: ",",
    unescapePrefix: "-",
    nestingPrefix: "$t(",
    nestingSuffix: ")",
    nestingOptionsSeparator: ",",
    maxReplaces: 1e3,
    skipOnVariables: true
  },
  cacheInBuiltFormats: true
});
var transformOptions = (options) => {
  if (isString(options.ns)) options.ns = [options.ns];
  if (isString(options.fallbackLng)) options.fallbackLng = [options.fallbackLng];
  if (isString(options.fallbackNS)) options.fallbackNS = [options.fallbackNS];
  if (options.supportedLngs && !options.supportedLngs.includes("cimode")) {
    options.supportedLngs = options.supportedLngs.concat(["cimode"]);
  }
  return options;
};
var noop = () => {
};
var withDefaults = (options) => {
  const defOpts = get();
  const merged = {
    ...defOpts,
    ...options
  };
  merged.interpolation = {
    ...defOpts.interpolation,
    ...options.interpolation
  };
  if (typeof merged.overloadTranslationOptionHandler !== "function") {
    merged.overloadTranslationOptionHandler = defOpts.overloadTranslationOptionHandler;
  }
  return merged;
};
var configuredLanguageCodes = (options) => {
  const codes = [].concat(options.supportedLngs || [], options.preload || []);
  codes.push(...Object.keys(options.resources || {}));
  const fallbackLng = options.fallbackLng;
  if (isString(fallbackLng) || Array.isArray(fallbackLng)) codes.push(...[].concat(fallbackLng));
  else if (fallbackLng && typeof fallbackLng === "object") {
    Object.keys(fallbackLng).forEach((code) => {
      if (code !== "default") codes.push(code);
      codes.push(...[].concat(fallbackLng[code]));
    });
  }
  return codes;
};
var isRefusedLanguageCode = (i18n, code) => {
  if (!isString(code) || isSafeLanguageCode(code) || i18n.configuredLngs?.has(code)) return false;
  i18n.logger.once(`lng:${code}`, "warn", `refused the language code '${code.slice(0, 64)}' from lng, changeLanguage(), the language detector or loadLanguages(): it is not configured and has other characters than letters, digits, '-', '_', '@' and '.' (or '..', or more than 128). List it in supportedLngs to use it`);
  return true;
};
var bindMemberFunctions = (inst) => {
  const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
  mems.forEach((mem) => {
    if (typeof inst[mem] === "function") {
      inst[mem] = inst[mem].bind(inst);
    }
  });
};
var I18n = class _I18n extends EventEmitter {
  constructor(options = {}, callback) {
    super();
    this.userOptions = transformOptions(options);
    this.options = withDefaults(this.userOptions);
    this.services = {
      postProcessors: /* @__PURE__ */ Object.create(null)
    };
    this.logger = new Logger(null, this.options);
    this.modules = {
      external: []
    };
    bindMemberFunctions(this);
    if (callback && !this.isInitialized && !options.isClone) {
      if (!this.userOptions.initAsync) {
        this.init(options, callback);
        return this;
      }
      setTimeout(() => {
        this.init(options, callback);
      }, 0);
    }
  }
  init(options = {}, callback) {
    this.isInitializing = true;
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (options.defaultNS == null && options.ns) {
      if (isString(options.ns)) {
        options.defaultNS = options.ns;
      } else if (!options.ns.includes("translation")) {
        options.defaultNS = options.ns[0];
      }
    }
    transformOptions(options);
    const userOptions = {
      ...this.userOptions,
      ...options
    };
    this.options = withDefaults({
      ...this.options,
      ...options
    });
    if (userOptions.keySeparator !== void 0) {
      this.options.userDefinedKeySeparator = userOptions.keySeparator;
    }
    if (userOptions.nsSeparator !== void 0) {
      this.options.userDefinedNsSeparator = userOptions.nsSeparator;
    }
    if (!this.options.isClone) {
      this.configuredLngs = /* @__PURE__ */ new Set([...this.configuredLngs || [], ...configuredLanguageCodes(userOptions)]);
    }
    const createClassOnDemand = (ClassOrObject) => {
      if (!ClassOrObject) return null;
      if (typeof ClassOrObject === "function") return new ClassOrObject();
      return ClassOrObject;
    };
    if (!this.options.isClone) {
      this.logger.init(createClassOnDemand(this.modules.logger), this.options);
      const {
        logger
      } = this;
      this.pendingWarnings?.forEach((msg) => this.logger.warn(msg));
      this.pendingWarnings = void 0;
      let formatter;
      if (this.modules.formatter) {
        formatter = this.modules.formatter;
      } else {
        formatter = Formatter;
      }
      const lu = new LanguageUtil(this.options, logger);
      this.store = new ResourceStore(this.options.resources, this.options, logger);
      const s = this.services;
      s.logger = logger;
      s.resourceStore = this.store;
      s.languageUtils = lu;
      s.pluralResolver = new PluralResolver(lu, {
        prepend: this.options.pluralSeparator
      }, logger);
      if (formatter) {
        s.formatter = createClassOnDemand(formatter);
        if (s.formatter.init) s.formatter.init(s, this.options);
        this.options.interpolation.format = s.formatter.format.bind(s.formatter);
      }
      s.interpolator = new Interpolator(this.options, logger);
      s.utils = {
        hasLoadedNamespace: this.hasLoadedNamespace.bind(this),
        reloadResources: this.reloadResources.bind(this)
      };
      s.backendConnector = new Connector(createClassOnDemand(this.modules.backend), s.resourceStore, s, this.options);
      s.backendConnector.on("*", (event, ...args) => {
        this.emit(event, ...args);
      });
      if (this.modules.languageDetector) {
        s.languageDetector = createClassOnDemand(this.modules.languageDetector);
        if (s.languageDetector.init) s.languageDetector.init(s, this.options.detection, this.options);
        if (s.languageDetector.async && callbackApiOf(s.languageDetector) === void 0) {
          this.logger.deprecate("languageDetector: set callbackApi to declare how the async detect() answers (true: detect(callback); false: detect() returns a promise); guessing it from the number of parameters is deprecated");
        }
      }
      if (this.modules.i18nFormat) {
        s.i18nFormat = createClassOnDemand(this.modules.i18nFormat);
        if (s.i18nFormat.init) s.i18nFormat.init(this);
      }
      this.translator = new Translator(this.services, this.options);
      this.translator.on("*", (event, ...args) => {
        this.emit(event, ...args);
      });
      this.modules.external.forEach((m) => {
        if (m.init) m.init(this);
      });
    }
    this.format = this.options.interpolation.format;
    if (!callback) callback = noop;
    if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
      const codes = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
      if (codes.length > 0 && codes[0] !== "dev") this.options.lng = codes[0];
    }
    if (!this.services.languageDetector && !this.options.lng) {
      this.logger.warn("init: no languageDetector is used and no lng is defined");
    }
    const storeApi = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];
    storeApi.forEach((fcName) => {
      this[fcName] = (...args) => this.store[fcName](...args);
    });
    const storeApiChained = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];
    storeApiChained.forEach((fcName) => {
      this[fcName] = (...args) => {
        this.store[fcName](...args);
        return this;
      };
    });
    const deferred = defer();
    const load = () => {
      const finish = (err, t2) => {
        this.isInitializing = false;
        if (this.isInitialized && !this.initializedStoreOnce) this.logger.warn("init: i18next is already initialized. You should call init just once!");
        this.isInitialized = true;
        if (!this.options.isClone) this.logger.log("initialized", this.options);
        this.emit("initialized", this.options);
        deferred.resolve(t2);
        callback(err, t2);
      };
      if ((this.languages || this.isLanguageChangingTo) && !this.isInitialized) return finish(null, this.t.bind(this));
      this.changeLanguage(this.options.lng, finish);
    };
    if (this.options.resources || !this.options.initAsync) {
      load();
    } else {
      setTimeout(load, 0);
    }
    return deferred;
  }
  loadResources(language, callback = noop) {
    let usedCallback = callback;
    const usedLng = isString(language) ? language : this.language;
    if (typeof language === "function") usedCallback = language;
    if (!this.options.resources || this.options.partialBundledLanguages) {
      if (usedLng?.toLowerCase() === "cimode" && (!this.options.preload || this.options.preload.length === 0)) return usedCallback();
      const toLoad = [];
      const append = (lng) => {
        if (!lng) return;
        if (lng === "cimode") return;
        const lngs = this.services.languageUtils.toResolveHierarchy(lng);
        lngs.forEach((l) => {
          if (l === "cimode") return;
          if (!toLoad.includes(l)) toLoad.push(l);
        });
      };
      if (!usedLng) {
        const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
        fallbacks.forEach((l) => append(l));
      } else {
        append(usedLng);
      }
      this.options.preload?.forEach?.((l) => append(l));
      this.services.backendConnector.load(toLoad, this.options.ns, (e) => {
        if (!e && !this.resolvedLanguage && this.language) this.setResolvedLanguage(this.language);
        usedCallback(e);
      });
    } else {
      usedCallback(null);
    }
  }
  reloadResources(lngs, ns, callback) {
    const deferred = defer();
    if (typeof lngs === "function") {
      callback = lngs;
      lngs = void 0;
    }
    if (typeof ns === "function") {
      callback = ns;
      ns = void 0;
    }
    if (!lngs) {
      const requested = Object.keys(this.services.backendConnector.state).map((name) => name.split("|")[0]);
      lngs = [.../* @__PURE__ */ new Set([...this.languages || [], ...requested])].filter((l) => l !== "cimode");
    }
    if (!ns) ns = this.options.ns;
    if (!callback) callback = noop;
    this.services.backendConnector.reload(lngs, ns, (err) => {
      deferred.resolve();
      callback(err);
    });
    return deferred;
  }
  use(module2) {
    if (!module2) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
    if (!module2.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
    const setModule = (type) => {
      if (this.modules[type] && this.modules[type] !== module2) {
        const msg = `use: this ${type} replaces the ${type} passed to an earlier use() call; only one ${type} is used per instance`;
        if (this.isInitializing || this.isInitialized) this.logger.warn(msg);
        else (this.pendingWarnings = this.pendingWarnings || []).push(msg);
      }
      this.modules[type] = module2;
    };
    if (module2.type === "backend") {
      setModule("backend");
    }
    if (module2.type === "logger" || module2.log && module2.warn && module2.error) {
      this.modules.logger = module2;
    }
    if (module2.type === "languageDetector") {
      setModule("languageDetector");
    }
    if (module2.type === "i18nFormat") {
      setModule("i18nFormat");
    }
    if (module2.type === "postProcessor") {
      this.services.postProcessors[module2.name] = module2;
    }
    if (module2.type === "formatter") {
      setModule("formatter");
    }
    if (module2.type === "3rdParty") {
      this.modules.external.push(module2);
    }
    return this;
  }
  hydrate(resources, lng) {
    if (this.options.isClone) return this;
    if (!this.services.resourceStore) {
      this.logger.warn("hydrate: call init() first, the instance has no resource store yet");
      return this;
    }
    if (resources && !this.initializedStoreOnce) {
      this.services.resourceStore.data = resources;
      Object.values(resources).forEach((lngResources) => {
        Object.keys(lngResources).forEach((ns) => {
          if (!this.options.ns.includes(ns)) this.options.ns.push(ns);
        });
      });
      this.initializedStoreOnce = true;
      this.isInitialized = true;
    }
    if (lng && !this.initializedLanguageOnce) {
      this.changeLanguage(lng);
      this.initializedLanguageOnce = true;
    }
    return this;
  }
  setResolvedLanguage(l) {
    if (!l || !this.languages) return;
    if (["cimode", "dev"].includes(l)) return;
    for (let li = 0; li < this.languages.length; li++) {
      const lngInLngs = this.languages[li];
      if (["cimode", "dev"].includes(lngInLngs)) continue;
      if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
        this.resolvedLanguage = lngInLngs;
        break;
      }
    }
    if (!this.resolvedLanguage && !this.languages.includes(l) && this.store.hasLanguageSomeTranslations(l)) {
      this.resolvedLanguage = l;
      this.languages.unshift(l);
    }
  }
  changeLanguage(lng, callback) {
    this.isLanguageChangingTo = lng;
    const deferred = defer();
    this.emit("languageChanging", lng);
    const setLngProps = (l) => {
      this.language = l;
      this.languages = this.services.languageUtils.toResolveHierarchy(l);
      this.resolvedLanguage = void 0;
      this.setResolvedLanguage(l);
    };
    const done = (err, l) => {
      if (l) {
        if (this.isLanguageChangingTo === lng) {
          setLngProps(l);
          this.translator.changeLanguage(l);
          this.isLanguageChangingTo = void 0;
          this.emit("languageChanged", l);
          this.logger.log("languageChanged", l);
        }
      } else {
        this.isLanguageChangingTo = void 0;
      }
      deferred.resolve((...args) => this.t(...args));
      if (callback) callback(err, (...args) => this.t(...args));
    };
    const setLng = (lngs) => {
      if (!lng && !lngs && this.services.languageDetector) lngs = [];
      const {
        supportedLngs
      } = this.options;
      if (lngs && !supportedLngs) {
        const accepted = [].concat(lngs).filter((c) => !isRefusedLanguageCode(this, c));
        if (accepted.length < [].concat(lngs).length) lngs = accepted;
      }
      const fl = isString(lngs) ? lngs : lngs && lngs[0];
      let l = this.store.hasLanguageSomeTranslations(fl) ? fl : this.services.languageUtils.getBestMatchFromCodes(isString(lngs) ? [lngs] : lngs);
      if (supportedLngs && isRefusedLanguageCode(this, l)) l = this.services.languageUtils.getBestMatchFromCodes([]);
      if (l) {
        if (!this.language) {
          setLngProps(l);
        }
        if (!this.translator.language) this.translator.changeLanguage(l);
        this.services.languageDetector?.cacheUserLanguage?.(l);
      }
      this.loadResources(l, (err) => {
        done(err, l);
      });
    };
    if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
      setLng(this.services.languageDetector.detect());
    } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
      const callbackApi = callbackApiOf(this.services.languageDetector);
      if (callbackApi === false || callbackApi === void 0 && this.services.languageDetector.detect.length === 0) {
        this.services.languageDetector.detect().then(setLng);
      } else {
        this.services.languageDetector.detect(setLng);
      }
    } else {
      setLng(lng);
    }
    return deferred;
  }
  getFixedT(lng, ns, keyPrefix, fixedOpts) {
    const scopeNs = fixedOpts?.scopeNs;
    const fixedT = (key, opts, ...rest) => {
      let o;
      if (typeof opts !== "object") {
        o = this.options.overloadTranslationOptionHandler([key, opts].concat(rest));
      } else {
        o = {
          ...opts
        };
      }
      o.lng = o.lng || fixedT.lng;
      o.lngs = o.lngs || fixedT.lngs;
      const explicitCallNs = o.ns !== void 0 && o.ns !== null;
      o.ns = o.ns || fixedT.ns;
      if (o.keyPrefix !== "") o.keyPrefix = o.keyPrefix || keyPrefix || fixedT.keyPrefix;
      const selectorOpts = {
        ...this.options,
        ...o
      };
      if (Array.isArray(scopeNs) && !explicitCallNs) selectorOpts.ns = scopeNs;
      if (typeof o.keyPrefix === "function") o.keyPrefix = keysFromSelector(o.keyPrefix, selectorOpts);
      const keySeparator = this.options.keySeparator || ".";
      let resultKey;
      if (o.keyPrefix && Array.isArray(key)) {
        resultKey = key.map((k) => {
          if (typeof k === "function") k = keysFromSelector(k, selectorOpts);
          return `${o.keyPrefix}${keySeparator}${k}`;
        });
      } else {
        if (typeof key === "function") key = keysFromSelector(key, selectorOpts);
        resultKey = o.keyPrefix ? `${o.keyPrefix}${keySeparator}${key}` : key;
      }
      return this.t(resultKey, o);
    };
    if (isString(lng)) {
      fixedT.lng = lng;
    } else {
      fixedT.lngs = lng;
    }
    fixedT.ns = ns;
    fixedT.keyPrefix = keyPrefix;
    return fixedT;
  }
  t(...args) {
    if (!this.translator) {
      this.logger.warn("t: called before init(); returning an empty string");
      return "";
    }
    return this.translator.translate(...args);
  }
  exists(...args) {
    return this.translator?.exists(...args);
  }
  setDefaultNamespace(ns) {
    this.options.defaultNS = ns;
  }
  hasLoadedNamespace(ns, options = {}) {
    if (!this.isInitialized) {
      this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages);
      return false;
    }
    if (!this.languages || !this.languages.length) {
      this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages);
      return false;
    }
    const lng = options.lng || this.resolvedLanguage || this.languages[0];
    const fallbackLng = this.options ? this.options.fallbackLng : false;
    const lastLng = this.languages[this.languages.length - 1];
    if (lng.toLowerCase() === "cimode") return true;
    const loadNotPending = (l, n) => {
      const loadState = this.services.backendConnector.state[`${l}|${n}`];
      return loadState === -1 || loadState === 0 || loadState === 2;
    };
    if (options.precheck) {
      const preResult = options.precheck(this, loadNotPending);
      if (preResult !== void 0) return preResult;
    }
    if (this.hasResourceBundle(lng, ns)) return true;
    if (!this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages) return true;
    const {
      languageUtils
    } = this.services;
    const loadLng = !options.lng ? lng : languageUtils.isSupportedCode(lng) && languageUtils.toResolveHierarchy(lng, false)[0];
    if ((!loadLng || loadNotPending(loadLng, ns)) && (!fallbackLng || loadNotPending(lastLng, ns))) return true;
    return false;
  }
  loadNamespaces(ns, callback) {
    const deferred = defer();
    if (!this.options.ns || !this.services.backendConnector) {
      if (callback) callback();
      return Promise.resolve();
    }
    if (isString(ns)) ns = [ns];
    ns.forEach((n) => {
      if (!this.options.ns.includes(n)) this.options.ns.push(n);
    });
    this.loadResources((err) => {
      deferred.resolve();
      if (callback) callback(err);
    });
    return deferred;
  }
  loadLanguages(lngs, callback) {
    const deferred = defer();
    if (isString(lngs)) lngs = [lngs];
    const preloaded = this.options.preload || [];
    const newLngs = lngs.filter((lng) => !preloaded.includes(lng) && !isRefusedLanguageCode(this, lng) && this.services.languageUtils.isSupportedCode(lng));
    if (!newLngs.length) {
      if (callback) callback();
      return Promise.resolve();
    }
    this.options.preload = preloaded.concat(newLngs);
    this.loadResources((err) => {
      deferred.resolve();
      if (callback) callback(err);
    });
    return deferred;
  }
  dir(lng) {
    if (!lng) lng = this.resolvedLanguage || (this.languages?.length > 0 ? this.languages[0] : this.language);
    if (!lng) return "ltr";
    try {
      const l = new Intl.Locale(lng);
      if (l && l.getTextInfo) {
        const ti = l.getTextInfo();
        if (ti && ti.direction) return ti.direction;
      }
    } catch (e) {
    }
    const rtlLngs = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"];
    const languageUtils = this.services?.languageUtils || new LanguageUtil(get());
    if (lng.toLowerCase().indexOf("-latn") > 1) return "ltr";
    return rtlLngs.includes(languageUtils.getLanguagePartFromCode(lng)) || lng.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
  }
  static createInstance(options = {}, callback) {
    const instance2 = new _I18n(options, callback);
    instance2.createInstance = _I18n.createInstance;
    return instance2;
  }
  cloneInstance(options = {}, callback = noop) {
    const forkResourceStore = options.forkResourceStore;
    if (forkResourceStore) {
      options = {
        ...options
      };
      delete options.forkResourceStore;
    }
    const mergedOptions = {
      ...this.options,
      preload: false,
      ...options,
      ...{
        isClone: true
      }
    };
    const clone = new _I18n(mergedOptions);
    clone.logger = options.debug !== void 0 || options.prefix !== void 0 ? this.logger.clone(options) : this.logger;
    const membersToCopy = ["store", "language"];
    membersToCopy.forEach((m) => {
      clone[m] = this[m];
    });
    clone.services = {
      ...this.services
    };
    clone.services.postProcessors = Object.create(this.services.postProcessors);
    clone.services.utils = {
      ...clone.services.utils,
      hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone),
      reloadResources: clone.reloadResources.bind(clone)
    };
    if (forkResourceStore) {
      const copyData = (obj) => {
        const copied = Array.isArray(obj) ? [...obj] : {
          ...obj
        };
        Object.keys(copied).forEach((k) => {
          if (copied[k] && typeof copied[k] === "object") copied[k] = copyData(copied[k]);
        });
        return copied;
      };
      const clonedData = copyData(this.store.data);
      clone.store = new ResourceStore(clonedData, mergedOptions, this.logger);
      clone.services.resourceStore = clone.store;
    }
    if (options.interpolation) {
      const defOpts = get();
      const mergedInterpolation = {
        ...defOpts.interpolation,
        ...this.options.interpolation,
        ...options.interpolation
      };
      const mergedForInterpolator = {
        ...mergedOptions,
        interpolation: mergedInterpolation
      };
      clone.services.interpolator = new Interpolator(mergedForInterpolator, this.logger);
    }
    clone.configuredLngs = /* @__PURE__ */ new Set([...this.configuredLngs || [], ...configuredLanguageCodes(options)]);
    clone.translator = new Translator(clone.services, mergedOptions);
    clone.translator.on("*", (event, ...args) => {
      clone.emit(event, ...args);
    });
    clone.init(mergedOptions, callback);
    clone.translator.options = mergedOptions;
    clone.translator.backendConnector.newestCloneHasLoadedNamespace = clone.hasLoadedNamespace.bind(clone);
    return clone;
  }
  toJSON() {
    return {
      options: this.options,
      store: this.store,
      language: this.language,
      languages: this.languages,
      resolvedLanguage: this.resolvedLanguage
    };
  }
};
var instance = I18n.createInstance();
var createInstance = instance.createInstance;
var dir = instance.dir;
var init = instance.init;
var loadResources = instance.loadResources;
var reloadResources = instance.reloadResources;
var use = instance.use;
var changeLanguage = instance.changeLanguage;
var getFixedT = instance.getFixedT;
var t = instance.t;
var exists = instance.exists;
var setDefaultNamespace = instance.setDefaultNamespace;
var hasLoadedNamespace = instance.hasLoadedNamespace;
var loadNamespaces = instance.loadNamespaces;
var loadLanguages = instance.loadLanguages;

// node_modules/react-i18next/dist/es/i18nInstance.js
var i18nInstance;
var setI18n = (instance2) => {
  i18nInstance = instance2;
};

// node_modules/react-i18next/dist/es/initReactI18next.js
var initReactI18next = {
  type: "3rdParty",
  init(instance2) {
    setI18n(instance2);
  }
};

// locales/en/common.json
var common_default = {
  app: {
    title: "Housing Community Manager",
    tagline: "Housing Manager",
    loading: "Opening your community database...",
    databaseErrorTitle: "The database could not be opened",
    retry: "Try again"
  },
  nav: {
    mainNavigation: "Main navigation",
    dashboard: "Dashboard",
    apartments: "Apartments",
    owners: "Owners",
    charges: "Charges",
    billing: "Monthly Billing",
    payments: "Payments",
    settlements: "Settlements",
    accounting: "Accounting",
    reports: "Reports",
    settings: "Settings"
  },
  theme: {
    darkMode: "Dark mode",
    lightMode: "Light mode",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode"
  },
  actions: {
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    saveChanges: "Save changes",
    cancel: "Cancel",
    close: "Close",
    search: "Search",
    filter: "Filter",
    export: "Export",
    print: "Print",
    generate: "Generate",
    import: "Import",
    refresh: "Refresh",
    actions: "Actions",
    confirm: "Confirm"
  },
  fields: {
    name: "Name",
    description: "Description",
    date: "Date",
    amount: "Amount",
    balance: "Balance",
    account: "Account",
    owner: "Owner",
    apartment: "Apartment",
    area: "Area",
    residents: "Residents",
    type: "Type"
  },
  notifications: {
    saved: "Record saved successfully",
    deleted: "Record deleted successfully",
    changesSaved: "Changes saved",
    operationCompleted: "Operation completed",
    dismiss: "Dismiss notification"
  },
  errors: {
    required: "This field is required",
    invalidValue: "Invalid value",
    unableToSave: "Unable to save record",
    unableToDelete: "Unable to delete record",
    generic: "Something went wrong and nothing was changed. Please try again.",
    foreignKey: "This change conflicts with linked data (for example owners, charges, payments or readings). Check your selections, or deactivate the record instead.",
    checkConstraint: "One of the values is outside the allowed range. Please check the form and try again.",
    uniqueConstraint: "A record with the same unique value already exists. Please use a different value.",
    accountMissing: "This account no longer exists."
  },
  accounting: {
    title: "Accounting",
    description: "Chart of accounts, journal entries, general ledger and financial reports for the community.",
    sectionsLabel: "Accounting sections",
    tabs: {
      chart: "Chart of accounts",
      journal: "Journal",
      ledger: "General ledger",
      reports: "Reports"
    },
    chart: {
      accountArchived: "Account archived",
      accountCreated: "Account created",
      accountDeleted: "Account deleted",
      accountName: "Account name",
      accountReactivated: "Account reactivated",
      accountUpdated: "Account updated",
      active: "Active",
      allTypes: "All types",
      archive: "Archive",
      archiveAccountLabel: "Archive account",
      archiveMessage: 'The account "{{name}}" will be archived. It can no longer be posted to, and its history stays unchanged.',
      archiveTitle: "Archive account?",
      archived: "Archived",
      builtIn: "Built-in",
      builtInNoArchive: "Built-in accounts cannot be archived.",
      code: "Account code",
      codeHint: "For example 4090. The code must be unique.",
      columns: {
        account: "Account",
        code: "Code",
        currentBalance: "Current balance",
        monthlyTurnover: "Monthly turnover",
        status: "Status",
        totalCredits: "Total credits",
        totalDebits: "Total debits"
      },
      createAccount: "Create account",
      deleteAccountLabel: "Delete account",
      deleteMessage: 'The account "{{name}}" will be permanently deleted. This cannot be undone.',
      deleteTitle: "Delete account?",
      editAccount: "Edit account",
      editAccountLabel: "Edit account",
      filterByType: "Filter by type",
      formDescription: "The code and name of the account in the community's chart of accounts.",
      newAccount: "New account",
      noMatches: "No accounts match your search.",
      reactivateAccountLabel: "Reactivate account",
      saveChanges: "Save changes",
      searchLabel: "Search accounts",
      searchPlaceholder: "Search by code or name",
      typeLocked: "The account type cannot be changed after creation."
    },
    journal: {
      columns: {
        account: "Account",
        status: "Status"
      },
      credit: "Credit",
      credits: "Total credits",
      debit: "Debit",
      debits: "Total debits",
      empty: "No journal entries yet.",
      entryDateLabel: "Entry date: {{date}}",
      form: {
        accountForLine: "Account on line {{line}}",
        addLine: "Add line",
        balanced: "Balanced",
        chooseAccount: "Choose an account",
        creditForLine: "Credit amount on line {{line}}",
        debitForLine: "Debit amount on line {{line}}",
        description: "Entry description",
        descriptionPlaceholder: "e.g. rent payment, January",
        notBalanced: "Not balanced",
        postEntry: "Post entry",
        removeLine: "Remove line",
        title: "New journal entry"
      },
      from: "From",
      newEntry: "New entry",
      posted: "Entry posted",
      reverse: "Reverse",
      reverseEntry: "Reverse entry",
      reverseMessage: 'A reversing entry with opposite lines will be created for "{{description}}". The original stays in the journal.',
      reverseTitle: "Reverse this entry?",
      reversed: "Reversal posted",
      saveFailed: "The entry could not be posted",
      status: {
        payment: "Payment",
        posted: "Posted",
        reversal: "Reversal",
        reversed: "Reversed"
      },
      to: "To",
      viewLines: "View lines"
    },
    ledger: {
      accountBalance: "Account balance",
      allAccounts: "All accounts",
      credits: "Total credits",
      debits: "Total debits",
      empty: "No entries in the selected period."
    },
    reports: {
      accountOptional: "Account (optional)",
      asOf: "As of date",
      asOfHint: "The report includes entries up to this date.",
      generated: "Generated",
      noReport: "No report selected",
      noReportHint: "Choose a report type to see a preview.",
      reportType: "Report type",
      selectAccount: "Select an account",
      types: {
        trial: {
          label: "Trial balance",
          description: "Debit and credit turnover and balances of all accounts."
        },
        ledger: {
          label: "General ledger",
          description: "All entries in the selected period with a running balance."
        },
        statement: {
          label: "Account statement",
          description: "Movements of one account with opening and closing balances."
        },
        income: {
          label: "Income summary",
          description: "Income by account for the selected period."
        },
        expense: {
          label: "Expense summary",
          description: "Expenses by account for the selected period."
        },
        pnl: {
          label: "Monthly profit and loss",
          description: "Income, expenses and net result by month."
        },
        cash: {
          label: "Cash movement",
          description: "Inflows and outflows on cash and bank accounts."
        }
      }
    }
  },
  apartments: {
    active: "Active",
    activeOnly: "Active only",
    addApartment: "Add apartment",
    added: "Apartment added",
    allBalances: "All balances",
    allStatuses: "All statuses",
    columns: {
      apartment: "Apartment",
      area: "Area",
      share: "Share",
      status: "Status"
    },
    deleteApartment: "Delete apartment",
    deleteMessage: "Apartment {{number}} will be deleted. This cannot be undone.",
    deleteTitle: "Delete apartment?",
    deleted: "Apartment deleted",
    description: "Community apartments, their area, residents and shares.",
    editApartment: "Edit apartment",
    emptyDescription: "Add your first apartment to start billing.",
    emptyTitle: "No apartments yet",
    filterBalance: "Filter by balance",
    filterStatus: "Filter by status",
    form: {
      activeLabel: "Apartment is active (included in billing)",
      areaPlaceholder: "e.g. 48.5",
      description: "Number, area and number of residents of the apartment.",
      editTitle: "Edit apartment {{number}}",
      number: "Apartment number",
      numberPlaceholder: "e.g. 12A",
      ownerHintCreate: "You can assign an owner after the apartment is created.",
      ownerHintEdit: 'To change the owner, use "Transfer ownership".',
      shareHint: "Share of the common property, e.g. 0.0250.",
      shareRatio: "Share of common property",
      startingBalance: "Starting balance",
      startingBalanceHint: "Existing balance when starting to use the app mid-year. Negative means the owner overpaid; new charges are added to it."
    },
    inactive: "Inactive",
    inactiveOnly: "Inactive only",
    noMatches: "No apartments match your filters.",
    searchLabel: "Search apartments",
    searchPlaceholder: "Search by apartment number or owner name",
    title: "Apartments",
    transferOwnership: "Transfer ownership",
    updated: "Apartment updated",
    noOwner: "No owner",
    selectApartment: "Select an apartment",
    details: {
      title: "Apartment {{number}} - this year",
      yearDescription: "Charges and payments for {{year}}.",
      charges: "Charges",
      payments: "Payments",
      noCharges: "No charges this year.",
      noPayments: "No payments this year.",
      month: "Month",
      description: "Description",
      totalCharged: "Total charged",
      totalPaid: "Total paid",
      summary: "Summary",
      yearBalanceNote: "This year's result (charged minus paid): {{amount}}. The overall balance also includes the starting balance and everything from previous years."
    }
  },
  balance: {
    creditAmount: "Overpayment {{amount}}",
    filter: {
      credit: "Overpayments",
      debt: "Debts"
    },
    status: {
      credit: "Overpaid",
      debt: "Debt",
      settled: "Settled"
    }
  },
  dashboard: {
    accounting: {
      bankBalance: "Bank account balance",
      cashOnHand: "Cash on hand",
      expensesThisMonth: "Expenses this month",
      incomeThisMonth: "Income this month",
      netResult: "Net result",
      netResultHint: "Income minus expenses this month."
    },
    accountingThisMonth: "Accounting this month",
    description: "Community overview for today.",
    paymentApartment: "Apartment {{number}}",
    debtors: {
      title: "Apartments in debt",
      description: "{{count}} apartments with an outstanding balance.",
      none: "No apartments are in debt.",
      total: "Total debt"
    },
    recentPayments: "Recent payments",
    recentPaymentsEmptyDescription: "Recorded payments will appear here.",
    recentPaymentsEmptyTitle: "No payments yet",
    stats: {
      apartments: "Apartments",
      debtorCount: "Debtors",
      liabilities: "Liabilities",
      liabilitiesHint: "Owner overpayments",
      receivables: "Receivables",
      receivablesHint: "Overdue owner payments",
      totalBalance: "Total balance",
      totalBalanceHint: "Receivables minus overpayments"
    },
    title: "Dashboard",
    welcomeDescription: "Add apartments and charges to see the community summary.",
    welcomeTitle: "Welcome to community management"
  },
  owners: {
    addOwner: "Add owner",
    added: "Owner added",
    columns: {
      apartments: "Apartments",
      contact: "Contact",
      fullName: "Full name"
    },
    deleteMessage: "Owner {{name}} will be deleted. This cannot be undone.",
    deleteOwner: "Delete owner",
    deleteTitle: "Delete owner?",
    deleted: "Owner deleted",
    description: "Apartment owners and their contact details.",
    editOwner: "Edit owner",
    emptyDescription: "Add an owner, then assign them an apartment.",
    emptyTitle: "No owners yet",
    form: {
      addTitle: "Add owner",
      address: "Mailing address",
      description: "The owner's contact details.",
      editTitle: "Edit owner",
      email: "Email",
      fullName: "Full name",
      phone: "Phone"
    },
    history: {
      description: "History of apartment ownership transfers.",
      emptyDescription: "This owner has no transfer history yet.",
      emptyTitle: "No history",
      title: "Owner history: {{name}}"
    },
    noMatches: "No owners match your search.",
    noPhone: "No phone",
    none: "None",
    searchLabel: "Search owners",
    searchPlaceholder: "Search by name, email or phone",
    title: "Owners",
    transfer: {
      apartment: "Apartment",
      currentOwner: "Current owner",
      date: "Transfer date",
      description: "Move ownership of an apartment to a new owner.",
      needTwoOwners: "Ownership can only be transferred between two different owners. Add a second owner first.",
      newOwner: "New owner",
      note: "Note (optional)",
      selectApartment: "Select an apartment",
      selectNewOwner: "Select a new owner",
      submit: "Transfer ownership",
      title: "Transfer ownership",
      transferred: "Ownership transferred"
    },
    transferApartment: "Transfer ownership",
    viewHistory: "View history",
    updated: "Owner updated"
  },
  reports: {
    rangeLabel: "{{from}} to {{to}}",
    asOf: "As of {{date}}",
    allAccounts: "All accounts",
    titles: {
      trialBalance: "Trial Balance",
      generalLedger: "General Ledger",
      accountStatement: "Account Statement",
      expenseSummary: "Expense Summary",
      incomeSummary: "Income Summary",
      monthlyProfitLoss: "Monthly Profit and Loss",
      cashMovement: "Cash Movement"
    },
    labels: {
      totalDebits: "Total debits",
      totalCredits: "Total credits",
      status: "Status",
      balanced: "Balanced",
      outOfBalance: "Out of balance",
      lines: "Lines",
      accountType: "Account type",
      openingBalance: "Opening balance",
      closingBalance: "Closing balance",
      totalExpenses: "Total expenses",
      totalIncome: "Total income",
      netResultForPeriod: "Net result for period",
      netCashMovement: "Net cash movement"
    },
    headings: {
      accounts: "Accounts",
      transactions: "Transactions",
      movements: "Movements",
      expensesByAccount: "Expenses by account",
      incomeByAccount: "Income by account",
      months: "Months",
      cashMovements: "Cash and bank movements"
    },
    columns: {
      code: "Code",
      account: "Account",
      type: "Type",
      debits: "Debits",
      credits: "Credits",
      debit: "Debit",
      credit: "Credit",
      balance: "Balance",
      runningBalance: "Running balance",
      net: "Net",
      month: "Month",
      income: "Income",
      expenses: "Expenses",
      netResult: "Net result",
      inflows: "Inflows",
      outflows: "Outflows",
      netMovement: "Net movement"
    }
  },
  settlements: {
    title: "Settlements",
    description: "Record meter readings and calculate consumption for apartments.",
    columns: {
      reading: "Reading",
      usedSincePrevious: "Used since previous reading"
    },
    firstReading: "First reading",
    readingAdded: "Reading added",
    readingUpdated: "Reading updated",
    readingDeleted: "Reading deleted",
    meterTypes: "Meter types",
    addReading: "Add reading",
    meterTypeLabel: "Meter type",
    selectMeterType: "Select a meter type",
    chooseTitle: "Choose an apartment and meter type",
    chooseDescriptionSetup: "Add at least one apartment and one meter type to start recording readings.",
    chooseDescription: "Select an apartment and a meter type to see its readings.",
    addMeterType: "Add meter type",
    noReadingsTitle: "No readings yet",
    noReadingsDescription: "Add the first {{meter}} reading for apartment {{number}}.",
    yearlySummaryTitle: "Yearly summary",
    editReading: "Edit reading",
    deleteReading: "Delete reading",
    noReadings: "No readings.",
    deleteTitle: "Delete reading?",
    deleteMessage: "The reading {{value}} from {{date}} will be deleted.",
    consumption: {
      needTwo: "Add at least two readings to see the summary.",
      dateColumn: "Date",
      consumptionColumn: "Consumption",
      amountColumn: "Amount",
      firstReading: "First reading",
      total: "Total",
      noRate: "Add a rate to a reading to see the amount to pay.",
      advancesRow: "Advance payments (deducted)",
      afterAdvances: "{{total}} minus advances {{advances}}"
    },
    form: {
      addTitle: "Add reading",
      editTitle: "Edit reading",
      description: "Apartment {{number}}, meter: {{meter}}.",
      readingDate: "Reading date",
      meterReading: "Meter reading",
      meterReadingHint: "Enter the value shown on the meter.",
      meterReadingPlaceholder: "e.g. 1254.8",
      rate: "Rate",
      rateHint: "Optional, e.g. price per unit.",
      ratePlaceholder: "e.g. 3.50",
      advanceMonths: "Advance months",
      advanceMonthsHint: "How many months were paid in advance, e.g. 3.",
      advanceMonthlyAmount: "Advance monthly amount",
      advanceAmountHint: "Amount paid for each advance month.",
      advanceTotal: "Total advance: {{amount}}"
    },
    meterTypesModal: {
      title: "Meter types",
      description: "Define the meters you record readings for, such as water or electricity.",
      newType: "New meter type",
      renameType: "Rename meter type",
      namePlaceholder: "e.g. Cold water",
      added: "Meter type added",
      updated: "Meter type updated",
      deleted: "Meter type deleted",
      empty: "No meter types yet.",
      renameLabel: "Rename {{name}}",
      deleteLabel: "Delete {{name}}",
      deleteTitle: "Delete meter type?",
      deleteMessage: 'The meter type "{{name}}" will be deleted. This cannot be undone.'
    },
    backToApartments: "Back to apartments",
    searchLabel: "Search apartments",
    searchPlaceholder: "Search by apartment number or owner name",
    noMatchesTitle: "No apartments found",
    noMatchesDescription: "No apartment matches your search. Try a different number or owner name.",
    noOwner: "No owner assigned",
    latestReading: "Latest reading: {{date}}",
    noReadingsShort: "No readings yet",
    chooseMeterTitle: "Apartment {{number}} - choose a meter type",
    chooseMeterDescription: "Select a meter type to see its readings for this apartment.",
    meterTypeNames: {
      coldWater: "Cold water",
      hotWater: "Hot water",
      electricity: "Electricity",
      gas: "Gas",
      heating: "Heating"
    }
  },
  settings: {
    title: "Settings",
    description: "Community details, language, appearance and data management.",
    community: {
      title: "Community details",
      description: "Shown in the sidebar and on every report.",
      name: "Community name",
      currency: "Currency code",
      currencyHint: "Three letters, for example PLN, EUR or USD.",
      save: "Save settings",
      saved: "Settings saved."
    },
    language: {
      title: "Language",
      description: "Choose the language of the application. Polish is the default.",
      label: "Application language",
      polish: "Polski",
      english: "English"
    },
    appearance: {
      title: "Appearance",
      description: "Choose the colour theme for this computer.",
      label: "Theme",
      light: "Light",
      dark: "Dark"
    },
    data: {
      title: "Data",
      description: "All data is stored on this computer. Download a backup file to keep a copy safe.",
      downloadBackup: "Create backup",
      backupDownloaded: "Backup downloaded.",
      resetAll: "Reset all data",
      eraseTitle: "Erase all data?",
      eraseMessage: "Every apartment, owner, charge, payment and meter reading will be permanently deleted. Download a backup first if you may need this data later.",
      eraseConfirm: "Erase all data",
      backupCreated: "Backup created.",
      restoreBackup: "Restore from backup",
      restoreTitle: "Restore from backup?",
      restoreMessage: "Choose a backup file. All current data will be replaced with the backup contents. A backup of the current data is saved first, and the application restarts after restoring.",
      restoreConfirm: "Choose backup file"
    }
  },
  validation: {
    labels: {
      name: "Name",
      description: "Description",
      amount: "Amount",
      rate: "Rate",
      chargeName: "Charge name",
      accountName: "Account name",
      apartmentNumber: "Apartment number",
      area: "Area",
      residentsCount: "Residents count",
      shareRatio: "Share ratio",
      startingBalance: "Starting balance",
      fullName: "Full name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      note: "Note",
      readingValue: "Reading value",
      meterName: "Meter name",
      communityName: "Community name"
    },
    required: "{{label}} is required.",
    maxLength: "{{label}} must be {{max}} characters or fewer.",
    mustBeNumber: "{{label}} must be a number.",
    negative: "{{label}} cannot be negative.",
    mustBePositive: "{{label}} must be greater than zero.",
    wholeNumber: "{{label}} must be a whole number of 0 or more.",
    fallbackSave: "The record could not be saved.",
    accountCodeRequired: "Account code is required.",
    accountCodeLength: "Account code must be 20 characters or fewer.",
    accountCodePattern: "Use letters, digits, dots or dashes, starting with a letter or digit.",
    accountCodeTaken: "Another account already uses this code.",
    chooseAccountType: "Choose an account type.",
    entryDate: "Enter a valid date.",
    twoLines: "A journal entry needs at least two lines.",
    chooseAccount: "Choose an account.",
    accountArchived: "This account is archived and cannot receive entries.",
    amountNumbers: "Amounts must be numbers of zero or more.",
    oneSide: "Enter an amount in either debit or credit, not both or neither.",
    debitsCredits: "Debits ({{debits}}) must equal credits ({{credits}}).",
    selectApartment: "Select an apartment.",
    selectMethod: "Select a calculation method.",
    percentMax: "A percentage rate cannot exceed 100.",
    paymentDate: "Enter a valid payment date.",
    duplicateApartmentNumber: "Another apartment already uses this number.",
    email: "Enter a valid email address.",
    selectNewOwner: "Select the new owner.",
    sameOwner: "The new owner is already the current owner.",
    transferDate: "Enter a valid transfer date.",
    readingDate: "Enter a valid reading date.",
    selectMeterType: "Select a meter type.",
    readingDuplicate: "A reading for this meter already exists on this date.",
    readingBelowPrevious: "Reading cannot be lower than the previous reading ({{value}} on {{date}}).",
    readingAboveNext: "Reading cannot be higher than the next reading ({{value}} on {{date}}).",
    advanceRequiresPositiveMonthly: "Enter a monthly amount greater than zero for the advance.",
    currency: "Enter a 3-letter currency code, for example PLN or EUR."
  },
  reportDocument: {
    titles: {
      owner: "Owner Account Statement",
      apartment: "Apartment Account Statement",
      debt: "Debt Report",
      payments: "Payment Report",
      summary: "Financial Summary"
    },
    subtitles: {
      owner: "{{name}} - {{community}}",
      apartment: "Apartment {{number}} - {{community}}",
      range: "{{range}} - {{community}}",
      debt: "Outstanding balances as of {{period}} - {{community}}"
    },
    tables: {
      charges: "Charges",
      payments: "Payments",
      apartments: "Apartments",
      apartmentsWithDebt: "Apartments with outstanding debt",
      chargesByType: "Charges by type",
      monthly: "Monthly overview"
    },
    columns: {
      period: "Period",
      apartment: "Apartment",
      charge: "Charge",
      amount: "Amount",
      date: "Date",
      description: "Description",
      chargedInPeriod: "Charged in period",
      paidInPeriod: "Paid in period",
      balanceAtEnd: "Balance at period end",
      owner: "Owner",
      balanceDue: "Balance due",
      entries: "Entries",
      total: "Total",
      charged: "Charged",
      received: "Received",
      summary: "Summary",
      value: "Value"
    },
    summary: {
      period: "Period",
      chargedInPeriod: "Charged in period",
      paidInPeriod: "Paid in period",
      balanceAtEnd: "Balance at period end",
      apartmentsWithDebt: "Apartments with debt",
      totalReceivables: "Total receivables",
      numberOfPayments: "Number of payments",
      totalReceived: "Total received",
      totalCharged: "Total charged",
      receivablesAtEnd: "Receivables at period end",
      liabilitiesAtEnd: "Liabilities at period end (credits)",
      totalBalanceAtEnd: "Total balance at period end",
      apartments: "Apartments"
    },
    generated: "Generated: {{date}}",
    page: "Page {{page}} of {{total}}",
    savedTo: "Saved to {{path}}"
  },
  serviceErrors: {
    systemAccountsKeepType: "System accounts keep their type.",
    typeLocked: "The type cannot change once the account has transactions.",
    systemNoArchive: "System accounts cannot be archived.",
    systemNoDelete: "System accounts cannot be deleted.",
    accountHasTransactions: "This account has transactions and cannot be deleted. Archive it instead.",
    lineNeedsAccount: "Every journal line needs an account.",
    notBalanced: "Debits and credits do not match, so the entry was not saved.",
    entryMissing: "This journal entry no longer exists.",
    alreadyReversed: "This entry has already been reversed.",
    reversalNotReversible: "A reversal entry cannot be reversed.",
    reversalPrefix: "Reversal: {{description}}",
    paymentNotPosted: "The payment could not be posted to the accounts.",
    ownerPaymentDescription: "Owner payment, apartment {{number}}",
    noActiveChargeTypes: "There are no active charge types. Activate or create a charge type before generating billing.",
    noActiveApartments: "There are no active apartments to bill.",
    apartmentMissing: "This apartment no longer exists.",
    newOwnerMissing: "The selected new owner no longer exists.",
    alreadyOwner: "The apartment already belongs to this owner.",
    ownerNotFound: "Owner not found",
    apartmentNotFound: "Apartment not found"
  },
  reportsPage: {
    title: "Reports",
    description: "Create account statements, debt and payment reports, and a financial summary. Export them or print directly.",
    reportType: "Report type",
    kinds: {
      owner: {
        label: "Owner account statement",
        description: "Charges and payments for one owner across all their apartments."
      },
      apartment: {
        label: "Apartment account statement",
        description: "Charges, payments and balance for one apartment."
      },
      debt: {
        label: "Debt report",
        description: "Apartments with unpaid balances as of a chosen month."
      },
      payments: {
        label: "Payment report",
        description: "All payments received within a period."
      },
      summary: {
        label: "Financial summary",
        description: "Totals of charges, payments and balances for a period."
      }
    },
    ownerLabel: "Owner",
    selectOwner: "Select owner",
    fromMonth: "From month",
    toMonth: "To month",
    asOfMonth: "As of month",
    asOfHint: "Balances include all charges and payments up to the end of this month.",
    generate: "Generate report",
    generated: "Report generated.",
    generatedAt: "Generated {{date}}",
    noEntries: "No entries for this report.",
    noReportTitle: "No report yet",
    noReportDescription: "Choose a report type and period, then generate it to preview, export or print.",
    exportPdf: "Export PDF",
    exportExcel: "Export Excel",
    print: "Print",
    errors: {
      invalidMonths: "Choose valid months.",
      rangeOrder: "The start month must be before the end month.",
      selectOwner: "Select an owner.",
      selectApartment: "Select an apartment."
    }
  },
  charges: {
    title: "Charges",
    description: "Define charge types and how they are calculated.",
    addCharge: "Add charge",
    editCharge: "Edit charge",
    deleteCharge: "Delete charge",
    deleteTitle: "Delete charge?",
    deleteMessage: 'The charge "{{name}}" will be deleted. This cannot be undone.',
    added: "Charge added",
    updated: "Charge updated",
    deleted: "Charge deleted",
    active: "Active",
    inactive: "Inactive",
    emptyTitle: "No charges yet",
    emptyDescription: "Add your first charge, such as rent, water or waste collection.",
    noCharges: "No charges.",
    columns: {
      charge: "Charge",
      method: "Calculation",
      rate: "Rate",
      status: "Status"
    },
    form: {
      editTitle: "Edit charge",
      description: "Set the charge name and how it is calculated for apartments.",
      name: "Charge name",
      namePlaceholder: "e.g. Maintenance fee",
      method: "Calculation method",
      rate: "Rate ({{unit}})",
      ratePlaceholder: "e.g. 3.50",
      ratePlaceholderPercent: "e.g. 10",
      activeLabel: "Charge is active (included in billing)"
    }
  },
  billing: {
    title: "Monthly Billing",
    description: "Generate monthly charges for all active apartments.",
    month: "Billing month",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    thisMonth: "This month",
    removeThisMonth: "Remove charges for the month",
    removeTitle: "Remove charges for {{period}}?",
    removeMessage: "All charges for the selected month will be removed. This cannot be undone.",
    removeConfirm: "Remove charges",
    removed: "Charges for the month were removed",
    generate: "Generate charges",
    alreadyBilled: "Charges for {{period}} already exist.",
    created: "Created {{count}} charge entries for {{period}}.",
    existingUnchanged: "Existing entries ({{count}}) were left unchanged.",
    stats: {
      billedApartments: "Billed apartments",
      chargeEntries: "Charge entries",
      totalBilled: "Total billed"
    },
    searchLabel: "Search charges",
    searchPlaceholder: "Search by apartment number or charge name",
    emptyTitle: "No charges for {{period}}",
    emptyDescription: 'Click "Generate charges" to create charges for active apartments.',
    noMatches: "No charges match your search.",
    detailTitle: "Apartment {{number}} - charges",
    detailPeriod: "Charges for {{period}}",
    methods: {
      per_sqm: {
        label: "Per square meter",
        unit: "per m\xB2",
        help: "Amount = rate \xD7 apartment area."
      },
      per_resident: {
        label: "Per resident",
        unit: "per resident",
        help: "Amount = rate \xD7 number of residents in the apartment."
      },
      fixed: {
        label: "Fixed amount",
        unit: "per apartment",
        help: "Every active apartment receives the same amount."
      },
      percentage: {
        label: "Percentage of other charges",
        unit: "% of other charges",
        help: "Amount = percentage of the apartment's other charges for the month."
      }
    }
  },
  payments: {
    title: "Payments",
    description: "Record owner payments and review payment history.",
    recordPayment: "Record payment",
    editPayment: "Edit payment",
    deletePayment: "Delete payment",
    deleteTitle: "Delete payment?",
    deleteMessage: "The payment of {{amount}} from {{date}} for apartment {{number}} will be deleted.",
    recorded: "Payment recorded",
    updated: "Payment updated",
    deleted: "Payment deleted",
    filterApartment: "Filter by apartment",
    allApartments: "All apartments",
    searchLabel: "Search payments",
    searchPlaceholder: "Search by apartment number or description",
    historyTitle: "Payment history for apartment {{number}}",
    currentBalance: "Current balance",
    totalShown: "Total of shown payments:",
    emptyTitle: "No payments yet",
    emptyDescription: "Record the first owner payment to update apartment balances.",
    noMatches: "No payments match your filters.",
    form: {
      editTitle: "Edit payment",
      description: "Choose the apartment, date and amount of the payment.",
      date: "Payment date",
      amount: "Amount ({{currency}})",
      descriptionOptional: "Description (optional)",
      descriptionPlaceholder: "e.g. transfer for January"
    }
  },
  accountType: {
    ASSET: "Asset",
    LIABILITY: "Liability",
    INCOME: "Income",
    EXPENSE: "Expense",
    EQUITY: "Equity"
  },
  accountName: {
    "1010": "Bank Account",
    "1020": "Cash Account",
    "1100": "Receivables from Owners",
    "2010": "Owner Prepayments",
    "2020": "Supplier Payables",
    "4010": "Cleaning Services",
    "4020": "Electricity",
    "4030": "Water and Sewage",
    "4040": "Waste Disposal",
    "4050": "Bank Charges",
    "4060": "Maintenance and Repairs",
    "4070": "Insurance",
    "4080": "Administrative Costs",
    "7010": "Monthly Community Fees",
    "7020": "Interest Income",
    "7090": "Other Income"
  }
};

// locales/pl/common.json
var common_default2 = {
  app: {
    title: "Zarz\u0105dzanie Wsp\xF3lnot\u0105",
    tagline: "Zarz\u0105dzanie wsp\xF3lnot\u0105",
    loading: "Otwieranie bazy danych wsp\xF3lnoty...",
    databaseErrorTitle: "Nie uda\u0142o si\u0119 otworzy\u0107 bazy danych",
    retry: "Spr\xF3buj ponownie"
  },
  nav: {
    mainNavigation: "Nawigacja g\u0142\xF3wna",
    dashboard: "Pulpit",
    apartments: "Lokale",
    owners: "W\u0142a\u015Bciciele",
    charges: "Op\u0142aty",
    billing: "Naliczenia Miesi\u0119czne",
    payments: "Wp\u0142aty",
    settlements: "Liczniki",
    accounting: "Ksi\u0119gowo\u015B\u0107",
    reports: "Raporty",
    settings: "Ustawienia"
  },
  theme: {
    darkMode: "Tryb ciemny",
    lightMode: "Tryb jasny",
    switchToDark: "Prze\u0142\u0105cz na tryb ciemny",
    switchToLight: "Prze\u0142\u0105cz na tryb jasny"
  },
  actions: {
    add: "Dodaj",
    edit: "Edytuj",
    delete: "Usu\u0144",
    save: "Zapisz",
    saveChanges: "Zapisz zmiany",
    cancel: "Anuluj",
    close: "Zamknij",
    search: "Szukaj",
    filter: "Filtruj",
    export: "Eksportuj",
    print: "Drukuj",
    generate: "Generuj",
    import: "Importuj",
    refresh: "Od\u015Bwie\u017C",
    actions: "Akcje",
    confirm: "Potwierd\u017A"
  },
  fields: {
    name: "Nazwa",
    description: "Opis",
    date: "Data",
    amount: "Kwota",
    balance: "Saldo",
    account: "Konto",
    owner: "W\u0142a\u015Bciciel",
    apartment: "Lokal",
    area: "Powierzchnia",
    residents: "Liczba Mieszka\u0144c\xF3w",
    type: "Typ"
  },
  notifications: {
    saved: "Zapisano pomy\u015Blnie",
    deleted: "Usuni\u0119to pomy\u015Blnie",
    changesSaved: "Zmiany zosta\u0142y zapisane",
    operationCompleted: "Operacja zako\u0144czona pomy\u015Blnie",
    dismiss: "Zamknij powiadomienie"
  },
  errors: {
    required: "To pole jest wymagane",
    invalidValue: "Nieprawid\u0142owa warto\u015B\u0107",
    unableToSave: "Nie uda\u0142o si\u0119 zapisa\u0107 danych",
    unableToDelete: "Nie uda\u0142o si\u0119 usun\u0105\u0107 danych",
    generic: "Co\u015B posz\u0142o nie tak i nic nie zosta\u0142o zmienione. Spr\xF3buj ponownie.",
    foreignKey: "Ta zmiana koliduje z powi\u0105zanymi danymi (na przyk\u0142ad w\u0142a\u015Bcicielami, op\u0142atami, wp\u0142atami lub odczytami). Sprawd\u017A wybrane warto\u015Bci lub dezaktywuj rekord.",
    checkConstraint: "Jedna z warto\u015Bci jest poza dozwolonym zakresem. Sprawd\u017A formularz i spr\xF3buj ponownie.",
    uniqueConstraint: "Rekord o tej samej unikalnej warto\u015Bci ju\u017C istnieje. U\u017Cyj innej warto\u015Bci.",
    accountMissing: "To konto ju\u017C nie istnieje."
  },
  accounting: {
    title: "Ksi\u0119gowo\u015B\u0107",
    description: "Plan kont, dziennik operacji, ksi\u0119ga g\u0142\xF3wna i raporty finansowe wsp\xF3lnoty.",
    sectionsLabel: "Sekcje ksi\u0119gowo\u015Bci",
    tabs: {
      chart: "Plan kont",
      journal: "Dziennik",
      ledger: "Ksi\u0119ga g\u0142\xF3wna",
      reports: "Raporty"
    },
    chart: {
      accountArchived: "Konto zosta\u0142o zarchiwizowane",
      accountCreated: "Konto zosta\u0142o utworzone",
      accountDeleted: "Konto zosta\u0142o usuni\u0119te",
      accountName: "Nazwa konta",
      accountReactivated: "Konto zosta\u0142o ponownie aktywowane",
      accountUpdated: "Konto zosta\u0142o zaktualizowane",
      active: "Aktywne",
      allTypes: "Wszystkie typy",
      archive: "Zarchiwizuj",
      archiveAccountLabel: "Zarchiwizuj konto",
      archiveMessage: "Konto \u201E{{name}}\u201D zostanie zarchiwizowane. Nie b\u0119dzie mo\u017Cna na nim ksi\u0119gowa\u0107, a historia pozostanie bez zmian.",
      archiveTitle: "Zarchiwizowa\u0107 konto?",
      archived: "Zarchiwizowane",
      builtIn: "Wbudowane",
      builtInNoArchive: "Konta wbudowanych nie mo\u017Cna archiwizowa\u0107.",
      code: "Kod konta",
      codeHint: "Np. 4090. Kod musi by\u0107 unikalny.",
      columns: {
        account: "Konto",
        code: "Kod",
        currentBalance: "Saldo bie\u017C\u0105ce",
        monthlyTurnover: "Obroty miesi\u0119czne",
        status: "Status",
        totalCredits: "Obroty Ma",
        totalDebits: "Obroty Winien"
      },
      createAccount: "Utw\xF3rz konto",
      deleteAccountLabel: "Usu\u0144 konto",
      deleteMessage: "Konto \u201E{{name}}\u201D zostanie trwale usuni\u0119te. Tej operacji nie mo\u017Cna cofn\u0105\u0107.",
      deleteTitle: "Usun\u0105\u0107 konto?",
      editAccount: "Edytuj konto",
      editAccountLabel: "Edytuj konto",
      filterByType: "Filtruj wed\u0142ug typu",
      formDescription: "Kod i nazwa konta w planie kont wsp\xF3lnoty.",
      newAccount: "Nowe konto",
      noMatches: "Brak kont pasuj\u0105cych do wyszukiwania.",
      reactivateAccountLabel: "Aktywuj ponownie konto",
      saveChanges: "Zapisz zmiany",
      searchLabel: "Szukaj kont",
      searchPlaceholder: "Szukaj po kodzie lub nazwie",
      typeLocked: "Typu konta nie mo\u017Cna zmieni\u0107 po utworzeniu."
    },
    journal: {
      columns: {
        account: "Konto",
        status: "Status"
      },
      credit: "Ma",
      credits: "Razem Ma",
      debit: "Winien",
      debits: "Razem Winien",
      empty: "Brak wpis\xF3w w dzienniku.",
      entryDateLabel: "Data operacji: {{date}}",
      form: {
        accountForLine: "Konto w wierszu {{line}}",
        addLine: "Dodaj wiersz",
        balanced: "Zbilansowane",
        chooseAccount: "Wybierz konto",
        creditForLine: "Kwota Ma w wierszu {{line}}",
        debitForLine: "Kwota Winien w wierszu {{line}}",
        description: "Opis operacji",
        descriptionPlaceholder: "Np. wp\u0142ata za czynsz, stycze\u0144",
        notBalanced: "Niezbilansowane",
        postEntry: "Zaksi\u0119guj",
        removeLine: "Usu\u0144 wiersz",
        title: "Nowa operacja"
      },
      from: "Od",
      newEntry: "Nowa operacja",
      posted: "Operacja zosta\u0142a zaksi\u0119gowana",
      reverse: "Storno",
      reverseEntry: "Wykonaj storno",
      reverseMessage: "Dla operacji \u201E{{description}}\u201D zostanie utworzona operacja storno z przeciwnymi zapisami. Orygina\u0142 pozostanie w dzienniku.",
      reverseTitle: "Wykona\u0107 storno operacji?",
      reversed: "Storno zosta\u0142o zaksi\u0119gowane",
      saveFailed: "Nie uda\u0142o si\u0119 zaksi\u0119gowa\u0107 operacji",
      status: {
        payment: "Wp\u0142ata",
        posted: "Zaksi\u0119gowana",
        reversal: "Storno",
        reversed: "Stornowana"
      },
      to: "Do",
      viewLines: "Zobacz zapisy"
    },
    ledger: {
      accountBalance: "Saldo konta",
      allAccounts: "Wszystkie konta",
      credits: "Razem Ma",
      debits: "Razem Winien",
      empty: "Brak operacji w wybranym okresie."
    },
    reports: {
      accountOptional: "Konto (opcjonalnie)",
      asOf: "Stan na dzie\u0144",
      asOfHint: "Raport uwzgl\u0119dnia operacje do tego dnia.",
      generated: "Wygenerowano",
      noReport: "Nie wybrano raportu",
      noReportHint: "Wybierz typ raportu, aby zobaczy\u0107 podgl\u0105d.",
      reportType: "Typ raportu",
      selectAccount: "Wybierz konto",
      types: {
        trial: {
          label: "Zestawienie obrot\xF3w i sald",
          description: "Obroty Winien i Ma oraz salda wszystkich kont."
        },
        ledger: {
          label: "Ksi\u0119ga g\u0142\xF3wna",
          description: "Wszystkie zapisy w wybranym okresie z saldem narastaj\u0105cym."
        },
        statement: {
          label: "Wyci\u0105g konta",
          description: "Ruchy jednego konta wraz z saldem pocz\u0105tkowym i ko\u0144cowym."
        },
        income: {
          label: "Zestawienie przychod\xF3w",
          description: "Przychody wed\u0142ug kont w wybranym okresie."
        },
        expense: {
          label: "Zestawienie koszt\xF3w",
          description: "Koszty wed\u0142ug kont w wybranym okresie."
        },
        pnl: {
          label: "Miesi\u0119czny rachunek zysk\xF3w i strat",
          description: "Przychody, koszty i wynik netto w podziale na miesi\u0105ce."
        },
        cash: {
          label: "Przep\u0142ywy pieni\u0119\u017Cne",
          description: "Wp\u0142ywy i wyp\u0142ywy na kontach kasy i banku."
        }
      }
    }
  },
  apartments: {
    active: "Aktywny",
    activeOnly: "Tylko aktywne",
    addApartment: "Dodaj lokal",
    added: "Lokal zosta\u0142 dodany",
    allBalances: "Wszystkie salda",
    allStatuses: "Wszystkie statusy",
    columns: {
      apartment: "Lokal",
      area: "Powierzchnia",
      share: "Udzia\u0142",
      status: "Status"
    },
    deleteApartment: "Usu\u0144 lokal",
    deleteMessage: "Lokal {{number}} zostanie usuni\u0119ty. Tej operacji nie mo\u017Cna cofn\u0105\u0107.",
    deleteTitle: "Usun\u0105\u0107 lokal?",
    deleted: "Lokal zosta\u0142 usuni\u0119ty",
    description: "Lokale wsp\xF3lnoty, ich powierzchnia, mieszka\u0144cy i udzia\u0142y.",
    editApartment: "Edytuj lokal",
    emptyDescription: "Dodaj pierwszy lokal, aby rozpocz\u0105\u0107 naliczenia.",
    emptyTitle: "Brak lokali",
    filterBalance: "Filtruj wed\u0142ug salda",
    filterStatus: "Filtruj wed\u0142ug statusu",
    form: {
      activeLabel: "Lokal jest aktywny (uwzgl\u0119dniany w naliczeniach)",
      areaPlaceholder: "np. 48,5",
      description: "Numer, powierzchnia i liczba mieszka\u0144c\xF3w lokalu.",
      editTitle: "Edytuj lokal {{number}}",
      number: "Numer lokalu",
      numberPlaceholder: "np. 12A",
      ownerHintCreate: "W\u0142a\u015Bciciela przypiszesz po utworzeniu lokalu.",
      ownerHintEdit: "Aby zmieni\u0107 w\u0142a\u015Bciciela, u\u017Cyj opcji \u201EPrzeka\u017C w\u0142asno\u015B\u0107\u201D.",
      shareHint: "Udzia\u0142 w nieruchomo\u015Bci wsp\xF3lnej, np. 0,0250.",
      shareRatio: "Udzia\u0142 w nieruchomo\u015Bci",
      startingBalance: "Saldo pocz\u0105tkowe",
      startingBalanceHint: "Istniej\u0105ce saldo przy rozpocz\u0119ciu pracy z aplikacj\u0105 w trakcie roku. Warto\u015B\u0107 ujemna oznacza nadp\u0142at\u0119 w\u0142a\u015Bciciela; nowe naliczenia s\u0105 dodawane do tego salda."
    },
    inactive: "Nieaktywny",
    inactiveOnly: "Tylko nieaktywne",
    noMatches: "Brak lokali pasuj\u0105cych do filtr\xF3w.",
    searchLabel: "Szukaj lokali",
    searchPlaceholder: "Szukaj po numerze lokalu lub nazwisku w\u0142a\u015Bciciela",
    title: "Lokale",
    transferOwnership: "Przeka\u017C w\u0142asno\u015B\u0107",
    updated: "Lokal zosta\u0142 zaktualizowany",
    noOwner: "Brak w\u0142a\u015Bciciela",
    selectApartment: "Wybierz lokal",
    details: {
      title: "Lokal {{number}} - w tym roku",
      yearDescription: "Op\u0142aty i wp\u0142aty za rok {{year}}.",
      charges: "Op\u0142aty",
      payments: "Wp\u0142aty",
      noCharges: "Brak op\u0142at w tym roku.",
      noPayments: "Brak wp\u0142at w tym roku.",
      month: "Miesi\u0105c",
      description: "Opis",
      totalCharged: "Suma op\u0142at",
      totalPaid: "Suma wp\u0142at",
      summary: "Podsumowanie",
      yearBalanceNote: "Wynik tego roku (op\u0142aty minus wp\u0142aty): {{amount}}. Saldo og\xF3lne zawiera dodatkowo saldo pocz\u0105tkowe i wszystko z lat poprzednich."
    }
  },
  balance: {
    creditAmount: "Nadp\u0142ata {{amount}}",
    filter: {
      credit: "Nadp\u0142aty",
      debt: "Zad\u0142u\u017Cenia"
    },
    status: {
      credit: "Nadp\u0142ata",
      debt: "Zad\u0142u\u017Cenie",
      settled: "Rozliczony"
    }
  },
  dashboard: {
    accounting: {
      bankBalance: "Saldo rachunku bankowego",
      cashOnHand: "Got\xF3wka w kasie",
      expensesThisMonth: "Koszty w tym miesi\u0105cu",
      incomeThisMonth: "Przychody w tym miesi\u0105cu",
      netResult: "Wynik netto",
      netResultHint: "Przychody minus koszty w bie\u017C\u0105cym miesi\u0105cu."
    },
    accountingThisMonth: "Ksi\u0119gowo\u015B\u0107 w tym miesi\u0105cu",
    description: "Przegl\u0105d wsp\xF3lnoty na dzi\u015B.",
    paymentApartment: "Lokal {{number}}",
    debtors: {
      title: "Lokale z zaleg\u0142o\u015Bciami",
      description: "Lokali z zaleg\u0142ym saldem: {{count}}.",
      none: "\u017Baden lokal nie ma zaleg\u0142o\u015Bci.",
      total: "\u0141\u0105czny d\u0142ug"
    },
    recentPayments: "Ostatnie wp\u0142aty",
    recentPaymentsEmptyDescription: "Zarejestrowane wp\u0142aty pojawi\u0105 si\u0119 tutaj.",
    recentPaymentsEmptyTitle: "Brak wp\u0142at",
    stats: {
      apartments: "Lokale",
      debtorCount: "D\u0142u\u017Cnicy",
      liabilities: "Zobowi\u0105zania",
      liabilitiesHint: "Nadp\u0142aty w\u0142a\u015Bcicieli",
      receivables: "Nale\u017Cno\u015Bci",
      receivablesHint: "Zaleg\u0142e p\u0142atno\u015Bci w\u0142a\u015Bcicieli",
      totalBalance: "Saldo \u0142\u0105czne",
      totalBalanceHint: "R\xF3\u017Cnica nale\u017Cno\u015Bci i nadp\u0142at"
    },
    title: "Pulpit",
    welcomeDescription: "Dodaj lokale i op\u0142aty, aby zobaczy\u0107 podsumowanie wsp\xF3lnoty.",
    welcomeTitle: "Witaj w zarz\u0105dzaniu wsp\xF3lnot\u0105"
  },
  owners: {
    addOwner: "Dodaj w\u0142a\u015Bciciela",
    added: "W\u0142a\u015Bciciel zosta\u0142 dodany",
    columns: {
      apartments: "Lokale",
      contact: "Kontakt",
      fullName: "Imi\u0119 i nazwisko"
    },
    deleteMessage: "W\u0142a\u015Bciciel {{name}} zostanie usuni\u0119ty. Tej operacji nie mo\u017Cna cofn\u0105\u0107.",
    deleteOwner: "Usu\u0144 w\u0142a\u015Bciciela",
    deleteTitle: "Usun\u0105\u0107 w\u0142a\u015Bciciela?",
    deleted: "W\u0142a\u015Bciciel zosta\u0142 usuni\u0119ty",
    description: "W\u0142a\u015Bciciele lokali i ich dane kontaktowe.",
    editOwner: "Edytuj w\u0142a\u015Bciciela",
    emptyDescription: "Dodaj w\u0142a\u015Bciciela, a nast\u0119pnie przypisz mu lokal.",
    emptyTitle: "Brak w\u0142a\u015Bcicieli",
    form: {
      addTitle: "Dodaj w\u0142a\u015Bciciela",
      address: "Adres korespondencyjny",
      description: "Dane kontaktowe w\u0142a\u015Bciciela.",
      editTitle: "Edytuj w\u0142a\u015Bciciela",
      email: "E-mail",
      fullName: "Imi\u0119 i nazwisko",
      phone: "Telefon"
    },
    history: {
      description: "Historia przekaza\u0144 w\u0142asno\u015Bci lokali.",
      emptyDescription: "Ten w\u0142a\u015Bciciel nie ma jeszcze historii przekaza\u0144.",
      emptyTitle: "Brak historii",
      title: "Historia w\u0142a\u015Bciciela: {{name}}"
    },
    noMatches: "Brak w\u0142a\u015Bcicieli pasuj\u0105cych do wyszukiwania.",
    noPhone: "Brak telefonu",
    none: "Brak",
    searchLabel: "Szukaj w\u0142a\u015Bcicieli",
    searchPlaceholder: "Szukaj po nazwisku, e-mailu lub telefonie",
    title: "W\u0142a\u015Bciciele",
    transfer: {
      apartment: "Lokal",
      currentOwner: "Obecny w\u0142a\u015Bciciel",
      date: "Data przekazania",
      description: "Przeniesienie w\u0142asno\u015Bci lokalu na nowego w\u0142a\u015Bciciela.",
      needTwoOwners: "Aby przekaza\u0107 w\u0142asno\u015B\u0107, potrzebne s\u0105 co najmniej dwie osoby. Najpierw dodaj drugiego w\u0142a\u015Bciciela.",
      newOwner: "Nowy w\u0142a\u015Bciciel",
      note: "Notatka (opcjonalnie)",
      selectApartment: "Wybierz lokal",
      selectNewOwner: "Wybierz nowego w\u0142a\u015Bciciela",
      submit: "Przeka\u017C w\u0142asno\u015B\u0107",
      title: "Przeka\u017C w\u0142asno\u015B\u0107",
      transferred: "W\u0142asno\u015B\u0107 zosta\u0142a przekazana"
    },
    transferApartment: "Przeka\u017C w\u0142asno\u015B\u0107",
    viewHistory: "Zobacz histori\u0119",
    updated: "W\u0142a\u015Bciciel zosta\u0142 zaktualizowany"
  },
  reports: {
    rangeLabel: "{{from}} do {{to}}",
    asOf: "Stan na {{date}}",
    allAccounts: "Wszystkie konta",
    titles: {
      trialBalance: "Zestawienie Obrot\xF3w i Sald",
      generalLedger: "Ksi\u0119ga G\u0142\xF3wna",
      accountStatement: "Wyci\u0105g Konta",
      expenseSummary: "Zestawienie Koszt\xF3w",
      incomeSummary: "Zestawienie Przychod\xF3w",
      monthlyProfitLoss: "Miesi\u0119czny Rachunek Zysk\xF3w i Strat",
      cashMovement: "Raport Przep\u0142yw\xF3w Pieni\u0119\u017Cnych"
    },
    labels: {
      totalDebits: "Suma Winien",
      totalCredits: "Suma Ma",
      status: "Status",
      balanced: "Zbilansowane",
      outOfBalance: "Niezbilansowane",
      lines: "Liczba zapis\xF3w",
      accountType: "Typ konta",
      openingBalance: "Saldo pocz\u0105tkowe",
      closingBalance: "Saldo ko\u0144cowe",
      totalExpenses: "Suma koszt\xF3w",
      totalIncome: "Suma przychod\xF3w",
      netResultForPeriod: "Wynik netto za okres",
      netCashMovement: "Netto ruch got\xF3wkowy"
    },
    headings: {
      accounts: "Konta",
      transactions: "Operacje",
      movements: "Ruchy",
      expensesByAccount: "Koszty wed\u0142ug konta",
      incomeByAccount: "Przychody wed\u0142ug konta",
      months: "Miesi\u0105ce",
      cashMovements: "Ruchy got\xF3wkowe i bankowe"
    },
    columns: {
      code: "Kod",
      account: "Konto",
      type: "Typ",
      debits: "Winien",
      credits: "Ma",
      debit: "Winien",
      credit: "Ma",
      balance: "Saldo",
      runningBalance: "Saldo narastaj\u0105co",
      net: "Saldo",
      month: "Miesi\u0105c",
      income: "Przychody",
      expenses: "Koszty",
      netResult: "Wynik netto",
      inflows: "Wp\u0142ywy",
      outflows: "Wyp\u0142ywy",
      netMovement: "Ruch netto"
    }
  },
  settlements: {
    title: "Liczniki",
    description: "Rejestruj odczyty licznik\xF3w i wylicz zu\u017Cycie dla lokali.",
    columns: {
      reading: "Odczyt",
      usedSincePrevious: "Zu\u017Cycie od poprzedniego odczytu"
    },
    firstReading: "Pierwszy odczyt",
    readingAdded: "Odczyt zosta\u0142 dodany",
    readingUpdated: "Odczyt zosta\u0142 zaktualizowany",
    readingDeleted: "Odczyt zosta\u0142 usuni\u0119ty",
    meterTypes: "Rodzaje licznik\xF3w",
    addReading: "Dodaj odczyt",
    meterTypeLabel: "Rodzaj licznika",
    selectMeterType: "Wybierz rodzaj licznika",
    chooseTitle: "Wybierz lokal i rodzaj licznika",
    chooseDescriptionSetup: "Dodaj co najmniej jeden lokal i jeden rodzaj licznika, aby zacz\u0105\u0107 rejestrowa\u0107 odczyty.",
    chooseDescription: "Wybierz lokal i rodzaj licznika, aby zobaczy\u0107 jego odczyty.",
    addMeterType: "Dodaj rodzaj licznika",
    noReadingsTitle: "Brak odczyt\xF3w",
    noReadingsDescription: "Dodaj pierwszy odczyt licznika: {{meter}} dla lokalu {{number}}.",
    yearlySummaryTitle: "Podsumowanie roczne",
    editReading: "Edytuj odczyt",
    deleteReading: "Usu\u0144 odczyt",
    noReadings: "Brak odczyt\xF3w.",
    deleteTitle: "Usun\u0105\u0107 odczyt?",
    deleteMessage: "Odczyt {{value}} z {{date}} zostanie usuni\u0119ty.",
    consumption: {
      needTwo: "Dodaj co najmniej dwa odczyty, aby zobaczy\u0107 podsumowanie.",
      dateColumn: "Data",
      consumptionColumn: "Zu\u017Cycie",
      amountColumn: "Kwota",
      firstReading: "Pierwszy odczyt",
      total: "Suma",
      noRate: "Dodaj stawk\u0119 do odczytu, aby zobaczy\u0107 kwot\u0119 do zap\u0142aty.",
      advancesRow: "Zaliczki (do odliczenia)",
      afterAdvances: "{{total}} minus zaliczki {{advances}}"
    },
    form: {
      addTitle: "Dodaj odczyt",
      editTitle: "Edytuj odczyt",
      description: "Lokal {{number}}, licznik: {{meter}}.",
      readingDate: "Data odczytu",
      meterReading: "Wskazanie licznika",
      meterReadingHint: "Wpisz warto\u015B\u0107 widoczn\u0105 na liczniku.",
      meterReadingPlaceholder: "np. 1254,8",
      rate: "Stawka",
      rateHint: "Opcjonalna, np. cena za jednostk\u0119.",
      ratePlaceholder: "np. 3,50",
      advanceMonths: "Liczba miesi\u0119cy zaliczki",
      advanceMonthsHint: "Ile miesi\u0119cy op\u0142acono z g\xF3ry, np. 3.",
      advanceMonthlyAmount: "Miesi\u0119czna kwota zaliczki",
      advanceAmountHint: "Kwota p\u0142atna za ka\u017Cdy miesi\u0105c zaliczki.",
      advanceTotal: "\u0141\u0105czna zaliczka: {{amount}}"
    },
    meterTypesModal: {
      title: "Rodzaje licznik\xF3w",
      description: "Zdefiniuj liczniki, dla kt\xF3rych rejestrujesz odczyty, np. wod\u0119 lub pr\u0105d.",
      newType: "Nowy rodzaj licznika",
      renameType: "Zmie\u0144 nazw\u0119 rodzaju licznika",
      namePlaceholder: "np. Woda zimna",
      added: "Rodzaj licznika zosta\u0142 dodany",
      updated: "Rodzaj licznika zosta\u0142 zaktualizowany",
      deleted: "Rodzaj licznika zosta\u0142 usuni\u0119ty",
      empty: "Brak rodzaj\xF3w licznik\xF3w.",
      renameLabel: "Zmie\u0144 nazw\u0119: {{name}}",
      deleteLabel: "Usu\u0144: {{name}}",
      deleteTitle: "Usun\u0105\u0107 rodzaj licznika?",
      deleteMessage: "Rodzaj licznika \u201E{{name}}\u201D zostanie usuni\u0119ty. Tej operacji nie mo\u017Cna cofn\u0105\u0107."
    },
    backToApartments: "Wr\xF3\u0107 do lokali",
    searchLabel: "Szukaj lokali",
    searchPlaceholder: "Szukaj po numerze lokalu lub nazwisku w\u0142a\u015Bciciela",
    noMatchesTitle: "Nie znaleziono lokali",
    noMatchesDescription: "\u017Baden lokal nie pasuje do wyszukiwania. Spr\xF3buj innego numeru lub nazwiska w\u0142a\u015Bciciela.",
    noOwner: "Brak przypisanego w\u0142a\u015Bciciela",
    latestReading: "Ostatni odczyt: {{date}}",
    noReadingsShort: "Brak odczyt\xF3w",
    chooseMeterTitle: "Lokal {{number}} - wybierz rodzaj licznika",
    chooseMeterDescription: "Wybierz rodzaj licznika, aby zobaczy\u0107 odczyty dla tego lokalu.",
    meterTypeNames: {
      coldWater: "Woda zimna",
      hotWater: "Woda ciep\u0142a",
      electricity: "Energia elektryczna",
      gas: "Gaz",
      heating: "Ogrzewanie"
    }
  },
  settings: {
    title: "Ustawienia",
    description: "Dane wsp\xF3lnoty, j\u0119zyk, wygl\u0105d i zarz\u0105dzanie danymi.",
    community: {
      title: "Dane wsp\xF3lnoty",
      description: "Wy\u015Bwietlane w menu bocznym i na ka\u017Cdym raporcie.",
      name: "Nazwa wsp\xF3lnoty",
      currency: "Kod waluty",
      currencyHint: "Trzy litery, np. PLN, EUR lub USD.",
      save: "Zapisz ustawienia",
      saved: "Ustawienia zosta\u0142y zapisane."
    },
    language: {
      title: "J\u0119zyk",
      description: "Wybierz j\u0119zyk aplikacji. Domy\u015Blnie ustawiony jest j\u0119zyk polski.",
      label: "J\u0119zyk aplikacji",
      polish: "Polski",
      english: "English"
    },
    appearance: {
      title: "Wygl\u0105d",
      description: "Wybierz motyw kolorystyczny dla tego komputera.",
      label: "Motyw",
      light: "Jasny",
      dark: "Ciemny"
    },
    data: {
      title: "Dane",
      description: "Wszystkie dane s\u0105 przechowywane na tym komputerze. Pobierz kopi\u0119 zapasow\u0105, aby bezpiecznie zachowa\u0107 kopi\u0119.",
      downloadBackup: "Utw\xF3rz kopi\u0119 zapasow\u0105",
      backupDownloaded: "Kopia zapasowa zosta\u0142a pobrana.",
      resetAll: "Zresetuj wszystkie dane",
      eraseTitle: "Usun\u0105\u0107 wszystkie dane?",
      eraseMessage: "Wszystkie lokale, w\u0142a\u015Bciciele, op\u0142aty, wp\u0142aty i odczyty licznik\xF3w zostan\u0105 trwale usuni\u0119te. Je\u015Bli mo\u017Cesz potrzebowa\u0107 tych danych p\xF3\u017Aniej, najpierw pobierz kopi\u0119 zapasow\u0105.",
      eraseConfirm: "Usu\u0144 wszystkie dane",
      backupCreated: "Kopia zapasowa utworzona.",
      restoreBackup: "Przywr\xF3\u0107 z kopii zapasowej",
      restoreTitle: "Przywr\xF3ci\u0107 z kopii zapasowej?",
      restoreMessage: "Wybierz plik kopii zapasowej. Wszystkie bie\u017C\u0105ce dane zostan\u0105 zast\u0105pione zawarto\u015Bci\u0105 kopii. Najpierw zapisywana jest kopia danych bie\u017C\u0105cych, a po przywr\xF3ceniu aplikacja uruchamia si\u0119 ponownie.",
      restoreConfirm: "Wybierz plik kopii"
    }
  },
  validation: {
    labels: {
      name: "Nazwa",
      description: "Opis",
      amount: "Kwota",
      rate: "Stawka",
      chargeName: "Nazwa op\u0142aty",
      accountName: "Nazwa konta",
      apartmentNumber: "Numer lokalu",
      area: "Powierzchnia",
      residentsCount: "Liczba mieszka\u0144c\xF3w",
      shareRatio: "Udzia\u0142",
      startingBalance: "Saldo pocz\u0105tkowe",
      fullName: "Imi\u0119 i nazwisko",
      email: "E-mail",
      phone: "Telefon",
      address: "Adres korespondencyjny",
      note: "Notatka",
      readingValue: "Wskazanie licznika",
      meterName: "Nazwa licznika",
      communityName: "Nazwa wsp\xF3lnoty"
    },
    required: "Pole \u201E{{label}}\u201D jest wymagane.",
    maxLength: "Pole \u201E{{label}}\u201D mo\u017Ce mie\u0107 najwy\u017Cej {{max}} znak\xF3w.",
    mustBeNumber: "Pole \u201E{{label}}\u201D musi by\u0107 liczb\u0105.",
    negative: "Pole \u201E{{label}}\u201D nie mo\u017Ce by\u0107 ujemne.",
    mustBePositive: "Pole \u201E{{label}}\u201D musi by\u0107 wi\u0119ksze od zera.",
    wholeNumber: "Pole \u201E{{label}}\u201D musi by\u0107 liczb\u0105 ca\u0142kowit\u0105 nie mniejsz\u0105 ni\u017C 0.",
    fallbackSave: "Nie uda\u0142o si\u0119 zapisa\u0107 rekordu.",
    accountCodeRequired: "Kod konta jest wymagany.",
    accountCodeLength: "Kod konta mo\u017Ce mie\u0107 najwy\u017Cej 20 znak\xF3w.",
    accountCodePattern: "U\u017Cywaj liter, cyfr, kropek lub my\u015Blnik\xF3w, zaczynaj\u0105c od litery lub cyfry.",
    accountCodeTaken: "Inne konto u\u017Cywa ju\u017C tego kodu.",
    chooseAccountType: "Wybierz typ konta.",
    entryDate: "Wpisz poprawn\u0105 dat\u0119.",
    twoLines: "Operacja musi mie\u0107 co najmniej dwa wiersze.",
    chooseAccount: "Wybierz konto.",
    accountArchived: "To konto jest zarchiwizowane i nie mo\u017Ce przyjmowa\u0107 zapis\xF3w.",
    amountNumbers: "Kwoty musz\u0105 by\u0107 liczbami nieujemnymi.",
    oneSide: "Wpisz kwot\u0119 w polu Winien albo Ma, nie w obu ani w \u017Cadnym.",
    debitsCredits: "Winien ({{debits}}) musi by\u0107 r\xF3wny Ma ({{credits}}).",
    selectApartment: "Wybierz lokal.",
    selectMethod: "Wybierz spos\xF3b wyliczenia.",
    percentMax: "Stawka procentowa nie mo\u017Ce przekracza\u0107 100.",
    paymentDate: "Wpisz poprawn\u0105 dat\u0119 wp\u0142aty.",
    duplicateApartmentNumber: "Inny lokal u\u017Cywa ju\u017C tego numeru.",
    email: "Wpisz poprawny adres e-mail.",
    selectNewOwner: "Wybierz nowego w\u0142a\u015Bciciela.",
    sameOwner: "Nowy w\u0142a\u015Bciciel jest ju\u017C obecnym w\u0142a\u015Bcicielem.",
    transferDate: "Wpisz poprawn\u0105 dat\u0119 przekazania.",
    readingDate: "Wpisz poprawn\u0105 dat\u0119 odczytu.",
    selectMeterType: "Wybierz rodzaj licznika.",
    readingDuplicate: "Odczyt dla tego licznika ju\u017C istnieje w tym dniu.",
    readingBelowPrevious: "Odczyt nie mo\u017Ce by\u0107 ni\u017Cszy ni\u017C poprzedni ({{value}} z {{date}}).",
    readingAboveNext: "Odczyt nie mo\u017Ce by\u0107 wy\u017Cszy ni\u017C nast\u0119pny ({{value}} z {{date}}).",
    advanceRequiresPositiveMonthly: "Podaj miesi\u0119czn\u0105 kwot\u0119 zaliczki wi\u0119ksz\u0105 od zera.",
    currency: "Wpisz 3-literowy kod waluty, np. PLN lub EUR."
  },
  reportDocument: {
    titles: {
      owner: "Kartoteka W\u0142a\u015Bciciela",
      apartment: "Kartoteka Lokalu",
      debt: "Raport Zad\u0142u\u017Ce\u0144",
      payments: "Raport Wp\u0142at",
      summary: "Podsumowanie Finansowe"
    },
    subtitles: {
      owner: "{{name}} - {{community}}",
      apartment: "Lokal {{number}} - {{community}}",
      range: "{{range}} - {{community}}",
      debt: "Zaleg\u0142e salda na dzie\u0144 {{period}} - {{community}}"
    },
    tables: {
      charges: "Naliczenia",
      payments: "Wp\u0142aty",
      apartments: "Lokale",
      apartmentsWithDebt: "Lokale z zaleg\u0142o\u015Bciami",
      chargesByType: "Naliczenia wed\u0142ug rodzaju",
      monthly: "Zestawienie miesi\u0119czne"
    },
    columns: {
      period: "Okres",
      apartment: "Lokal",
      charge: "Op\u0142ata",
      amount: "Kwota",
      date: "Data",
      description: "Opis",
      chargedInPeriod: "Naliczone w okresie",
      paidInPeriod: "Wp\u0142acone w okresie",
      balanceAtEnd: "Saldo na koniec okresu",
      owner: "W\u0142a\u015Bciciel",
      balanceDue: "Saldo do zap\u0142aty",
      entries: "Pozycje",
      total: "Razem",
      charged: "Naliczono",
      received: "Wp\u0142acono",
      summary: "Podsumowanie",
      value: "Warto\u015B\u0107"
    },
    summary: {
      period: "Okres",
      chargedInPeriod: "Naliczone w okresie",
      paidInPeriod: "Wp\u0142acone w okresie",
      balanceAtEnd: "Saldo na koniec okresu",
      apartmentsWithDebt: "Lokale z zad\u0142u\u017Ceniem",
      totalReceivables: "\u0141\u0105czne nale\u017Cno\u015Bci",
      numberOfPayments: "Liczba wp\u0142at",
      totalReceived: "\u0141\u0105cznie wp\u0142acono",
      totalCharged: "\u0141\u0105cznie naliczono",
      receivablesAtEnd: "Nale\u017Cno\u015Bci na koniec okresu",
      liabilitiesAtEnd: "Zobowi\u0105zania na koniec okresu (nadp\u0142aty)",
      totalBalanceAtEnd: "\u0141\u0105czne saldo na koniec okresu",
      apartments: "Lokale"
    },
    generated: "Wygenerowano: {{date}}",
    page: "Strona {{page}} z {{total}}",
    savedTo: "Zapisano w {{path}}"
  },
  serviceErrors: {
    systemAccountsKeepType: "Konta systemowe zachowuj\u0105 sw\xF3j typ.",
    typeLocked: "Typ konta nie mo\u017Ce si\u0119 zmieni\u0107 po wprowadzeniu operacji.",
    systemNoArchive: "Konta systemowe nie mog\u0105 by\u0107 archiwizowane.",
    systemNoDelete: "Konta systemowe nie mog\u0105 by\u0107 usuni\u0119te.",
    accountHasTransactions: "Konto ma operacje i nie mo\u017Ce zosta\u0107 usuni\u0119te. Zarchiwizuj je zamiast tego.",
    lineNeedsAccount: "Ka\u017Cdy wiersz dziennika musi mie\u0107 konto.",
    notBalanced: "Winien i Ma nie s\u0105 r\xF3wne, dlatego operacja nie zosta\u0142a zapisana.",
    entryMissing: "Ta operacja ju\u017C nie istnieje.",
    alreadyReversed: "Ta operacja zosta\u0142a ju\u017C stornowana.",
    reversalNotReversible: "Operacja storno nie mo\u017Ce zosta\u0107 stornowana.",
    reversalPrefix: "Storno: {{description}}",
    paymentNotPosted: "Wp\u0142aty nie uda\u0142o si\u0119 zaksi\u0119gowa\u0107 na kontach.",
    ownerPaymentDescription: "Wp\u0142ata w\u0142a\u015Bciciela, lokal {{number}}",
    noActiveChargeTypes: "Brak aktywnych rodzaj\xF3w op\u0142at. Aktywuj lub utw\xF3rz rodzaj op\u0142aty przed wygenerowaniem nalicze\u0144.",
    noActiveApartments: "Brak aktywnych lokali do naliczenia.",
    apartmentMissing: "Ten lokal ju\u017C nie istnieje.",
    newOwnerMissing: "Wybrany nowy w\u0142a\u015Bciciel ju\u017C nie istnieje.",
    alreadyOwner: "Ten lokal ju\u017C nale\u017Cy do tego w\u0142a\u015Bciciela.",
    ownerNotFound: "Nie znaleziono w\u0142a\u015Bciciela",
    apartmentNotFound: "Nie znaleziono lokalu"
  },
  reportsPage: {
    title: "Raporty",
    description: "Tw\xF3rz kartoteki, raporty zad\u0142u\u017Ce\u0144 i wp\u0142at oraz podsumowanie finansowe. Eksportuj je lub drukuj bezpo\u015Brednio.",
    reportType: "Typ raportu",
    kinds: {
      owner: {
        label: "Kartoteka w\u0142a\u015Bciciela",
        description: "Naliczenia i wp\u0142aty jednego w\u0142a\u015Bciciela ze wszystkich jego lokali."
      },
      apartment: {
        label: "Kartoteka lokalu",
        description: "Naliczenia, wp\u0142aty i saldo jednego lokalu."
      },
      debt: {
        label: "Raport zad\u0142u\u017Ce\u0144",
        description: "Lokale z nieuregulowanymi saldami na wybrany miesi\u0105c."
      },
      payments: {
        label: "Raport wp\u0142at",
        description: "Wszystkie wp\u0142aty otrzymane w wybranym okresie."
      },
      summary: {
        label: "Podsumowanie finansowe",
        description: "Sumy nalicze\u0144, wp\u0142at i sald za wybrany okres."
      }
    },
    ownerLabel: "W\u0142a\u015Bciciel",
    selectOwner: "Wybierz w\u0142a\u015Bciciela",
    fromMonth: "Od miesi\u0105ca",
    toMonth: "Do miesi\u0105ca",
    asOfMonth: "Stan na miesi\u0105c",
    asOfHint: "Salda uwzgl\u0119dniaj\u0105 wszystkie naliczenia i wp\u0142aty do ko\u0144ca tego miesi\u0105ca.",
    generate: "Wygeneruj raport",
    generated: "Raport zosta\u0142 wygenerowany.",
    generatedAt: "Wygenerowano {{date}}",
    noEntries: "Brak pozycji w tym raporcie.",
    noReportTitle: "Brak raportu",
    noReportDescription: "Wybierz typ raportu i okres, a nast\u0119pnie wygeneruj go, aby zobaczy\u0107 podgl\u0105d, wyeksportowa\u0107 lub wydrukowa\u0107.",
    exportPdf: "Eksportuj PDF",
    exportExcel: "Eksportuj Excel",
    print: "Drukuj",
    errors: {
      invalidMonths: "Wybierz poprawne miesi\u0105ce.",
      rangeOrder: "Miesi\u0105c pocz\u0105tkowy musi by\u0107 wcze\u015Bniejszy ni\u017C miesi\u0105c ko\u0144cowy.",
      selectOwner: "Wybierz w\u0142a\u015Bciciela.",
      selectApartment: "Wybierz lokal."
    }
  },
  charges: {
    title: "Op\u0142aty",
    description: "Definiuj rodzaje op\u0142at i spos\xF3b ich wyliczania.",
    addCharge: "Dodaj op\u0142at\u0119",
    editCharge: "Edytuj op\u0142at\u0119",
    deleteCharge: "Usu\u0144 op\u0142at\u0119",
    deleteTitle: "Usun\u0105\u0107 op\u0142at\u0119?",
    deleteMessage: "Op\u0142ata \u201E{{name}}\u201D zostanie usuni\u0119ta. Tej operacji nie mo\u017Cna cofn\u0105\u0107.",
    added: "Op\u0142ata zosta\u0142a dodana",
    updated: "Op\u0142ata zosta\u0142a zaktualizowana",
    deleted: "Op\u0142ata zosta\u0142a usuni\u0119ta",
    active: "Aktywna",
    inactive: "Nieaktywna",
    emptyTitle: "Brak op\u0142at",
    emptyDescription: "Dodaj pierwsz\u0105 op\u0142at\u0119, np. czynsz, wod\u0119 lub wyw\xF3z \u015Bmieci.",
    noCharges: "Brak op\u0142at.",
    columns: {
      charge: "Op\u0142ata",
      method: "Spos\xF3b wyliczenia",
      rate: "Stawka",
      status: "Status"
    },
    form: {
      editTitle: "Edytuj op\u0142at\u0119",
      description: "Okre\u015Bl nazw\u0119 op\u0142aty i spos\xF3b jej wyliczania dla lokali.",
      name: "Nazwa op\u0142aty",
      namePlaceholder: "np. Czynsz eksploatacyjny",
      method: "Spos\xF3b wyliczenia",
      rate: "Stawka ({{unit}})",
      ratePlaceholder: "np. 3,50",
      ratePlaceholderPercent: "np. 10",
      activeLabel: "Op\u0142ata aktywna (uwzgl\u0119dniana w naliczeniach)"
    }
  },
  billing: {
    title: "Naliczenia Miesi\u0119czne",
    description: "Generuj miesi\u0119czne naliczenia dla wszystkich aktywnych lokali.",
    month: "Miesi\u0105c rozliczeniowy",
    previousMonth: "Poprzedni miesi\u0105c",
    nextMonth: "Nast\u0119pny miesi\u0105c",
    thisMonth: "Bie\u017C\u0105cy miesi\u0105c",
    removeThisMonth: "Usu\u0144 naliczenia za miesi\u0105c",
    removeTitle: "Usun\u0105\u0107 naliczenia za {{period}}?",
    removeMessage: "Wszystkie naliczenia za wybrany miesi\u0105c zostan\u0105 usuni\u0119te. Tej operacji nie mo\u017Cna cofn\u0105\u0107.",
    removeConfirm: "Usu\u0144 naliczenia",
    removed: "Naliczenia za miesi\u0105c zosta\u0142y usuni\u0119te",
    generate: "Generuj naliczenia",
    alreadyBilled: "Naliczenia za {{period}} ju\u017C istniej\u0105.",
    created: "Utworzono {{count}} pozycji nalicze\u0144 za {{period}}.",
    existingUnchanged: "Istniej\u0105ce pozycje ({{count}}) pozosta\u0142y bez zmian.",
    stats: {
      billedApartments: "Naliczone lokale",
      chargeEntries: "Pozycje nalicze\u0144",
      totalBilled: "\u0141\u0105cznie naliczono"
    },
    searchLabel: "Szukaj nalicze\u0144",
    searchPlaceholder: "Szukaj po numerze lokalu lub nazwie op\u0142aty",
    emptyTitle: "Brak nalicze\u0144 za {{period}}",
    emptyDescription: "Kliknij \u201EGeneruj naliczenia\u201D, aby utworzy\u0107 op\u0142aty dla aktywnych lokali.",
    noMatches: "Brak nalicze\u0144 pasuj\u0105cych do wyszukiwania.",
    detailTitle: "Lokal {{number}} - naliczenia",
    detailPeriod: "Naliczenia za {{period}}",
    methods: {
      per_sqm: {
        label: "Za metr kwadratowy",
        unit: "za m\xB2",
        help: "Kwota = stawka \xD7 powierzchnia lokalu."
      },
      per_resident: {
        label: "Za mieszka\u0144ca",
        unit: "za mieszka\u0144ca",
        help: "Kwota = stawka \xD7 liczba mieszka\u0144c\xF3w lokalu."
      },
      fixed: {
        label: "Sta\u0142a kwota",
        unit: "za lokal",
        help: "Ka\u017Cdy aktywny lokal otrzymuje t\u0119 sam\u0105 kwot\u0119."
      },
      percentage: {
        label: "Procent pozosta\u0142ych op\u0142at",
        unit: "% pozosta\u0142ych op\u0142at",
        help: "Kwota = procent sumy pozosta\u0142ych op\u0142at lokalu za dany miesi\u0105c."
      }
    }
  },
  payments: {
    title: "Wp\u0142aty",
    description: "Rejestruj wp\u0142aty w\u0142a\u015Bcicieli i przegl\u0105daj histori\u0119 p\u0142atno\u015Bci.",
    recordPayment: "Zarejestruj wp\u0142at\u0119",
    editPayment: "Edytuj wp\u0142at\u0119",
    deletePayment: "Usu\u0144 wp\u0142at\u0119",
    deleteTitle: "Usun\u0105\u0107 wp\u0142at\u0119?",
    deleteMessage: "Wp\u0142ata {{amount}} z {{date}} dla lokalu {{number}} zostanie usuni\u0119ta.",
    recorded: "Wp\u0142ata zosta\u0142a zarejestrowana",
    updated: "Wp\u0142ata zosta\u0142a zaktualizowana",
    deleted: "Wp\u0142ata zosta\u0142a usuni\u0119ta",
    filterApartment: "Filtruj wed\u0142ug lokalu",
    allApartments: "Wszystkie lokale",
    searchLabel: "Szukaj wp\u0142at",
    searchPlaceholder: "Szukaj po numerze lokalu lub opisie",
    historyTitle: "Historia wp\u0142at lokalu {{number}}",
    currentBalance: "Aktualne saldo",
    totalShown: "Suma wy\u015Bwietlonych wp\u0142at:",
    emptyTitle: "Brak wp\u0142at",
    emptyDescription: "Zarejestruj pierwsz\u0105 wp\u0142at\u0119 w\u0142a\u015Bciciela, aby zaktualizowa\u0107 saldo lokalu.",
    noMatches: "Brak wp\u0142at pasuj\u0105cych do filtr\xF3w.",
    form: {
      editTitle: "Edytuj wp\u0142at\u0119",
      description: "Wybierz lokal, dat\u0119 i kwot\u0119 wp\u0142aty.",
      date: "Data wp\u0142aty",
      amount: "Kwota ({{currency}})",
      descriptionOptional: "Opis (opcjonalnie)",
      descriptionPlaceholder: "np. przelew za stycze\u0144"
    }
  },
  accountType: {
    ASSET: "Aktywa",
    LIABILITY: "Zobowi\u0105zania",
    INCOME: "Przychody",
    EXPENSE: "Koszty",
    EQUITY: "Kapita\u0142 W\u0142asny"
  },
  accountName: {
    "1010": "Rachunek Bankowy",
    "1020": "Kasa",
    "1100": "Nale\u017Cno\u015Bci od W\u0142a\u015Bcicieli",
    "2010": "Rozliczenia z W\u0142a\u015Bcicielami",
    "2020": "Zobowi\u0105zania wobec Dostawc\xF3w",
    "4010": "Us\u0142ugi Sprz\u0105tania",
    "4020": "Energia Elektryczna",
    "4030": "Woda i \u015Acieki",
    "4040": "Wyw\xF3z Odpad\xF3w",
    "4050": "Op\u0142aty Bankowe",
    "4060": "Konserwacja i Remonty",
    "4070": "Ubezpieczenie",
    "4080": "Koszty Administracyjne",
    "7010": "Zaliczki Eksploatacyjne",
    "7020": "Przychody Odsetkowe",
    "7090": "Pozosta\u0142e Przychody"
  }
};

// src/i18n/index.ts
var SUPPORTED_LANGUAGES = ["pl", "en"];
var DEFAULT_LANGUAGE = "pl";
var STORAGE_KEY = "hcm-language";
var LOCALE_BY_LANGUAGE = {
  pl: "pl-PL",
  en: "en-US"
};
function readInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.find((language) => language === stored) ?? DEFAULT_LANGUAGE;
}
void instance.use(initReactI18next).init({
  resources: {
    pl: { common: common_default2 },
    en: { common: common_default }
  },
  lng: readInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  ns: ["common"],
  interpolation: { escapeValue: false },
  returnNull: false
});
document.documentElement.lang = instance.language;
function currentLanguage() {
  return SUPPORTED_LANGUAGES.find((language) => language === instance.language) ?? DEFAULT_LANGUAGE;
}
function currentLocale() {
  return LOCALE_BY_LANGUAGE[currentLanguage()];
}
var i18n_default = instance;

// src/db/repositories/accountsRepo.ts
var ACCOUNT_SELECT = `
  SELECT a.id, a.code, a.name, a.type, a.active, a.system_account, a.created_at,
         EXISTS (SELECT 1 FROM journal_entry_lines l WHERE l.account_id = a.id) AS has_transactions
    FROM accounts a`;
function mapAccount(row) {
  return {
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    type: String(row.type),
    active: Number(row.active) === 1,
    systemAccount: Number(row.system_account) === 1,
    createdAt: String(row.created_at),
    hasTransactions: Number(row.has_transactions) === 1
  };
}
function listAccounts() {
  return queryRows(`${ACCOUNT_SELECT} ORDER BY a.code`).map(mapAccount);
}
function findAccount(id2) {
  const rows = queryRows(`${ACCOUNT_SELECT} WHERE a.id = ?`, [id2]);
  return rows.length === 0 ? null : mapAccount(rows[0]);
}
function findAccountByCode(code) {
  const rows = queryRows(`${ACCOUNT_SELECT} WHERE a.code = ?`, [code]);
  return rows.length === 0 ? null : mapAccount(rows[0]);
}
function listTakenCodes(excludeId) {
  const rows = queryRows("SELECT code FROM accounts WHERE id IS NOT ?", [excludeId]);
  return new Set(rows.map((row) => String(row.code)));
}
function insertAccount(input) {
  execute("INSERT INTO accounts (code, name, type, system_account) VALUES (?, ?, ?, 0)", [
    input.code,
    input.name,
    input.type
  ]);
  return lastInsertId();
}
function updateAccount(id2, input) {
  execute("UPDATE accounts SET code = ?, name = ?, type = ? WHERE id = ?", [input.code, input.name, input.type, id2]);
}
function setAccountActive(id2, active) {
  execute("UPDATE accounts SET active = ? WHERE id = ?", [active ? 1 : 0, id2]);
}
function deleteAccount(id2) {
  execute("DELETE FROM accounts WHERE id = ? AND system_account = 0", [id2]);
}

// src/db/repositories/auditRepo.ts
function insertAuditEntry(input) {
  execute("INSERT INTO audit_log (action, entity, entity_id, summary) VALUES (?, ?, ?, ?)", [
    input.action,
    input.entity,
    input.entityId,
    input.summary
  ]);
}

// src/db/repositories/journalEntriesRepo.ts
var ENTRY_SELECT = `
  SELECT e.id, e.entry_date, e.description, e.created_at, e.source_type, e.source_id, e.reversal_of_id,
         (SELECT COALESCE(SUM(l.debit_amount), 0) FROM journal_entry_lines l WHERE l.journal_entry_id = e.id) AS total_amount,
         EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversal_of_id = e.id) AS reversed
    FROM journal_entries e`;
function mapEntry(row) {
  return {
    id: Number(row.id),
    entryDate: String(row.entry_date),
    description: String(row.description),
    createdAt: String(row.created_at),
    sourceType: row.source_type === null ? null : String(row.source_type),
    sourceId: row.source_id === null ? null : Number(row.source_id),
    reversalOfId: row.reversal_of_id === null ? null : Number(row.reversal_of_id),
    totalAmount: Number(row.total_amount),
    reversed: Number(row.reversed) === 1
  };
}
var LINE_SELECT = `
  SELECT l.id, l.journal_entry_id, l.account_id, l.debit_amount, l.credit_amount,
         a.code, a.name, a.type
    FROM journal_entry_lines l
    JOIN accounts a ON a.id = l.account_id`;
function mapLine(row) {
  return {
    id: Number(row.id),
    journalEntryId: Number(row.journal_entry_id),
    accountId: Number(row.account_id),
    accountCode: String(row.code),
    accountName: String(row.name),
    accountType: String(row.type),
    debitAmount: Number(row.debit_amount),
    creditAmount: Number(row.credit_amount)
  };
}
function listJournalEntries(range) {
  return queryRows(
    `${ENTRY_SELECT} WHERE e.entry_date BETWEEN ? AND ? ORDER BY e.entry_date DESC, e.id DESC`,
    [range.from, range.to]
  ).map(mapEntry);
}
function findJournalEntry(id2) {
  const rows = queryRows(`${ENTRY_SELECT} WHERE e.id = ?`, [id2]);
  return rows.length === 0 ? null : mapEntry(rows[0]);
}
function listLinesForEntry(entryId) {
  return queryRows(`${LINE_SELECT} WHERE l.journal_entry_id = ? ORDER BY l.id`, [entryId]).map(mapLine);
}
function listLedgerLines(range, accountId) {
  const conditions = ["e.entry_date BETWEEN ? AND ?"];
  const params = [range.from, range.to];
  if (accountId !== null) {
    conditions.push("l.account_id = ?");
    params.push(accountId);
  }
  return queryRows(
    `SELECT l.id, l.journal_entry_id, l.account_id, l.debit_amount, l.credit_amount,
            a.code, a.name, a.type, e.entry_date, e.description
       FROM journal_entry_lines l
       JOIN journal_entries e ON e.id = l.journal_entry_id
       JOIN accounts a ON a.id = l.account_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY e.entry_date, e.id, l.id`,
    params
  ).map((row) => ({
    ...mapLine(row),
    entryDate: String(row.entry_date),
    description: String(row.description)
  }));
}
function insertJournalEntry(input) {
  execute(
    "INSERT INTO journal_entries (entry_date, description, source_type, source_id, reversal_of_id) VALUES (?, ?, ?, ?, ?)",
    [
      input.entryDate,
      input.description,
      input.source?.sourceType ?? null,
      input.source?.sourceId ?? null,
      input.reversalOfId
    ]
  );
  return lastInsertId();
}
function insertJournalLine(entryId, line) {
  execute("INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES (?, ?, ?, ?)", [
    entryId,
    line.accountId,
    line.debitAmount,
    line.creditAmount
  ]);
}
function sumLinesForEntry(entryId) {
  const rows = queryRows(
    "SELECT COALESCE(SUM(debit_amount), 0) AS debit, COALESCE(SUM(credit_amount), 0) AS credit FROM journal_entry_lines WHERE journal_entry_id = ?",
    [entryId]
  );
  return { debit: Number(rows[0].debit), credit: Number(rows[0].credit) };
}
function listActiveSourceEntryIds(source) {
  return queryRows(
    `SELECT e.id FROM journal_entries e
      WHERE e.source_type = ? AND e.source_id = ?
        AND NOT EXISTS (SELECT 1 FROM journal_entries r WHERE r.reversal_of_id = e.id)`,
    [source.sourceType, source.sourceId]
  ).map((row) => Number(row.id));
}
function sumTotalsInRange(range) {
  return queryRows(
    `SELECT l.account_id AS account_id,
            SUM(l.debit_amount) AS debit,
            SUM(l.credit_amount) AS credit
       FROM journal_entry_lines l
       JOIN journal_entries e ON e.id = l.journal_entry_id
      WHERE e.entry_date BETWEEN ? AND ?
      GROUP BY l.account_id`,
    [range.from, range.to]
  ).map((row) => ({ accountId: Number(row.account_id), debit: Number(row.debit), credit: Number(row.credit) }));
}
function sumTotalsByPeriodAndAccount(range) {
  return queryRows(
    `SELECT substr(e.entry_date, 1, 7) AS period,
            a.id AS account_id, a.code, a.name, a.type,
            SUM(l.debit_amount) AS debit,
            SUM(l.credit_amount) AS credit
       FROM journal_entry_lines l
       JOIN journal_entries e ON e.id = l.journal_entry_id
       JOIN accounts a ON a.id = l.account_id
      WHERE e.entry_date BETWEEN ? AND ?
      GROUP BY period, a.id
      ORDER BY period, a.code`,
    [range.from, range.to]
  ).map((row) => ({
    period: String(row.period),
    accountId: Number(row.account_id),
    accountCode: String(row.code),
    accountName: String(row.name),
    accountType: String(row.type),
    debit: Number(row.debit),
    credit: Number(row.credit)
  }));
}

// src/lib/money.ts
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function formatMoney(value, currency) {
  return new Intl.NumberFormat(currentLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// src/lib/errors.ts
var AppError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AppError";
  }
};

// src/domain/validation/common.ts
function fail(errors) {
  return { ok: false, errors };
}
function firstError(errors) {
  return Object.values(errors)[0] ?? i18n_default.t("validation.fallbackSave");
}
function requireText(value, label, errors, field, max = 120) {
  const trimmed = value.trim();
  if (trimmed.length === 0) errors[field] = i18n_default.t("validation.required", { label });
  else if (trimmed.length > max) errors[field] = i18n_default.t("validation.maxLength", { label, max });
  return trimmed;
}

// src/lib/periods.ts
var DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
function pad(value) {
  return String(value).padStart(2, "0");
}
function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function currentPeriod() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}
function todayIso() {
  return toDateInputValue(/* @__PURE__ */ new Date());
}
function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDate() === day && date.getUTCMonth() === month - 1;
}
function formatPeriod(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(currentLocale(), {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}
function formatDate(value) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
function periodDateRange(period) {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${pad(lastDay)}` };
}
function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}
function shiftPeriod(period, months) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

// src/domain/accounting/types.ts
var ACCOUNT_TYPES = ["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"];
var ACCOUNT_CODES = {
  BANK: "1010",
  CASH: "1020",
  RECEIVABLES: "1100",
  OWNER_PREPAYMENTS: "2010",
  SUPPLIER_PAYABLES: "2020",
  MONTHLY_FEES: "7010"
};
var DATE_RANGE_ALL = { from: "0000-01-01", to: "9999-12-31" };

// src/domain/validation/accounting.ts
var CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;
function validateAccountInput(raw, takenCodes) {
  const errors = {};
  const code = raw.code.trim();
  if (code.length === 0) errors.code = i18n_default.t("validation.accountCodeRequired");
  else if (code.length > 20) errors.code = i18n_default.t("validation.accountCodeLength");
  else if (!CODE_PATTERN.test(code)) errors.code = i18n_default.t("validation.accountCodePattern");
  else if (takenCodes.has(code)) errors.code = i18n_default.t("validation.accountCodeTaken");
  const name = requireText(raw.name, i18n_default.t("validation.labels.accountName"), errors, "name", 80);
  const type = ACCOUNT_TYPES.find((value) => value === raw.type);
  if (!type) errors.type = i18n_default.t("validation.chooseAccountType");
  if (Object.keys(errors).length > 0 || !type) return fail(errors);
  return { ok: true, data: { code, name, type } };
}
function validateJournalEntryInput(input, accounts) {
  const errors = {};
  const description = requireText(input.description, i18n_default.t("validation.labels.description"), errors, "description", 200);
  if (!isValidDate(input.entryDate)) errors.entryDate = i18n_default.t("validation.entryDate");
  if (input.lines.length < 2) errors.lines = i18n_default.t("validation.twoLines");
  let debitTotal = 0;
  let creditTotal = 0;
  input.lines.forEach((line, index) => {
    const account = line.accountId === null ? void 0 : accounts.get(line.accountId);
    if (!account) errors[`line.${index}.account`] = i18n_default.t("validation.chooseAccount");
    else if (!account.active) errors[`line.${index}.account`] = i18n_default.t("validation.accountArchived");
    const debit = roundMoney(line.debitAmount);
    const credit = roundMoney(line.creditAmount);
    const validAmounts = Number.isFinite(debit) && Number.isFinite(credit) && debit >= 0 && credit >= 0;
    if (!validAmounts) {
      errors[`line.${index}.amount`] = i18n_default.t("validation.amountNumbers");
    } else if (debit > 0 === credit > 0) {
      errors[`line.${index}.amount`] = i18n_default.t("validation.oneSide");
    }
    debitTotal += debit;
    creditTotal += credit;
  });
  if (!errors.lines && roundMoney(debitTotal) !== roundMoney(creditTotal)) {
    errors.lines = i18n_default.t("validation.debitsCredits", {
      debits: roundMoney(debitTotal).toFixed(2),
      credits: roundMoney(creditTotal).toFixed(2)
    });
  }
  if (Object.keys(errors).length > 0) return fail(errors);
  return {
    ok: true,
    data: {
      entryDate: input.entryDate,
      description,
      lines: input.lines.map((line) => ({
        accountId: line.accountId,
        debitAmount: roundMoney(line.debitAmount),
        creditAmount: roundMoney(line.creditAmount)
      }))
    }
  };
}

// src/services/accounting/accountingService.ts
function saveAccount(values, id2) {
  const result = validateAccountInput(values, listTakenCodes(id2));
  if (!result.ok) return result;
  const input = result.data;
  if (id2 === null) {
    const newId = withTransaction(() => {
      const accountId = insertAccount(input);
      insertAuditEntry({
        action: "create",
        entity: "account",
        entityId: accountId,
        summary: `Created account ${input.code} ${input.name}`
      });
      return accountId;
    });
    return { ok: true, data: newId };
  }
  const current = requireAccount(id2);
  if (current.type !== input.type && (current.systemAccount || current.hasTransactions)) {
    return fail({
      type: current.systemAccount ? i18n_default.t("serviceErrors.systemAccountsKeepType") : i18n_default.t("serviceErrors.typeLocked")
    });
  }
  withTransaction(() => {
    updateAccount(id2, input);
    insertAuditEntry({
      action: "update",
      entity: "account",
      entityId: id2,
      summary: `Updated account ${current.code} ${current.name} to ${input.code} ${input.name}`
    });
  });
  return { ok: true, data: id2 };
}
function setAccountArchived(id2, archived) {
  const account = requireAccount(id2);
  if (archived && account.systemAccount) throw new AppError(i18n_default.t("serviceErrors.systemNoArchive"));
  if (archived === !account.active) return;
  withTransaction(() => {
    setAccountActive(id2, !archived);
    insertAuditEntry({
      action: archived ? "archive" : "reactivate",
      entity: "account",
      entityId: id2,
      summary: `${archived ? "Archived" : "Reactivated"} account ${account.code} ${account.name}`
    });
  });
}
function removeAccount(id2) {
  const account = requireAccount(id2);
  if (account.systemAccount) throw new AppError(i18n_default.t("serviceErrors.systemNoDelete"));
  if (account.hasTransactions) {
    throw new AppError(i18n_default.t("serviceErrors.accountHasTransactions"));
  }
  withTransaction(() => {
    deleteAccount(id2);
    insertAuditEntry({
      action: "delete",
      entity: "account",
      entityId: id2,
      summary: `Deleted account ${account.code} ${account.name}`
    });
  });
}
function postJournalEntry(input, source = null, reversalOfId = null) {
  const accounts = new Map(
    listAccounts().map((account) => [account.id, { id: account.id, active: account.active, type: account.type }])
  );
  const result = validateJournalEntryInput(input, accounts);
  if (!result.ok) return result;
  const entry = result.data;
  const entryId = withTransaction(() => {
    const id2 = insertJournalEntry({
      entryDate: entry.entryDate,
      description: entry.description,
      source,
      reversalOfId
    });
    for (const line of entry.lines) {
      if (line.accountId === null) throw new AppError(i18n_default.t("serviceErrors.lineNeedsAccount"));
      insertJournalLine(id2, { accountId: line.accountId, debitAmount: line.debitAmount, creditAmount: line.creditAmount });
    }
    const totals = sumLinesForEntry(id2);
    if (roundMoney(totals.debit) !== roundMoney(totals.credit)) {
      throw new AppError(i18n_default.t("serviceErrors.notBalanced"));
    }
    insertAuditEntry({
      action: reversalOfId === null ? "post" : "reverse",
      entity: "journal_entry",
      entityId: id2,
      summary: `${entry.description} on ${entry.entryDate} for ${roundMoney(totals.debit).toFixed(2)}`
    });
    return id2;
  });
  return { ok: true, data: entryId };
}
function reverseJournalEntry(entryId) {
  const entry = findJournalEntry(entryId);
  if (!entry) throw new AppError(i18n_default.t("serviceErrors.entryMissing"));
  if (entry.reversed) throw new AppError(i18n_default.t("serviceErrors.alreadyReversed"));
  if (entry.reversalOfId !== null) throw new AppError(i18n_default.t("serviceErrors.reversalNotReversible"));
  const reversal = postJournalEntry(
    {
      entryDate: entry.entryDate,
      description: i18n_default.t("serviceErrors.reversalPrefix", { description: entry.description }).slice(0, 200),
      lines: listLinesForEntry(entryId).map((line) => ({
        accountId: line.accountId,
        debitAmount: line.creditAmount,
        creditAmount: line.debitAmount
      }))
    },
    null,
    entryId
  );
  if (!reversal.ok) throw new AppError(firstError(reversal.errors));
  return reversal.data;
}
function reverseSourceEntries(source) {
  for (const entryId of listActiveSourceEntryIds(source)) reverseJournalEntry(entryId);
}
function requireAccount(id2) {
  const account = findAccount(id2);
  if (!account) throw new AppError(i18n_default.t("errors.accountMissing"));
  return account;
}

// src/db/repositories/apartmentsRepo.ts
function mapApartment(row) {
  return {
    id: Number(row.id),
    apartmentNumber: String(row.apartment_number),
    ownerId: row.owner_id === null ? null : Number(row.owner_id),
    ownerName: row.owner_name === null || row.owner_name === void 0 ? null : String(row.owner_name),
    areaM2: Number(row.area_m2),
    residentsCount: Number(row.residents_count),
    shareRatio: Number(row.share_ratio),
    startingBalance: Number(row.starting_balance ?? 0),
    active: Number(row.active) === 1
  };
}
function findApartment(id2) {
  const row = queryRows(
    `SELECT a.*, o.full_name AS owner_name
       FROM apartments a
       LEFT JOIN owners o ON o.id = a.owner_id
      WHERE a.id = ?`,
    [id2]
  )[0];
  return row ? mapApartment(row) : null;
}

// src/db/repositories/paymentsRepo.ts
function insertPayment(input) {
  execute("INSERT INTO payments (apartment_id, payment_date, amount, description) VALUES (?, ?, ?, ?)", [
    input.apartmentId,
    input.paymentDate,
    input.amount,
    input.description
  ]);
  return lastInsertId();
}
function updatePayment(id2, input) {
  execute("UPDATE payments SET apartment_id = ?, payment_date = ?, amount = ?, description = ? WHERE id = ?", [
    input.apartmentId,
    input.paymentDate,
    input.amount,
    input.description,
    id2
  ]);
}
function deletePayment(id2) {
  execute("DELETE FROM payments WHERE id = ?", [id2]);
}

// src/services/accounting/paymentPosting.ts
var PAYMENT_SOURCE = "payment";
function postPaymentEntry(paymentId, input) {
  const apartment = findApartment(input.apartmentId);
  const bank = findAccountByCode(ACCOUNT_CODES.BANK);
  const fees = findAccountByCode(ACCOUNT_CODES.MONTHLY_FEES);
  if (!apartment || !bank || !fees) throw new AppError(i18n_default.t("serviceErrors.paymentNotPosted"));
  const result = postJournalEntry(
    {
      entryDate: input.paymentDate,
      description: input.description ?? i18n_default.t("serviceErrors.ownerPaymentDescription", { number: apartment.apartmentNumber }),
      lines: [
        { accountId: bank.id, debitAmount: input.amount, creditAmount: 0 },
        { accountId: fees.id, debitAmount: 0, creditAmount: input.amount }
      ]
    },
    { sourceType: PAYMENT_SOURCE, sourceId: paymentId }
  );
  if (!result.ok) throw new AppError(firstError(result.errors));
}
function savePayment(input, id2) {
  withTransaction(() => {
    if (id2 === null) {
      postPaymentEntry(insertPayment(input), input);
      return;
    }
    reverseSourceEntries({ sourceType: PAYMENT_SOURCE, sourceId: id2 });
    updatePayment(id2, input);
    postPaymentEntry(id2, input);
  });
}
function removePayment(id2) {
  withTransaction(() => {
    reverseSourceEntries({ sourceType: PAYMENT_SOURCE, sourceId: id2 });
    deletePayment(id2);
  });
}

// src/domain/accounting/balances.ts
var DEBIT_NORMAL_TYPES = ["ASSET", "EXPENSE"];
function isDebitNormal(type) {
  return DEBIT_NORMAL_TYPES.includes(type);
}
function balanceOf(type, debit, credit) {
  return roundMoney(isDebitNormal(type) ? debit - credit : credit - debit);
}

// src/services/accounting/balanceCalculationService.ts
var NO_TOTALS = { debit: 0, credit: 0 };
function indexTotals(range) {
  return new Map(
    sumTotalsInRange(range).map((row) => [row.accountId, { debit: roundMoney(row.debit), credit: roundMoney(row.credit) }])
  );
}
function calculateAccountSummaries(asOf, period) {
  const allTime = indexTotals({ from: DATE_RANGE_ALL.from, to: asOf });
  const inPeriod = indexTotals(period);
  return listAccounts().map((account) => {
    const total = allTime.get(account.id) ?? NO_TOTALS;
    const movement = inPeriod.get(account.id) ?? NO_TOTALS;
    return {
      account,
      totalDebits: total.debit,
      totalCredits: total.credit,
      balance: balanceOf(account.type, total.debit, total.credit),
      periodDebits: movement.debit,
      periodCredits: movement.credit,
      periodTurnover: balanceOf(account.type, movement.debit, movement.credit)
    };
  });
}
function calculateOpeningBalances(from) {
  const totals = indexTotals({ from: DATE_RANGE_ALL.from, to: addDays(from, -1) });
  return new Map(
    listAccounts().map((account) => {
      const total = totals.get(account.id) ?? NO_TOTALS;
      return [account.id, balanceOf(account.type, total.debit, total.credit)];
    })
  );
}
function calculateLedger(range, accountId) {
  const running = calculateOpeningBalances(range.from);
  return listLedgerLines(range, accountId).map((line) => {
    const next = roundMoney((running.get(line.accountId) ?? 0) + balanceOf(line.accountType, line.debitAmount, line.creditAmount));
    running.set(line.accountId, next);
    return { ...line, runningBalance: next };
  });
}
function calculateDashboardMetrics(period) {
  const range = periodDateRange(period);
  const summaries = calculateAccountSummaries(DATE_RANGE_ALL.to, range);
  const byCode = new Map(summaries.map((summary) => [summary.account.code, summary]));
  const balanceOfCode = (code) => byCode.get(code)?.balance ?? 0;
  const turnoverOfType = (type) => roundMoney(
    summaries.filter((summary) => summary.account.type === type).reduce((sum, summary) => sum + summary.periodTurnover, 0)
  );
  const monthlyExpenses = turnoverOfType("EXPENSE");
  const monthlyIncome = turnoverOfType("INCOME");
  return {
    bankBalance: balanceOfCode(ACCOUNT_CODES.BANK),
    cashBalance: balanceOfCode(ACCOUNT_CODES.CASH),
    receivables: balanceOfCode(ACCOUNT_CODES.RECEIVABLES),
    payables: balanceOfCode(ACCOUNT_CODES.SUPPLIER_PAYABLES),
    monthlyExpenses,
    monthlyIncome,
    netResult: roundMoney(monthlyIncome - monthlyExpenses)
  };
}

// src/lib/accountLabels.ts
function accountTypeLabel(type) {
  return i18n_default.t(`accountType.${type}`);
}
function accountDisplayName(account) {
  return i18n_default.t(`accountName.${account.code}`, { defaultValue: account.name });
}

// src/db/repositories/settingsRepo.ts
var DEFAULT_SETTINGS = {
  communityName: "Wsp\xF3lnota Mieszkaniowa",
  currency: "PLN"
};
function readSettings() {
  const stored = new Map(queryRows("SELECT key, value FROM app_settings").map((row) => [String(row.key), String(row.value)]));
  return {
    communityName: stored.get("communityName") ?? DEFAULT_SETTINGS.communityName,
    currency: stored.get("currency") ?? DEFAULT_SETTINGS.currency
  };
}

// src/services/reports/reportContext.ts
function createReportContext() {
  const settings = readSettings();
  return {
    currency: settings.currency,
    communityName: settings.communityName,
    generatedAt: (/* @__PURE__ */ new Date()).toLocaleString(currentLocale())
  };
}
function money(value, context) {
  return formatMoney(value, context.currency);
}

// src/services/accounting/reportingService.ts
function rangeLabel(range) {
  return i18n_default.t("reports.rangeLabel", { from: formatDate(range.from), to: formatDate(range.to) });
}
function fileSuffix(range) {
  return `${range.from}_${range.to}`;
}
function monthsBetween(range) {
  const months = [];
  let current = range.from.slice(0, 7);
  const last = range.to.slice(0, 7);
  while (current <= last && months.length < 240) {
    months.push(current);
    current = shiftPeriod(current, 1);
  }
  return months;
}
function document2(context, base) {
  return { ...base, subtitle: `${base.subtitle} - ${context.communityName}`, generatedAt: context.generatedAt };
}
function buildTrialBalance(asOf) {
  const context = createReportContext();
  const totals = new Map(sumTotalsInRange({ from: DATE_RANGE_ALL.from, to: asOf }).map((row) => [row.accountId, row]));
  const rows = [];
  let debitTotal = 0;
  let creditTotal = 0;
  for (const account of listAccounts()) {
    const total = totals.get(account.id);
    if (!total) continue;
    const debit = roundMoney(total.debit);
    const credit = roundMoney(total.credit);
    debitTotal += debit;
    creditTotal += credit;
    rows.push([
      account.code,
      accountNameFor(account.code, account.name),
      accountTypeLabel(account.type),
      debit,
      credit,
      balanceOf(account.type, debit, credit)
    ]);
  }
  debitTotal = roundMoney(debitTotal);
  creditTotal = roundMoney(creditTotal);
  return document2(context, {
    title: i18n_default.t("reports.titles.trialBalance"),
    subtitle: i18n_default.t("reports.asOf", { date: formatDate(asOf) }),
    fileName: `trial-balance-${asOf}`,
    summary: [
      { label: i18n_default.t("reports.labels.totalDebits"), value: money(debitTotal, context) },
      { label: i18n_default.t("reports.labels.totalCredits"), value: money(creditTotal, context) },
      {
        label: i18n_default.t("reports.labels.status"),
        value: debitTotal === creditTotal ? i18n_default.t("reports.labels.balanced") : i18n_default.t("reports.labels.outOfBalance")
      }
    ],
    tables: [
      {
        heading: i18n_default.t("reports.headings.accounts"),
        columns: [
          i18n_default.t("reports.columns.code"),
          i18n_default.t("reports.columns.account"),
          i18n_default.t("reports.columns.type"),
          i18n_default.t("reports.columns.debits"),
          i18n_default.t("reports.columns.credits"),
          i18n_default.t("reports.columns.balance")
        ],
        rows
      }
    ]
  });
}
function buildAccountStatement(accountId, range) {
  const context = createReportContext();
  const account = findAccount(accountId);
  if (!account) throw new AppError(i18n_default.t("errors.accountMissing"));
  const opening = calculateOpeningBalances(range.from).get(accountId) ?? 0;
  const lines = calculateLedger(range, accountId);
  const closing = lines.length > 0 ? lines[lines.length - 1].runningBalance : opening;
  return document2(context, {
    title: i18n_default.t("reports.titles.accountStatement"),
    subtitle: `${account.code} ${accountNameFor(account.code, account.name)}, ${rangeLabel(range)}`,
    fileName: `account-statement-${account.code}-${fileSuffix(range)}`,
    summary: [
      { label: i18n_default.t("reports.labels.accountType"), value: accountTypeLabel(account.type) },
      { label: i18n_default.t("reports.labels.openingBalance"), value: money(opening, context) },
      { label: i18n_default.t("reports.labels.closingBalance"), value: money(closing, context) }
    ],
    tables: [
      {
        heading: i18n_default.t("reports.headings.movements"),
        columns: [
          i18n_default.t("fields.date"),
          i18n_default.t("fields.description"),
          i18n_default.t("reports.columns.debit"),
          i18n_default.t("reports.columns.credit"),
          i18n_default.t("reports.columns.runningBalance")
        ],
        rows: lines.map((line) => [
          formatDate(line.entryDate),
          line.description,
          line.debitAmount,
          line.creditAmount,
          line.runningBalance
        ])
      }
    ]
  });
}
function accountTurnoverReport(range, type) {
  const context = createReportContext();
  const totals = new Map(sumTotalsInRange(range).map((row) => [row.accountId, row]));
  const accounts = listAccounts().filter((account) => account.type === type);
  const rows = [];
  let netTotal = 0;
  for (const account of accounts) {
    const total = totals.get(account.id);
    if (!total) continue;
    const debit = roundMoney(total.debit);
    const credit = roundMoney(total.credit);
    const net = balanceOf(type, debit, credit);
    netTotal += net;
    rows.push([account.code, accountNameFor(account.code, account.name), debit, credit, net]);
  }
  const isExpense = type === "EXPENSE";
  return document2(context, {
    title: isExpense ? i18n_default.t("reports.titles.expenseSummary") : i18n_default.t("reports.titles.incomeSummary"),
    subtitle: rangeLabel(range),
    fileName: `${isExpense ? "expense" : "income"}-summary-${fileSuffix(range)}`,
    summary: [
      {
        label: isExpense ? i18n_default.t("reports.labels.totalExpenses") : i18n_default.t("reports.labels.totalIncome"),
        value: money(roundMoney(netTotal), context)
      }
    ],
    tables: [
      {
        heading: isExpense ? i18n_default.t("reports.headings.expensesByAccount") : i18n_default.t("reports.headings.incomeByAccount"),
        columns: [
          i18n_default.t("reports.columns.code"),
          i18n_default.t("reports.columns.account"),
          i18n_default.t("reports.columns.debits"),
          i18n_default.t("reports.columns.credits"),
          i18n_default.t("reports.columns.net")
        ],
        rows
      }
    ]
  });
}
function buildExpenseSummary(range) {
  return accountTurnoverReport(range, "EXPENSE");
}
function buildMonthlyProfitAndLoss(range) {
  const context = createReportContext();
  const totals = sumTotalsByPeriodAndAccount(range);
  const rows = monthsBetween(range).map((period) => {
    const monthly = totals.filter((row) => row.period === period);
    const income = roundMoney(
      monthly.filter((row) => row.accountType === "INCOME").reduce((sum, row) => sum + balanceOf("INCOME", row.debit, row.credit), 0)
    );
    const expenses = roundMoney(
      monthly.filter((row) => row.accountType === "EXPENSE").reduce((sum, row) => sum + balanceOf("EXPENSE", row.debit, row.credit), 0)
    );
    return [formatPeriod(period), income, expenses, roundMoney(income - expenses)];
  });
  const netTotal = roundMoney(rows.reduce((sum, row) => sum + Number(row[3]), 0));
  return document2(context, {
    title: i18n_default.t("reports.titles.monthlyProfitLoss"),
    subtitle: rangeLabel(range),
    fileName: `profit-and-loss-${fileSuffix(range)}`,
    summary: [{ label: i18n_default.t("reports.labels.netResultForPeriod"), value: money(netTotal, context) }],
    tables: [
      {
        heading: i18n_default.t("reports.headings.months"),
        columns: [
          i18n_default.t("reports.columns.month"),
          i18n_default.t("reports.columns.income"),
          i18n_default.t("reports.columns.expenses"),
          i18n_default.t("reports.columns.netResult")
        ],
        rows
      }
    ]
  });
}
function buildCashMovement(range) {
  const context = createReportContext();
  const cashCodes = [ACCOUNT_CODES.BANK, ACCOUNT_CODES.CASH];
  const totals = sumTotalsByPeriodAndAccount(range).filter((row) => cashCodes.includes(row.accountCode));
  const rows = totals.map((row) => {
    const inflow = roundMoney(row.debit);
    const outflow = roundMoney(row.credit);
    return [formatPeriod(row.period), accountNameFor(row.accountCode, row.accountName), inflow, outflow, roundMoney(inflow - outflow)];
  });
  const table = {
    heading: i18n_default.t("reports.headings.cashMovements"),
    columns: [
      i18n_default.t("reports.columns.month"),
      i18n_default.t("reports.columns.account"),
      i18n_default.t("reports.columns.inflows"),
      i18n_default.t("reports.columns.outflows"),
      i18n_default.t("reports.columns.netMovement")
    ],
    rows
  };
  const netTotal = roundMoney(totals.reduce((sum, row) => sum + row.debit - row.credit, 0));
  return document2(context, {
    title: i18n_default.t("reports.titles.cashMovement"),
    subtitle: rangeLabel(range),
    fileName: `cash-movement-${fileSuffix(range)}`,
    summary: [{ label: i18n_default.t("reports.labels.netCashMovement"), value: money(netTotal, context) }],
    tables: [table]
  });
}
function accountNameFor(code, name) {
  return accountDisplayName({ code, name });
}

// .harness/entry.ts
var failures = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name} ${detail}`);
  if (!condition) failures += 1;
}
var id = (code) => findAccountByCode(code).id;
var today = todayIso();
async function main() {
  await openDatabase();
  check("16 default accounts seeded", listAccounts().length === 16, `(${listAccounts().length})`);
  check("all defaults are system accounts", listAccounts().every((a) => a.systemAccount));
  check("user_version is 2", Number(queryRows("PRAGMA user_version")[0].user_version) === 2);
  check("duplicate code rejected", !saveAccount({ code: "4010", name: "X", type: "EXPENSE" }, null).ok);
  const created = saveAccount({ code: "U-100", name: "Roof Works", type: "EXPENSE" }, null);
  check("user account created", created.ok);
  const roofId = created.ok ? created.data : -1;
  check("user account without transactions can be deleted", (() => {
    removeAccount(roofId);
    return findAccountByCode("U-100") === null;
  })());
  check("system account cannot be deleted", (() => {
    try {
      removeAccount(id("4010"));
      return false;
    } catch {
      return true;
    }
  })());
  check("system account cannot be archived", (() => {
    try {
      setAccountArchived(id("1010"), true);
      return false;
    } catch {
      return true;
    }
  })());
  const unbalanced = postJournalEntry({ entryDate: today, description: "bad", lines: [
    { accountId: id("4010"), debitAmount: 500, creditAmount: 0 },
    { accountId: id("2020"), debitAmount: 0, creditAmount: 400 }
  ] });
  check("unbalanced entry rejected", !unbalanced.ok);
  const oneSided = postJournalEntry({ entryDate: today, description: "bad2", lines: [
    { accountId: id("4010"), debitAmount: 500, creditAmount: 500 },
    { accountId: id("2020"), debitAmount: 0, creditAmount: 0 }
  ] });
  check("line with both sides rejected", !oneSided.ok);
  const invoice = postJournalEntry({ entryDate: today, description: "Cleaning invoice", lines: [
    { accountId: id("4010"), debitAmount: 500, creditAmount: 0 },
    { accountId: id("2020"), debitAmount: 0, creditAmount: 500 }
  ] });
  check("supplier invoice posted", invoice.ok);
  const invoiceId = invoice.ok ? invoice.data : -1;
  const supplierPay = postJournalEntry({ entryDate: today, description: "Pay cleaning", lines: [
    { accountId: id("2020"), debitAmount: 500, creditAmount: 0 },
    { accountId: id("1010"), debitAmount: 0, creditAmount: 500 }
  ] });
  check("supplier payment posted", supplierPay.ok);
  const cashOut = postJournalEntry({ entryDate: today, description: "Cash withdrawal", lines: [
    { accountId: id("1020"), debitAmount: 200, creditAmount: 0 },
    { accountId: id("1010"), debitAmount: 0, creditAmount: 200 }
  ] });
  check("cash withdrawal posted", cashOut.ok);
  if (queryRows("SELECT id FROM apartments LIMIT 1").length === 0) {
    execute("INSERT INTO owners (full_name) VALUES ('Test Owner')");
    execute("INSERT INTO apartments (apartment_number, owner_id, area_m2, residents_count, share_ratio) VALUES ('1A', 1, 50, 2, 0.1)");
  }
  const apartmentId = Number(queryRows("SELECT id FROM apartments LIMIT 1")[0].id);
  savePayment({ apartmentId, paymentDate: today, amount: 700, description: null }, null);
  const paymentId = Number(queryRows("SELECT MAX(id) AS id FROM payments")[0].id);
  let metrics = calculateDashboardMetrics(currentPeriod());
  check("bank after owner payment 700", metrics.bankBalance === 700 - 500 - 200, `(${metrics.bankBalance})`);
  savePayment({ apartmentId, paymentDate: today, amount: 800, description: "Corrected" }, paymentId);
  metrics = calculateDashboardMetrics(currentPeriod());
  check("editing payment replaces entry (bank 100)", metrics.bankBalance === 100, `(${metrics.bankBalance})`);
  check("cash balance 200", metrics.cashBalance === 200, `(${metrics.cashBalance})`);
  check("payables settled to 0", metrics.payables === 0, `(${metrics.payables})`);
  check("monthly income 800 from edited payment", metrics.monthlyIncome === 800, `(${metrics.monthlyIncome})`);
  check("monthly expenses 500", metrics.monthlyExpenses === 500, `(${metrics.monthlyExpenses})`);
  check("net result 300", metrics.netResult === 300, `(${metrics.netResult})`);
  removePayment(paymentId);
  metrics = calculateDashboardMetrics(currentPeriod());
  check("deleting payment reverses it (bank -700)", metrics.bankBalance === -700, `(${metrics.bankBalance})`);
  check("invoice cannot be reversed twice", (() => {
    reverseJournalEntry(invoiceId);
    try {
      reverseJournalEntry(invoiceId);
      return false;
    } catch {
      return true;
    }
  })());
  const tb = buildTrialBalance(today);
  check("trial balance balanced", tb.summary.some((item) => item.value === "Balanced"));
  const range = { from: `${today.slice(0, 8)}01`, to: today };
  const ledger = calculateLedger(range, id("1010"));
  check("ledger running balance ends at bank balance", ledger.length > 0 && ledger[ledger.length - 1].runningBalance === -700, `(${ledger[ledger.length - 1]?.runningBalance})`);
  check("account statement builds", buildAccountStatement(id("1010"), range).tables[0].rows.length === ledger.length);
  check("monthly P&L builds", buildMonthlyProfitAndLoss(range).tables[0].rows.length >= 1);
  check("cash movement builds", buildCashMovement(periodDateRange(currentPeriod())).tables[0].rows.length >= 1);
  check("expense summary builds", buildExpenseSummary(range).tables[0].rows.length >= 1);
  check("nested transaction rolls back inner work", (() => {
    const before = listJournalEntries(range).length;
    try {
      withTransaction(() => {
        postJournalEntry({ entryDate: today, description: "outer", lines: [
          { accountId: id("4010"), debitAmount: 10, creditAmount: 0 },
          { accountId: id("2020"), debitAmount: 0, creditAmount: 10 }
        ] });
        throw new Error("force rollback");
      });
    } catch {
    }
    return listJournalEntries(range).length === before;
  })());
  console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((error) => {
  console.error("HARNESS ERROR", error);
  process.exit(1);
});
