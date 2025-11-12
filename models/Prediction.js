// models/Prediction.js
const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  percent: { type: Number, required: true, min: 0, max: 100 },
  willGo: { type: Boolean, default: false },
  emoji: { type: String, default: '' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  special: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prediction', PredictionSchema);
