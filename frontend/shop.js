/**
 * shop.js — Blinkdrop Smart Builder Logic
 * Pincode checking, appliance split math, live pricing, booking flow
 * Connects to backend API
 */
(function () {
    'use strict';

    const API_BASE = 'https://smart-home-visitors.onrender.com/api';
    const MAX_APPLIANCES_PER_DEVICE = 8;

    // ── DOM References ──
    const pincodeInput = document.getElementById('pincode-input');
    const pincodeBtn = document.getElementById('pincode-btn');
    const pincodeResult = document.getElementById('pincode-result');
    const builderSection = document.getElementById('builder-section');
    const bookingSection = document.getElementById('booking-section');

    const applianceQty = document.getElementById('appliance-qty');
    const applianceSplit = document.getElementById('appliance-split');

    const sensorHumidity = document.getElementById('sensor-humidity');
    const sensorHumidityQtyWrap = document.getElementById('sensor-humidity-qty-wrap');
    const sensorHumidityQty = document.getElementById('sensor-humidity-qty');

    const sensorEnergy = document.getElementById('sensor-energy');
    const sensorEnergyQtyWrap = document.getElementById('sensor-energy-qty-wrap');
    const sensorEnergyQty = document.getElementById('sensor-energy-qty');

    const fanToggle = document.getElementById('fan-toggle');
    const fanQtyWrap = document.getElementById('fan-qty-wrap');
    const fanQty = document.getElementById('fan-qty');

    const priceBreakdown = document.getElementById('price-breakdown');
    const priceTotal = document.getElementById('price-total');
    const bookNowBtn = document.getElementById('book-now-btn');

    const bookingForm = document.getElementById('booking-form');
    const successModal = document.getElementById('success-modal');
    const modalOrderId = document.getElementById('modal-order-id');

    let currentPrices = { deviceBase: 999, perAppliance: 399, perSensor: 599, perFan: 799 };
    let availablePincodes = [];
    let validatedPincode = '';

    // ══════════ LOAD DATA FROM API ══════════
    async function loadPrices() {
        try {
            const res = await fetch(`${API_BASE}/prices`);
            if (res.ok) currentPrices = await res.json();
        } catch (err) { console.warn('Failed to load prices, using defaults'); }

        document.getElementById('price-per-appliance').textContent = '₹' + currentPrices.perAppliance;
        document.getElementById('price-per-sensor').textContent = '₹' + currentPrices.perSensor;
        document.getElementById('price-per-fan').textContent = '₹' + currentPrices.perFan;
    }

    async function loadPincodes() {
        try {
            const res = await fetch(`${API_BASE}/pincodes`);
            if (res.ok) availablePincodes = await res.json();
        } catch (err) { console.warn('Failed to load pincodes'); }
    }

    // Init
    loadPrices();
    loadPincodes();

    // ══════════ PINCODE CHECK ══════════
    pincodeBtn.addEventListener('click', checkPincode);
    pincodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPincode(); });

    function checkPincode() {
        const pin = pincodeInput.value.trim();
        if (!/^\d{6}$/.test(pin)) {
            showPincodeResult(false, 'Please enter a valid 6-digit pincode.');
            return;
        }

        checkServerStatus(
            () => {
                pincodeBtn.disabled = true;
                pincodeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Waking...';
                showPincodeResult(true, `<div style="text-align:center; padding: 1rem;"><i class="fa-solid fa-server fa-bounce" style="font-size:2rem; color:var(--primary); margin-bottom:0.5rem; display:block;"></i>Searching...</div>`);
            },
            async () => {
                pincodeBtn.disabled = true;
                pincodeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

                if (availablePincodes.length === 0) {
                    await loadPincodes();
                    await loadPrices();
                }

                pincodeBtn.disabled = false;
                pincodeBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Check';

                if (availablePincodes.includes(pin)) {
                    validatedPincode = pin;
                    showPincodeResult(true, `<i class="fa-solid fa-circle-check"></i> Great news! Blinkdrop services are available in <strong>${pin}</strong>.`);
                    builderSection.style.display = 'block';
                    setTimeout(() => {
                        builderSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                } else {
                    validatedPincode = '';
                    showPincodeResult(false, `<i class="fa-solid fa-clock"></i> Coming soon to your area! We're expanding our services to <strong>${pin}</strong>. Stay tuned.`);
                    builderSection.style.display = 'none';
                    bookingSection.style.display = 'none';
                }
            }
        );
    }

    function showPincodeResult(success, msg) {
        pincodeResult.innerHTML = msg;
        pincodeResult.className = 'pincode-result ' + (success ? 'success' : 'error');
        pincodeResult.style.display = 'block';
    }

    // ══════════ QTY CONTROLS ══════════
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            const dir = parseInt(btn.dataset.dir);
            const min = parseInt(target.min);
            const max = parseInt(target.max);
            let val = parseInt(target.value) + dir;
            val = Math.max(min, Math.min(max, val));
            target.value = val;
            updatePricing();
        });
    });

    // ══════════ TOGGLE SENSORS / FAN ══════════
    sensorHumidity.addEventListener('change', () => {
        sensorHumidityQtyWrap.style.display = sensorHumidity.checked ? 'flex' : 'none';
        if (!sensorHumidity.checked) sensorHumidityQty.value = 1;
        updatePricing();
    });

    sensorEnergy.addEventListener('change', () => {
        sensorEnergyQtyWrap.style.display = sensorEnergy.checked ? 'flex' : 'none';
        if (!sensorEnergy.checked) sensorEnergyQty.value = 1;
        updatePricing();
    });

    fanToggle.addEventListener('change', () => {
        fanQtyWrap.style.display = fanToggle.checked ? 'flex' : 'none';
        if (!fanToggle.checked) fanQty.value = 1;
        updatePricing();
    });

    // ══════════ PRICING ENGINE ══════════
    function updatePricing() {
        const p = currentPrices;
        const appCount = parseInt(applianceQty.value) || 0;
        const humCount = sensorHumidity.checked ? (parseInt(sensorHumidityQty.value) || 0) : 0;
        const energyCount = sensorEnergy.checked ? (parseInt(sensorEnergyQty.value) || 0) : 0;
        const fanCount = fanToggle.checked ? (parseInt(fanQty.value) || 0) : 0;

        const deviceCount = appCount > 0 ? Math.ceil(appCount / MAX_APPLIANCES_PER_DEVICE) : 0;
        updateApplianceSplit(appCount, deviceCount);

        const deviceCost = deviceCount * p.deviceBase;
        const appCost = appCount * p.perAppliance;
        const sensorCost = (humCount + energyCount) * p.perSensor;
        const fanCost = fanCount * p.perFan;
        const total = deviceCost + appCost + sensorCost + fanCost;

        let html = '';
        if (deviceCount > 0) html += breakdownLine('Blinkdrop Hub', deviceCount, p.deviceBase, deviceCost);
        if (appCount > 0) html += breakdownLine('Smart Appliance Slots', appCount, p.perAppliance, appCost);
        if (humCount > 0) html += breakdownLine('Humidity/Temp Sensor', humCount, p.perSensor, humCount * p.perSensor);
        if (energyCount > 0) html += breakdownLine('Energy Monitor', energyCount, p.perSensor, energyCount * p.perSensor);
        if (fanCount > 0) html += breakdownLine('Fan Controller', fanCount, p.perFan, fanCost);

        if (!html) {
            html = '<p class="empty-state">Add components above to see pricing</p>';
            bookNowBtn.style.display = 'none';
        } else {
            bookNowBtn.style.display = 'inline-flex';
        }

        priceBreakdown.innerHTML = html;
        priceTotal.textContent = '₹' + total.toLocaleString('en-IN');
    }

    function breakdownLine(label, qty, unit, subtotal) {
        return `<div class="breakdown-row">
      <span>${label} <span class="breakdown-qty">×${qty}</span></span>
      <span>₹${subtotal.toLocaleString('en-IN')}</span>
    </div>`;
    }

    function updateApplianceSplit(total, devices) {
        if (total === 0) { applianceSplit.innerHTML = ''; return; }
        if (devices === 1) {
            applianceSplit.innerHTML = `<i class="fa-solid fa-microchip"></i> 1 Device — ${total} appliance${total > 1 ? 's' : ''}`;
            return;
        }
        let lines = [];
        let remaining = total;
        for (let i = 1; i <= devices; i++) {
            const count = Math.min(remaining, MAX_APPLIANCES_PER_DEVICE);
            remaining -= count;
            lines.push(`Device ${i}: ${count} appliance${count > 1 ? 's' : ''}`);
        }
        applianceSplit.innerHTML = `<i class="fa-solid fa-microchip"></i> ${devices} Devices — ${lines.join(' · ')}`;
    }

    // ══════════ BOOKING FORM ══════════
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('book-name').value.trim();
        const phone = document.getElementById('book-phone').value.trim();
        const email = document.getElementById('book-email').value.trim();
        const address = document.getElementById('book-address').value.trim();

        if (!name || !phone || !email || !address) return;
        if (!/^\d{10}$/.test(phone)) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }

        const appCount = parseInt(applianceQty.value) || 0;
        const humCount = sensorHumidity.checked ? (parseInt(sensorHumidityQty.value) || 0) : 0;
        const energyCount = sensorEnergy.checked ? (parseInt(sensorEnergyQty.value) || 0) : 0;
        const fanCount = fanToggle.checked ? (parseInt(fanQty.value) || 0) : 0;
        const deviceCount = appCount > 0 ? Math.ceil(appCount / MAX_APPLIANCES_PER_DEVICE) : 0;
        const p = currentPrices;

        // Build config string
        let configParts = [];
        if (deviceCount > 0) {
            let remaining = appCount;
            for (let i = 1; i <= deviceCount; i++) {
                const c = Math.min(remaining, MAX_APPLIANCES_PER_DEVICE);
                remaining -= c;
                let parts = [`${c} App`];
                if (i === 1 && fanCount > 0) parts.push(`${fanCount} Fan`);
                if (i === 1 && humCount > 0) parts.push(`${humCount} Hum`);
                if (i === 1 && energyCount > 0) parts.push(`${energyCount} Eng`);
                configParts.push(`Device ${i}: ${parts.join(', ')}`);
            }
        }
        if (deviceCount === 0) {
            if (fanCount > 0) configParts.push(`${fanCount} Fan Controller`);
            if (humCount > 0) configParts.push(`${humCount} Humidity Sensor`);
            if (energyCount > 0) configParts.push(`${energyCount} Energy Monitor`);
        }

        const total = (deviceCount * p.deviceBase) + (appCount * p.perAppliance) +
            ((humCount + energyCount) * p.perSensor) + (fanCount * p.perFan);

        const submitBtn = document.getElementById('submit-booking-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        try {
            const res = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, phone, email, address,
                    pincode: validatedPincode,
                    config: configParts.join(' | '),
                    appliances: appCount,
                    sensors: humCount + energyCount,
                    fans: fanCount,
                    devices: deviceCount,
                    total
                })
            });

            const data = await res.json();

            if (res.ok) {
                modalOrderId.innerHTML = `<strong>Order ID:</strong> ${data.orderId}`;
                successModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            } else {
                alert(data.error || 'Failed to place order. Please try again.');
            }
        } catch (err) {
            alert('Network error. Please check your connection and try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Booking';
        }
    });

    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

})();
