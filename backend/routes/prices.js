const express = require('express');
const Price = require('../models/Price');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/prices — Public (shop uses this)
router.get('/', async (req, res) => {
    try {
        let prices = await Price.findById('global');
        if (!prices) {
            prices = await Price.create({ _id: 'global' });
        }
        res.json({
            deviceBase: prices.deviceBase,
            perAppliance: prices.perAppliance,
            perSensor: prices.perSensor,
            perFan: prices.perFan
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PUT /api/prices — Admin only
router.put('/', auth, async (req, res) => {
    try {
        const { deviceBase, perAppliance, perSensor, perFan } = req.body;
        const prices = await Price.findByIdAndUpdate(
            'global',
            {
                deviceBase: parseInt(deviceBase) || 0,
                perAppliance: parseInt(perAppliance) || 0,
                perSensor: parseInt(perSensor) || 0,
                perFan: parseInt(perFan) || 0
            },
            { new: true, upsert: true }
        );
        res.json({
            deviceBase: prices.deviceBase,
            perAppliance: prices.perAppliance,
            perSensor: prices.perSensor,
            perFan: prices.perFan
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
