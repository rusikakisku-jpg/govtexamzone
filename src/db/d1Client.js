const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const config = require('../config/env');

const DB_FILE_PATH = path.resolve('data/sarkariresult.db');
const SCHEMA_FILE_PATH = path.resolve('schema.sql');

class D1Client {
  constructor() {
    this.isCloudflareD1 = config.cloudflare.d1.isConfigured;
    this.localDb = null;
    this.SQL = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // 1. Native Cloudflare D1 Binding check (when running on Cloudflare Workers)
    const nativeD1 = globalThis.DB || (globalThis.__CF_ENV__ && globalThis.__CF_ENV__.DB);
    if (nativeD1 && typeof nativeD1.prepare === 'function') {
      console.log('⚡ Connected to Native Cloudflare D1 Database Binding');
      this.nativeD1 = nativeD1;
      this.isNativeD1 = true;
      this.initialized = true;
      await this.runNativeSchema();
      return;
    }

    if (this.isCloudflareD1) {
      console.log('⚡ Connected to remote Cloudflare D1 Database:', config.cloudflare.d1.databaseId);
      // Run schema on Cloudflare D1
      await this.runRemoteSchema();
      this.initialized = true;
      return;
    }

    console.log('📂 Initializing Local SQLite Engine (Cloudflare D1 compatible emulation)...');
    this.SQL = await initSqlJs();

    const dbDir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE_PATH)) {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      this.localDb = new this.SQL.Database(fileBuffer);
      console.log('✅ Loaded existing SQLite database from:', DB_FILE_PATH);

      // Auto-migrate missing columns on existing tables
      try {
        const resPosts = this.localDb.exec('PRAGMA table_info(posts)');
        if (resPosts && resPosts[0] && resPosts[0].values) {
          const colNames = resPosts[0].values.map(v => v[1]);
          if (!colNames.includes('author_id')) {
            this.localDb.run('ALTER TABLE posts ADD COLUMN author_id INTEGER DEFAULT 1');
            console.log('✅ Migrated: added author_id column to posts table.');
          }
        }

        const resAuthors = this.localDb.exec('PRAGMA table_info(authors)');
        if (resAuthors && resAuthors[0] && resAuthors[0].values) {
          const authorCols = resAuthors[0].values.map(v => v[1]);
          if (!authorCols.includes('password_hash')) {
            this.localDb.run('ALTER TABLE authors ADD COLUMN password_hash TEXT');
            console.log('✅ Migrated: added password_hash column to authors table.');
          }
          if (!authorCols.includes('last_login')) {
            this.localDb.run('ALTER TABLE authors ADD COLUMN last_login DATETIME');
            console.log('✅ Migrated: added last_login column to authors table.');
          }
        }
      } catch (migErr) {
        console.warn('Migration note:', migErr.message);
      }
    } else {
      this.localDb = new this.SQL.Database();
      console.log('🆕 Created new SQLite database in memory, initializing schema...');
    }

    // Apply schema
    const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
    this.localDb.run(schemaSql);
    this.saveLocal();
    this.initialized = true;
    console.log('✅ Database schema verified and active.');
  }

  saveLocal() {
    if (this.localDb && !this.isCloudflareD1) {
      const data = this.localDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_FILE_PATH, buffer);
    }
  }

  // Cloudflare D1 REST API query
  async queryRemote(sql, params = []) {
    const { accountId, databaseId, apiToken } = config.cloudflare.d1;
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    });

    const json = await response.json();
    if (!json.success) {
      const err = json.errors?.[0]?.message || 'Cloudflare D1 Query Failed';
      throw new Error(`D1 API Error: ${err}`);
    }

    return json.result?.[0]?.results || [];
  }

  async runRemoteSchema() {
    try {
      const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await this.queryRemote(statement);
      }
      console.log('✅ Cloudflare D1 remote schema verified.');
    } catch (err) {
      console.warn('⚠️ Warning during remote D1 schema initialization:', err.message);
    }
  }

  async runNativeSchema() {
    try {
      if (!this.nativeD1) return;
      const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        try {
          await this.nativeD1.prepare(statement).run();
        } catch (e) {
          // Ignore if table/index already exists
        }
      }
      console.log('✅ Native Cloudflare D1 schema verified.');
    } catch (err) {
      console.warn('⚠️ Warning during native D1 schema check:', err.message);
    }
  }

  prepare(sql) {
    const self = this;
    return {
      bind(...params) {
        const rawParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const boundParams = rawParams.map(p => (p === undefined ? null : p));

        return {
          async all() {
            if (self.isNativeD1) {
              const res = await self.nativeD1.prepare(sql).bind(...boundParams).all();
              return (res && res.results) ? res.results : [];
            }

            if (self.isCloudflareD1) {
              return await self.queryRemote(sql, boundParams);
            }

            // Local SQL.js implementation
            try {
              const stmt = self.localDb.prepare(sql);
              stmt.bind(boundParams);
              const rows = [];
              while (stmt.step()) {
                rows.push(stmt.getAsObject());
              }
              stmt.free();
              return rows;
            } catch (err) {
              console.error('Error executing query:', sql, err);
              throw err;
            }
          },

          async first() {
            if (self.isNativeD1) {
              return await self.nativeD1.prepare(sql).bind(...boundParams).first();
            }
            const rows = await this.all();
            return rows.length > 0 ? rows[0] : null;
          },

          async run() {
            if (self.isNativeD1) {
              const res = await self.nativeD1.prepare(sql).bind(...boundParams).run();
              return { success: true, changes: res?.meta?.changes || 0, lastInsertRowid: res?.meta?.last_row_id || null };
            }

            if (self.isCloudflareD1) {
              const res = await self.queryRemote(sql, boundParams);
              return { success: true, result: res };
            }

            try {
              self.localDb.run(sql, boundParams);
              self.saveLocal();

              // Get last insert rowid and changes
              const lastIdRow = self.localDb.exec("SELECT last_insert_rowid() AS id;");
              const lastInsertRowid = lastIdRow[0]?.values[0]?.[0] || null;
              const changesRow = self.localDb.exec("SELECT changes() AS ch;");
              const changes = changesRow[0]?.values[0]?.[0] || 0;

              return { success: true, changes, lastInsertRowid };
            } catch (err) {
              console.error('Error in run():', sql, err);
              throw err;
            }
          }
        };
      },

      async all() {
        return this.bind().all();
      },

      async first() {
        return this.bind().first();
      },

      async run() {
        return this.bind().run();
      }
    };
  }

  async exec(sql) {
    if (this.isNativeD1) {
      return await this.nativeD1.exec(sql);
    }
    if (this.isCloudflareD1) {
      return await this.queryRemote(sql);
    }
    const res = this.localDb.exec(sql);
    this.saveLocal();
    return res;
  }
}

const d1 = new D1Client();
module.exports = d1;
