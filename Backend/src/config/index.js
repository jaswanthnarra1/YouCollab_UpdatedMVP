require('dotenv').config();
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  SUPABASE: {
    URL: process.env.SUPABASE_URL,
    KEY: process.env.SUPABASE_KEY,
    ANON_KEY: process.env.SUPABASE_KEY, // Alias for clarity
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  DATABASE_URL: process.env.DATABASE_URL,

  JWT: {
    SECRET: process.env.JWT_SECRET || 'youcollab-default-local-secret-310239019',
    ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    REFRESH_COOKIE_NAME: 'refreshToken',
  },

  UPLOAD: {
    DIR: path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
    MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },

  EMAIL: {
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'noreply@youcollab.in',
  }
};
