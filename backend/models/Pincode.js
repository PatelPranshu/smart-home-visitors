const mongoose = require('mongoose');

const pincodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: /^\d{6}$/
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Pincode', pincodeSchema);
