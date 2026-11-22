const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const config = require('../config/env');

const LOCAL_UPLOADS_DIR = path.join(__dirname, '../../uploads');

class R2Client {
  constructor() {
    this.isR2Configured = config.cloudflare.r2.isConfigured;
    this.s3Client = null;

    if (this.isR2Configured) {
      const { accountId, accessKeyId, secretAccessKey } = config.cloudflare.r2;
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });
      console.log('☁️ Cloudflare R2 Object Storage client initialized for bucket:', config.cloudflare.r2.bucketName);
    } else {
      console.log('📁 Local Storage active (Fallback mode). Uploads stored at:', LOCAL_UPLOADS_DIR);
      if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
        fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
      }
    }
  }

  // Generate safe unique key
  generateFileKey(originalName) {
    const timestamp = Date.now();
    const cleanName = originalName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-');
    return `${timestamp}-${cleanName}`;
  }

  // Upload file buffer
  async uploadFile(buffer, originalName, mimeType) {
    const fileKey = this.generateFileKey(originalName);

    if (this.isR2Configured) {
      try {
        const command = new PutObjectCommand({
          Bucket: config.cloudflare.r2.bucketName,
          Key: fileKey,
          Body: buffer,
          ContentType: mimeType
        });

        await this.s3Client.send(command);

        const publicBase = config.cloudflare.r2.publicUrl || 
          `https://${config.cloudflare.r2.bucketName}.${config.cloudflare.r2.accountId}.r2.cloudflarestorage.com`;
        const fileUrl = `${publicBase}/${fileKey}`;

        return {
          fileKey,
          fileUrl,
          originalName,
          mimeType,
          size: buffer.length,
          storageType: 'r2'
        };
      } catch (err) {
        console.error('Cloudflare R2 Upload failed:', err);
        throw err;
      }
    }

    // Local storage fallback
    const targetPath = path.join(LOCAL_UPLOADS_DIR, fileKey);
    fs.writeFileSync(targetPath, buffer);
    const fileUrl = `/uploads/${fileKey}`;

    return {
      fileKey,
      fileUrl,
      originalName,
      mimeType,
      size: buffer.length,
      storageType: 'local'
    };
  }

  // Delete file
  async deleteFile(fileKey) {
    if (this.isR2Configured) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: config.cloudflare.r2.bucketName,
          Key: fileKey
        });
        await this.s3Client.send(command);
        return true;
      } catch (err) {
        console.error('Cloudflare R2 Delete failed:', err);
        return false;
      }
    }

    // Local deletion
    const targetPath = path.join(LOCAL_UPLOADS_DIR, fileKey);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return true;
    }
    return false;
  }

  // List recent uploaded files
  async listFiles() {
    if (this.isR2Configured) {
      try {
        const command = new ListObjectsV2Command({
          Bucket: config.cloudflare.r2.bucketName,
          MaxKeys: 100
        });
        const response = await this.s3Client.send(command);
        return (response.Contents || []).map(item => {
          const publicBase = config.cloudflare.r2.publicUrl || 
            `https://${config.cloudflare.r2.bucketName}.${config.cloudflare.r2.accountId}.r2.cloudflarestorage.com`;
          return {
            fileKey: item.Key,
            fileUrl: `${publicBase}/${item.Key}`,
            size: item.Size,
            lastModified: item.LastModified,
            storageType: 'r2'
          };
        });
      } catch (err) {
        console.error('Cloudflare R2 list files error:', err);
        return [];
      }
    }

    // Local listing
    if (!fs.existsSync(LOCAL_UPLOADS_DIR)) return [];
    const files = fs.readdirSync(LOCAL_UPLOADS_DIR);
    return files.map(file => {
      const stats = fs.statSync(path.join(LOCAL_UPLOADS_DIR, file));
      return {
        fileKey: file,
        fileUrl: `/uploads/${file}`,
        size: stats.size,
        lastModified: stats.mtime,
        storageType: 'local'
      };
    });
  }
}

const r2 = new R2Client();
module.exports = r2;
