const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    config: { type: String, default: '' },
    appliances: { type: Number, default: 0 },
    sensors: { type: Number, default: 0 },
    fans: { type: Number, default: 0 },
    devices: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Order Received', 'Technician Assigned', 'Out for Installation', 'Completed'],
        default: 'Order Received'
    },
    technicianName: { type: String, default: '' },
    technicianPhone: { type: String, default: '' },
    assignedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
