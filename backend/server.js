require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Models (for seeding)
const Admin = require('./models/Admin');
const Price = require('./models/Price');
const Pincode = require('./models/Pincode');
const Inventory = require('./models/Inventory');

const app = express();

// ── Security ──
app.use(helmet());

// ── CORS from .env ──
const corsOptions = {
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ── Body parsing ──
app.use(express.json({ limit: '1mb' }));

// ── Rate limiting on auth routes ──
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Too many login attempts. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ── Routes ──
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/pincodes', require('./routes/pincodes'));
app.use('/api/inventory', require('./routes/inventory'));

// ── Health check ──
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ──
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

// ── Error handler ──
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// ══════════ AUTO-SEED ON FIRST RUN ══════════
async function seedDefaults() {
    try {
        // Seed admin user
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            await Admin.create({
                email: process.env.ADMIN_EMAIL || 'admin@blinkdrop.com',
                passwordHash: process.env.ADMIN_PASSWORD || 'Blinkdrop@2026',
                name: 'Blinkdrop Admin'
            });
            console.log('🔑 Default admin created:', process.env.ADMIN_EMAIL);
        }

        // Seed prices
        const priceDoc = await Price.findById('global');
        if (!priceDoc) {
            await Price.create({ _id: 'global' });
            console.log('💰 Default prices seeded');
        }

        // Seed pincodes
        const pincodeCount = await Pincode.countDocuments();
        if (pincodeCount === 0) {
            const defaultPins = [
                '560001', '560002', '560003', '560004', '560005',
                '400001', '400002', '400003', '500001', '500002',
                '110001', '110002', '380001', '380002', '383001'
            ];
            await Pincode.insertMany(defaultPins.map(code => ({ code })));
            console.log('📍 Default pincodes seeded');
        }

        // Seed inventory
        const invCount = await Inventory.countDocuments();
        if (invCount === 0) {
            const defaultItems = [
                { itemId: 'hub', name: 'Blinkdrop Hub', icon: 'fa-solid fa-server' },
                { itemId: 'switch', name: 'Smart Switch Module', icon: 'fa-solid fa-toggle-on' },
                { itemId: 'fan', name: 'Smart Fan Controller', icon: 'fa-solid fa-fan' },
                { itemId: 'energy', name: 'Energy Monitor', icon: 'fa-solid fa-bolt-lightning' },
                { itemId: 'sensor', name: 'Wireless Sensor', icon: 'fa-solid fa-wifi' },
                { itemId: 'app', name: 'Blinkdrop App', icon: 'fa-solid fa-mobile-screen-button' }
            ];
            await Inventory.insertMany(defaultItems);
            console.log('📦 Default inventory seeded');
        }
    } catch (err) {
        console.error('Seed error:', err.message);
    }
}

// ══════════ START ══════════
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
    await seedDefaults();
    app.listen(PORT, () => {
        console.log(`\n🚀 Blinkdrop API running on port ${PORT}`);
        console.log(`📡 CORS allowed: ${corsOptions.origin}`);
        console.log(`🔗 Health: http://localhost:${PORT}/api/health\n`);
    });
});
