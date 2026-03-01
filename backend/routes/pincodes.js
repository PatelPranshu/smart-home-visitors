const express = require('express');
const Pincode = require('../models/Pincode');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/pincodes — Public (shop pincode check)
router.get('/', async (req, res) => {
    try {
        const pincodes = await Pincode.find({ isActive: true }).select('code -_id');
        res.json(pincodes.map(p => p.code));
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/pincodes/all — Admin (includes inactive)
router.get('/all', auth, async (req, res) => {
    try {
        const pincodes = await Pincode.find().sort({ code: 1 });
        res.json(pincodes);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/pincodes — Admin only
router.post('/', auth, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ error: 'Valid 6-digit pincode required.' });
        }

        const existing = await Pincode.findOne({ code });
        if (existing) {
            existing.isActive = true;
            await existing.save();
            return res.json(existing);
        }

        const pincode = await Pincode.create({ code });
        res.status(201).json(pincode);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// DELETE /api/pincodes/:code — Admin only
router.delete('/:code', auth, async (req, res) => {
    try {
        const pincode = await Pincode.findOneAndDelete({ code: req.params.code });
        if (!pincode) return res.status(404).json({ error: 'Pincode not found.' });
        res.json({ message: 'Pincode removed.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
