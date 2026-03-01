const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: { type: String, default: 'fa-solid fa-box' },
    inStock: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
