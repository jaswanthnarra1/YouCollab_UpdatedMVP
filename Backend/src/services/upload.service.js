const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Upload Service (local storage implementation, easy to swap with AWS S3 / Google Cloud Storage)
 */

/**
 * Process uploaded file meta.
 * @param {object} file - Express Multer file object
 * @returns {Promise<object>} { url: string }
 */
const uploadFile = async (file) => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Local URL path accessible via Express static serving
  const url = `/uploads/${file.filename}`;
  
  return { url };
};

/**
 * Remove an uploaded file.
 * @param {string} fileUrl - Static URL to delete
 */
const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    // Extract filename from URL (e.g. /uploads/filename.jpg -> filename.jpg)
    const filename = path.basename(fileUrl);
    const filepath = path.join(config.UPLOAD.DIR, filename);

    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
      logger.info(`Successfully deleted file at ${filepath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete file ${fileUrl}:`, error);
  }
};

module.exports = {
  uploadFile,
  deleteFile,
};
