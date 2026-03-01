const express = require('express');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const router = express.Router();

// POST /api/orders — Create order (public, from shop)
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, address, pincode, config,
            appliances, sensors, fans, devices, total } = req.body;

        if (!name || !phone || !email || !address || !pincode || total === undefined) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number.' });
        }

        const orderId = 'BD-' + Date.now().toString(36).toUpperCase();

        const order = await Order.create({
            orderId, name, phone, email, address, pincode,
            config: config || '',
            appliances: appliances || 0,
            sensors: sensors || 0,
            fans: fans || 0,
            devices: devices || 0,
            total
        });

        res.status(201).json({
            orderId: order.orderId,
            message: 'Order placed successfully.'
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to create order.' });
    }
});

// GET /api/orders/track?q=phone_or_email — Public tracking
router.get('/track', async (req, res) => {
    try {
        const q = (req.query.q || '').trim().toLowerCase();
        if (!q) return res.status(400).json({ error: 'Query required.' });

        const orders = await Order.find({
            $or: [
                { phone: q },
                { email: q }
            ]
        }).sort({ createdAt: -1 }).select('-__v');

        res.json(orders);
    } catch (err) {
        console.error('Track error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/orders — List all orders (admin)
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).select('-__v');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/orders/:id — Single order detail (admin)
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id }).select('-__v');
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/orders/:id/status — Update status (admin)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Order Received', 'Technician Assigned', 'Out for Installation', 'Completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const order = await Order.findOneAndUpdate(
            { orderId: req.params.id },
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/orders/:id/technician — Assign technician (admin)
router.patch('/:id/technician', auth, async (req, res) => {
    try {
        const { technicianName, technicianPhone } = req.body;

        if (!technicianName || !technicianPhone) {
            return res.status(400).json({ error: 'Technician name and phone required.' });
        }

        const order = await Order.findOneAndUpdate(
            { orderId: req.params.id },
            {
                technicianName,
                technicianPhone,
                assignedAt: new Date(),
                status: 'Technician Assigned'
            },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// DELETE /api/orders/:id — Delete order (admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findOneAndDelete({ orderId: req.params.id });
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        res.json({ message: 'Order deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
