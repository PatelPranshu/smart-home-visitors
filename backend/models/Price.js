const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
    _id: { type: String, default: 'global' },
    deviceBase: { type: Number, default: 999 },
    perAppliance: { type: Number, default: 399 },
    perSensor: { type: Number, default: 599 },
    perFan: { type: Number, default: 799 }
}, { timestamps: true });

module.exports = mongoose.model('Price', priceSchema);
