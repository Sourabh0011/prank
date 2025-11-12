// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const Prediction = require('./models/Prediction');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO = process.env.MONGO_URI;

if (!MONGO) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

// Basic security middlewares
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// CORS - adjust origin in production
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*' // set to your site url in production
}));

// Rate limit to prevent abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120
});
app.use(limiter);

// connect to mongodb
mongoose.connect(MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// --- Routes ---

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Create a prediction (save)
app.post('/api/predictions', async (req, res) => {
  try {
    const { name, percent, willGo, emoji, title, message, special } = req.body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length > 100) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    const percentNum = Number(percent);
    if (Number.isNaN(percentNum) || percentNum < 0 || percentNum > 100) {
      return res.status(400).json({ error: 'Invalid percent (0-100)' });
    }

    const doc = new Prediction({
      name: name.trim(),
      percent: percentNum,
      willGo: !!willGo,
      emoji: emoji || '',
      title: title || '',
      message: message || '',
      special: !!special
    });

    await doc.save();
    return res.status(201).json({ ok: true, id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// List latest predictions (with optional limit query param)
app.get('/api/predictions', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const docs = await Prediction.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, results: docs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete all predictions (useful for clearing history) — protect in prod!
app.delete('/api/predictions', async (req, res) => {
  try {
    // Optional: require an admin key to prevent accidental deletion
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await Prediction.deleteMany({});
    return res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
