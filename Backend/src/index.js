const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

// Set security headers
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow images to be loaded across origins
  })
);

// Configure CORS
app.use(
  cors({
    origin: [
      config.CLIENT_URL,
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ],
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
app.use(cookieParser());

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
});
