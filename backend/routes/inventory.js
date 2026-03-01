const express = require('express');
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/inventory — Public
router.get('/', async (req, res) => {
    try {
        const items = await Inventory.find().sort({ itemId: 1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/inventory/:id — Toggle stock (admin)
router.patch('/:id', auth, async (req, res) => {
    try {
        const { inStock } = req.body;
        const item = await Inventory.findOneAndUpdate(
            { itemId: req.params.id },
            { inStock: Boolean(inStock) },
            { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Item not found.' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
