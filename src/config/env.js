const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'govtexamzone_secret_key_cloudflare_d1_r2'
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'govtexamzone@2026'
  },
  cloudflare: {
    d1: {
      accountId: process.env.CF_ACCOUNT_ID || '',
      databaseId: process.env.CF_D1_DATABASE_ID || '',
      apiToken: process.env.CF_API_TOKEN || '',
      get isConfigured() {
        return Boolean(this.accountId && this.databaseId && this.apiToken);
      }
    },
    r2: {
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: process.env.R2_BUCKET_NAME || 'govtexamzone-files',
      publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, ''),
      get isConfigured() {
        return Boolean(this.accountId && this.accessKeyId && this.secretAccessKey && this.bucketName);
      }
    }
  }
};

module.exports = config;
