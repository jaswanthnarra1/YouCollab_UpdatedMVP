const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { clerkMiddleware } = require('@clerk/express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./api');
const errorHandler = require('./middleware/errorHandler');
const scheduler = require('./jobs/scheduler');
const { generalLimiter } = require('./middleware/rateLimiter');
const AppError = require('./utils/AppError');

const app = express();

// Railway (and most PaaS hosts) put the app behind a reverse proxy, so
// req.ip is the proxy's address unless this is set — needed for both the
// rate limiter's per-IP keying and the ToS-acceptance IP audit trail below.
app.set('trust proxy', 1);

// Set security headers
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow images to be loaded across origins
  })
);

// Configure CORS — allow dev origins + any URL set via CLIENT_URL env var.
// Trailing slashes are stripped on both sides: a browser's Origin header never
// has one, but it's an easy thing to paste into CLIENT_URL by accident (e.g.
// copying straight from the address bar), so normalize rather than requiring
// an exact match.
const stripTrailingSlash = (url) => url.replace(/\/+$/, '');

const devOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const allowedOrigins = [
  // Dev-only convenience origins — never allowed in production, regardless
  // of what CLIENT_URL contains (CFG-01: these used to be unconditional).
  ...(config.NODE_ENV === 'production' ? [] : devOrigins),
  // Production origins from CLIENT_URL env (comma-separated list supported)
  ...config.CLIENT_URL.split(',').map((u) => stripTrailingSlash(u.trim())).filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
      if (!origin || allowedOrigins.includes(stripTrailingSlash(origin))) {
        callback(null, true);
      } else {
        callback(new AppError(`CORS: origin ${origin} not allowed`, 403, 'CORS_FORBIDDEN'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);


// Log requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Clerk: parses the session token (if any) onto req, does not require auth
app.use(clerkMiddleware());

// Rate limiting (general)
app.use(generalLimiter);

// Static files (uploads folder for local storage)
app.use('/uploads', express.static(config.UPLOAD.DIR));

// Mount main routing
app.use('/api', routes);

// Serve Frontend static files
const frontendDistPath = path.join(__dirname, '../../Frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback all non-API requests to index.html for React Router SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Frontend is compiling... Please refresh in a moment! 🚀');
  }
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Looks like you are looking for a Pune cafe that does not exist. 🤷‍♂️',
      code: 'NOT_FOUND',
    },
  });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(config.PORT, () => {
  logger.info(`YouCollab server is buzzing on port ${config.PORT} in ${config.NODE_ENV} mode! 🐝🚀`);
  // Announce the Clerk instance this server verifies tokens against. It MUST
  // match the instance the frontend bundle was built with (its
  // VITE_CLERK_PUBLISHABLE_KEY) — otherwise every token the frontend mints is
  // unverifiable here and users get an unexplained login loop.
  if (config.CLERK.INSTANCE) {
    logger.info(`[auth] Clerk instance: ${config.CLERK.INSTANCE} — must match the frontend's publishable key.`);
  } else {
    logger.warn('[auth] CLERK_PUBLISHABLE_KEY not set — cannot verify this server matches the frontend Clerk instance.');
  }

  // Validate the Instagram token-encryption key at boot rather than letting a
  // bad value surface as an opaque 500 deep inside the OAuth callback (after
  // Instagram has already been consented to), which is near-impossible to
  // diagnose from the UI. Deliberately a loud warning rather than a hard exit:
  // only the Instagram integration depends on this key, so a bad value should
  // not take the whole API down.
  const encKey = config.TOKEN_ENCRYPTION_KEY;
  if (!encKey) {
    logger.warn('[instagram] TOKEN_ENCRYPTION_KEY is not set — connecting Instagram WILL fail. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  } else if (encKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(encKey)) {
    logger.warn(`[instagram] TOKEN_ENCRYPTION_KEY is invalid (got ${encKey.length} chars, need exactly 64 hex) — connecting Instagram WILL fail.`);
  } else {
    logger.info('[instagram] token encryption key OK.');
  }
  // Background gig-expiry sweep. Expiry is also enforced on read and on apply,
  // so this keeps statuses truthful rather than being the gate itself.
  scheduler.start();
});
