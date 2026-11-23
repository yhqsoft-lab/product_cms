// backend/models/mockDb.js
// In-memory mock implementation of Sequelize models for environments without a MySQL server
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const now = () => new Date();

// Seed users (default admin: admin / Admin123!)
const defaultPasswordHash = bcrypt.hashSync('Admin123!', 10);

const usersData = [
  {
    id: 1,
    username: 'admin',
    password: defaultPasswordHash,
    email: 'admin@example.com',
    role: 'admin',
    isActive: true,
    refreshToken: null,
    lastActivity: now(),
    createdAt: now(),
    updatedAt: now()
  }
];
let nextUserId = 2;

// Seed products referencing existing uploaded assets in backend/public/uploads
const productsData = [
  {
    id: 1,
    sku: 'CB-RF-001',
    model: 'CB-301R',
    brand: 'CoreBay',
    productType: 'Remote',
    description: 'Universal 3-speed ceiling fan remote control with light dimmer and reverse function.',
    httpLink: 'https://example.com/products/cb-301r',
    status: 'active',
    manual: null,
    image: '/uploads/image-1778489364816-537.jpg',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 2,
    sku: 'CB-RCV-002',
    model: 'CB-301RX',
    brand: 'CoreBay',
    productType: 'Receiver',
    description: 'AC 3-speed ceiling fan wireless receiver module compatible with CB-301R transmitter.',
    httpLink: 'https://example.com/products/cb-301rx',
    status: 'active',
    manual: null,
    image: '/uploads/image-1778489369414-562.jpg',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 3,
    sku: 'HT-KIT-003',
    model: 'HT-99123',
    brand: 'Hunter',
    productType: 'Control Kit',
    description: 'Complete ceiling fan remote and receiver control kit with wall cradle for Hunter AC fans.',
    httpLink: 'https://example.com/products/ht-99123',
    status: 'active',
    manual: null,
    image: '/uploads/image-1778500157679-243.png',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 4,
    sku: 'HB-DC-004',
    model: 'HB-DC600',
    brand: 'Harbor Breeze',
    productType: 'Remote',
    description: 'DC 6-speed ceiling fan remote with reversible airflow and comfort breeze timer.',
    httpLink: 'https://example.com/products/hb-dc600',
    status: 'active',
    manual: null,
    image: '/uploads/image-1778501632977-943.jpg',
    createdAt: now(),
    updatedAt: now()
  }
];
let nextProductId = 5;

// Seed FCC records
const fccsData = [
  {
    id: 1,
    name: 'FCC-KUJCE10311',
    brand: 'CoreBay',
    productType: 'Control Kit',
    speed: 'AC 3-speeds with Reverse',
    description: '303.9MHz RF ceiling fan transmitter and receiver kit.',
    image: '/uploads/image-1778501660311-69.jpg',
    replacement: 'CB-301R',
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 2,
    name: 'FCC-CHQ7083T',
    brand: 'Hampton Bay',
    productType: 'Remote',
    speed: 'AC 3-speeds',
    description: 'Standard 4-DIP switch ceiling fan remote control.',
    image: '/uploads/image-1778508100240-32.jpg',
    replacement: 'HT-99123',
    createdAt: now(),
    updatedAt: now()
  }
];
let nextFccId = 3;

// Join tables
const fccProductsLinks = [
  { fccId: 1, productId: 1 },
  { fccId: 1, productId: 2 },
  { fccId: 2, productId: 3 }
];

const productRelations = [
  { source_product_id: 1, target_product_id: 2, relation_type: 'compatible' },
  { source_product_id: 1, target_product_id: 4, relation_type: 'upgrade' },
  { source_product_id: 1, target_product_id: 3, relation_type: 'replacement' },
  { source_product_id: 2, target_product_id: 1, relation_type: 'compatible' }
];

function matchesCondition(recordValue, cond) {
  if (cond === null || cond === undefined) return recordValue === cond;
  if (typeof cond === 'object' && !(cond instanceof Date)) {
    const syms = Object.getOwnPropertySymbols(cond);
    for (const sym of syms) {
      if (sym === Op.like || sym === Op.iLike) {
        const pattern = String(cond[sym]).replace(/^%|%$/g, '').toLowerCase();
        if (!String(recordValue || '').toLowerCase().includes(pattern)) return false;
      } else if (sym === Op.ne) {
        if (String(recordValue) === String(cond[sym])) return false;
      } else if (sym === Op.in) {
        if (!Array.isArray(cond[sym]) || !cond[sym].includes(recordValue)) return false;
      }
    }
    return true;
  }
  return String(recordValue) === String(cond);
}

function matchesWhere(record, where) {
  if (!where) return true;
  const syms = Object.getOwnPropertySymbols(where);
  for (const sym of syms) {
    if (sym === Op.or) {
      const clauses = where[sym];
      if (!clauses.some((clause) => matchesWhere(record, clause))) return false;
    } else if (sym === Op.and) {
      const clauses = where[sym];
      if (!clauses.every((clause) => matchesWhere(record, clause))) return false;
    }
  }
  for (const [key, val] of Object.entries(where)) {
    if (!matchesCondition(record[key], val)) return false;
  }
  return true;
}

function pickAttributes(record, attributes) {
  if (!attributes) return { ...record };
  if (Array.isArray(attributes)) {
    const res = {};
    for (const k of attributes) res[k] = record[k];
    return res;
  }
  if (attributes.exclude) {
    const res = { ...record };
    for (const k of attributes.exclude) delete res[k];
    return res;
  }
  return { ...record };
}

function wrapUser(raw) {
  if (!raw) return null;
  return Object.assign(Object.create({
    async save() {
      raw.updatedAt = now();
      Object.assign(raw, this);
      return this;
    },
    async update(vals) {
      Object.assign(raw, vals, { updatedAt: now() });
      Object.assign(this, raw);
      return this;
    },
    toJSON() {
      return { ...raw };
    },
    get() {
      return { ...raw };
    }
  }), raw);
}

function wrapProduct(raw, extras = {}) {
  if (!raw) return null;
  const instance = Object.assign(Object.create({
    get() {
      return { ...raw, ...extras };
    },
    toJSON() {
      return { ...raw, ...extras };
    },
    async update(vals) {
      Object.assign(raw, vals, { updatedAt: now() });
      Object.assign(this, raw);
      return this;
    },
    async destroy() {
      const idx = productsData.findIndex((p) => p.id === raw.id);
      if (idx !== -1) productsData.splice(idx, 1);
      for (let i = fccProductsLinks.length - 1; i >= 0; i--) {
        if (fccProductsLinks[i].productId === raw.id) fccProductsLinks.splice(i, 1);
      }
      for (let i = productRelations.length - 1; i >= 0; i--) {
        if (productRelations[i].source_product_id === raw.id || productRelations[i].target_product_id === raw.id) {
          productRelations.splice(i, 1);
        }
      }
    },
    async getCompatibleProducts() {
      return getRelated(raw.id, 'compatible').map((p) => wrapProduct(p));
    },
    async getUpgradeProducts() {
      return getRelated(raw.id, 'upgrade').map((p) => wrapProduct(p));
    },
    async getReplacementProducts() {
      return getRelated(raw.id, 'replacement').map((p) => wrapProduct(p));
    }
  }), raw, extras);
  return instance;
}

function getRelated(sourceId, relationType) {
  const targetIds = productRelations
    .filter((r) => Number(r.source_product_id) === Number(sourceId) && r.relation_type === relationType)
    .map((r) => Number(r.target_product_id));
  return productsData.filter((p) => targetIds.includes(p.id));
}

function wrapFcc(raw, extras = {}) {
  if (!raw) return null;
  return Object.assign(Object.create({
    get() {
      return { ...raw, ...extras };
    },
    toJSON() {
      return { ...raw, ...extras };
    },
    async update(vals) {
      Object.assign(raw, vals, { updatedAt: now() });
      Object.assign(this, raw);
      return this;
    },
    async destroy() {
      const idx = fccsData.findIndex((f) => f.id === raw.id);
      if (idx !== -1) fccsData.splice(idx, 1);
      for (let i = fccProductsLinks.length - 1; i >= 0; i--) {
        if (fccProductsLinks[i].fccId === raw.id) fccProductsLinks.splice(i, 1);
      }
    },
    async hasProduct(product) {
      const pid = typeof product === 'object' ? product.id : Number(product);
      return fccProductsLinks.some((l) => l.fccId === raw.id && l.productId === pid);
    },
    async addProduct(product) {
      const pid = typeof product === 'object' ? product.id : Number(product);
      if (!fccProductsLinks.some((l) => l.fccId === raw.id && l.productId === pid)) {
        fccProductsLinks.push({ fccId: raw.id, productId: pid });
      }
    },
    async removeProduct(product) {
      const pid = typeof product === 'object' ? product.id : Number(product);
      const idx = fccProductsLinks.findIndex((l) => l.fccId === raw.id && l.productId === pid);
      if (idx !== -1) fccProductsLinks.splice(idx, 1);
    }
  }), raw, extras);
}

const User = {
  name: 'User',
  async findOne({ where, attributes } = {}) {
    const found = usersData.find((u) => matchesWhere(u, where));
    return found ? wrapUser(pickAttributes(found, attributes)) : null;
  },
  async findByPk(id, { attributes } = {}) {
    const found = usersData.find((u) => String(u.id) === String(id));
    if (!found) return null;
    if (attributes) return wrapUser(pickAttributes(found, attributes));
    return wrapUser(found);
  },
  async create(data) {
    let password = data.password;
    if (password && !password.startsWith('$2')) {
      password = await bcrypt.hash(password, 10);
    }
    const record = {
      id: nextUserId++,
      username: data.username,
      password,
      email: data.email || null,
      role: data.role || 'user',
      isActive: data.isActive !== undefined ? data.isActive : true,
      refreshToken: data.refreshToken || null,
      lastActivity: data.lastActivity || now(),
      createdAt: now(),
      updatedAt: now()
    };
    usersData.push(record);
    return wrapUser(record);
  },
  async update(values, { where } = {}) {
    let count = 0;
    for (const u of usersData) {
      if (matchesWhere(u, where)) {
        Object.assign(u, values, { updatedAt: now() });
        count++;
      }
    }
    return [count];
  }
};

const Product = {
  name: 'Product',
  async findAll({ where, limit, include, order } = {}) {
    let list = productsData.filter((p) => matchesWhere(p, where));
    if (order && order[0]) {
      const [col, dir] = order[0];
      list = [...list].sort((a, b) => (dir === 'DESC' ? (b[col] > a[col] ? 1 : -1) : (a[col] > b[col] ? 1 : -1)));
    }
    if (limit) list = list.slice(0, limit);
    return list.map((p) => {
      const extras = {};
      if (Array.isArray(include)) {
        for (const inc of include) {
          if (inc.as === 'compatibleProducts') {
            extras.compatibleProducts = getRelated(p.id, 'compatible').map((r) => ({ id: r.id }));
          } else if (inc.as === 'upgradeProducts') {
            extras.upgradeProducts = getRelated(p.id, 'upgrade').map((r) => ({ id: r.id }));
          } else if (inc.as === 'replacementProducts') {
            extras.replacementProducts = getRelated(p.id, 'replacement').map((r) => ({ id: r.id }));
          }
        }
      }
      return wrapProduct(p, extras);
    });
  },
  async findOne({ where } = {}) {
    const found = productsData.find((p) => matchesWhere(p, where));
    return found ? wrapProduct(found) : null;
  },
  async findByPk(id) {
    const found = productsData.find((p) => String(p.id) === String(id));
    return found ? wrapProduct(found) : null;
  },
  async create(data) {
    const record = {
      id: nextProductId++,
      sku: data.sku,
      model: data.model,
      description: data.description || '',
      brand: data.brand || '',
      productType: data.productType || '',
      httpLink: data.httpLink || '',
      status: data.status || 'active',
      manual: data.manual || null,
      image: data.image || null,
      createdAt: now(),
      updatedAt: now()
    };
    productsData.push(record);
    return wrapProduct(record);
  }
};

const Fcc = {
  name: 'Fcc',
  async findAll({ where, order } = {}) {
    let list = fccsData.filter((f) => matchesWhere(f, where));
    if (order && order[0]) {
      const [col, dir] = order[0];
      list = [...list].sort((a, b) => (dir === 'DESC' ? (b[col] > a[col] ? 1 : -1) : (a[col] > b[col] ? 1 : -1)));
    }
    return list.map((f) => wrapFcc(f));
  },
  async findByPk(id, { include } = {}) {
    const found = fccsData.find((f) => String(f.id) === String(id));
    if (!found) return null;
    const extras = {};
    if (Array.isArray(include)) {
      const hasProducts = include.some((inc) => inc.as === 'Products' || inc.model === Product);
      if (hasProducts) {
        const pids = fccProductsLinks.filter((l) => l.fccId === found.id).map((l) => l.productId);
        extras.Products = productsData.filter((p) => pids.includes(p.id)).map((p) => ({ ...p }));
      }
    }
    return wrapFcc(found, extras);
  },
  async create(data) {
    const record = {
      id: nextFccId++,
      name: data.name,
      description: data.description || null,
      brand: data.brand || null,
      productType: data.productType || null,
      speed: data.speed || null,
      image: data.image || null,
      replacement: data.replacement || null,
      createdAt: now(),
      updatedAt: now()
    };
    fccsData.push(record);
    return wrapFcc(record);
  }
};

const ProductWorkWith = {
  name: 'ProductWorkWith',
  async findAll() {
    return [];
  }
};

const sequelize = {
  async authenticate() {
    return true;
  },
  async sync() {
    return true;
  },
  async close() {
    return true;
  },
  async transaction(fn) {
    return fn({});
  },
  async query(sql, options = {}) {
    const normalized = String(sql).trim().toUpperCase();
    if (normalized.startsWith('SHOW TABLES')) {
      return [[
        { Tables_in_mock: 'users' },
        { Tables_in_mock: 'products' },
        { Tables_in_mock: 'fccs' },
        { Tables_in_mock: 'fcc_products' },
        { Tables_in_mock: 'product_relations' }
      ]];
    }
    if (normalized.startsWith('DELETE FROM PRODUCT_RELATIONS')) {
      const sourceId = Number(options.replacements?.[0]);
      for (let i = productRelations.length - 1; i >= 0; i--) {
        if (Number(productRelations[i].source_product_id) === sourceId) {
          productRelations.splice(i, 1);
        }
      }
      return [{ affectedRows: 1 }];
    }
    if (normalized.startsWith('INSERT INTO PRODUCT_RELATIONS')) {
      const vals = options.replacements || [];
      for (let i = 0; i < vals.length; i += 3) {
        productRelations.push({
          source_product_id: Number(vals[i]),
          target_product_id: Number(vals[i + 1]),
          relation_type: vals[i + 2]
        });
      }
      return [{ affectedRows: vals.length / 3 }];
    }
    return [[]];
  }
};

module.exports = {
  User,
  Product,
  Fcc,
  ProductWorkWith,
  sequelize
};
