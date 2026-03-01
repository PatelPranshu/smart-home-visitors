/**
 * admin.js — Blinkdrop Admin Dashboard
 * JWT auth, order management, pricing, inventory, pincodes
 * All data via backend API
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const STATUSES = ['Order Received', 'Technician Assigned', 'Out for Installation', 'Completed'];

    let authToken = sessionStorage.getItem('bd_admin_token') || '';

    // ── Auth Helper ──
    async function fetchWithAuth(url, options = {}) {
        options.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...(options.headers || {})
        };
        const res = await fetch(url, options);
        if (res.status === 401) {
            authToken = '';
            sessionStorage.removeItem('bd_admin_token');
            showLogin();
            throw new Error('Session expired');
        }
        return res;
    }

    // ══════════ LOGIN ══════════
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const adminMain = document.getElementById('admin-main');
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('admin-topbar');

    function showLogin() {
        loginOverlay.style.display = 'flex';
        adminMain.style.display = 'none';
        sidebar.style.display = 'none';
        topbar.style.display = 'none';
    }

    function showDashboard() {
        loginOverlay.style.display = 'none';
        adminMain.style.display = 'block';
        sidebar.style.display = 'flex';
        topbar.style.display = '';
        loadDashboard();
    }

    // Check if we have a valid token
    async function checkAuth() {
        if (!authToken) { showLogin(); return; }
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) { showDashboard(); }
            else { showLogin(); }
        } catch { showLogin(); }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');

        loginError.textContent = '';
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                authToken = data.token;
                sessionStorage.setItem('bd_admin_token', authToken);
                showDashboard();
            } else {
                loginError.textContent = data.error || 'Login failed.';
            }
        } catch {
            loginError.textContent = 'Cannot connect to server.';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        authToken = '';
        sessionStorage.removeItem('bd_admin_token');
        showLogin();
    });

    // ══════════ TAB NAVIGATION ══════════
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-tab]');
    const tabs = document.querySelectorAll('.admin-tab');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            tabs.forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
            sidebar.classList.remove('open');
        });
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // ══════════ LOAD ALL DATA ══════════
    async function loadDashboard() {
        await Promise.all([
            loadOrders(),
            loadPrices(),
            loadInventory(),
            loadPincodes()
        ]);
    }

    // ══════════ STATS ══════════
    function updateStats(orders) {
        const total = orders.length;
        const pending = orders.filter(o => o.status !== 'Completed').length;
        const completed = orders.filter(o => o.status === 'Completed').length;
        const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

        document.getElementById('stat-total-orders').textContent = total;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-revenue').textContent = '₹' + revenue.toLocaleString('en-IN');
    }

    // ══════════ ORDERS ══════════
    let ordersCache = [];

    async function loadOrders() {
        try {
            const res = await fetchWithAuth(`${API_BASE}/orders`);
            ordersCache = await res.json();
            renderOrders();
            updateStats(ordersCache);
        } catch { }
    }

    function renderOrders() {
        const tbody = document.getElementById('orders-tbody');
        const noOrders = document.getElementById('no-orders');

        if (ordersCache.length === 0) {
            tbody.innerHTML = '';
            noOrders.style.display = 'block';
            return;
        }

        noOrders.style.display = 'none';
        tbody.innerHTML = ordersCache.map(o => {
            const statusOptions = STATUSES.map(s =>
                `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
            ).join('');

            const date = new Date(o.createdAt);
            const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

            return `<tr>
        <td>
          <span class="order-id">${o.orderId}</span>
          <div class="order-date">${dateStr}</div>
        </td>
        <td>
          <div class="customer-name">${o.name}</div>
          <div class="customer-phone">${o.phone}</div>
        </td>
        <td><span class="total-val">₹${(o.total || 0).toLocaleString('en-IN')}</span></td>
        <td>
          <select class="status-select" data-id="${o.orderId}" onchange="window._updateStatus(this)">
            ${statusOptions}
          </select>
        </td>
        <td class="actions-cell">
          <button class="view-more-btn" data-id="${o.orderId}" onclick="window._viewOrder(this)" title="View Details">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="delete-order-btn" data-id="${o.orderId}" onclick="window._deleteOrder(this)" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>`;
        }).join('');
    }

    window._updateStatus = async function (select) {
        const orderId = select.dataset.id;
        try {
            await fetchWithAuth(`${API_BASE}/orders/${orderId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: select.value })
            });
            await loadOrders();
        } catch { }
    };

    window._deleteOrder = async function (btn) {
        const orderId = btn.dataset.id;
        if (!confirm('Delete this order? This cannot be undone.')) return;
        try {
            await fetchWithAuth(`${API_BASE}/orders/${orderId}`, { method: 'DELETE' });
            await loadOrders();
        } catch { }
    };

    // ══════════ VIEW MORE MODAL ══════════
    const orderModal = document.getElementById('order-modal');
    const orderModalContent = document.getElementById('order-modal-content');
    const orderModalClose = document.getElementById('order-modal-close');

    window._viewOrder = async function (btn) {
        const orderId = btn.dataset.id;
        try {
            const res = await fetchWithAuth(`${API_BASE}/orders/${orderId}`);
            const order = await res.json();
            renderOrderModal(order);
            orderModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error('View order error:', err);
        }
    };

    function renderOrderModal(order) {
        const date = new Date(order.createdAt);
        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');

        let techSection = '';
        if (order.technicianName) {
            const assignedDate = order.assignedAt ? new Date(order.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            techSection = `
        <div class="modal-section">
          <h4><i class="fa-solid fa-user-gear"></i> Assigned Technician</h4>
          <div class="modal-detail-grid">
            <div class="modal-detail"><span class="detail-label">Name</span><span class="detail-value">${order.technicianName}</span></div>
            <div class="modal-detail"><span class="detail-label">Phone</span><span class="detail-value">${order.technicianPhone || 'N/A'}</span></div>
            ${assignedDate ? `<div class="modal-detail"><span class="detail-label">Assigned On</span><span class="detail-value">${assignedDate}</span></div>` : ''}
          </div>
        </div>`;
        }

        orderModalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <span class="modal-order-id">${order.orderId}</span>
          <span class="modal-status-badge ${statusClass}">${order.status}</span>
        </div>
        <div class="modal-date">${dateStr}</div>
      </div>

      <div class="modal-section">
        <h4><i class="fa-solid fa-user"></i> Customer Details</h4>
        <div class="modal-detail-grid">
          <div class="modal-detail"><span class="detail-label">Name</span><span class="detail-value">${order.name}</span></div>
          <div class="modal-detail"><span class="detail-label">Phone</span><span class="detail-value">${order.phone}</span></div>
          <div class="modal-detail"><span class="detail-label">Email</span><span class="detail-value">${order.email}</span></div>
          <div class="modal-detail"><span class="detail-label">Pincode</span><span class="detail-value">${order.pincode}</span></div>
        </div>
        <div class="modal-detail modal-detail-full">
          <span class="detail-label">Address</span>
          <span class="detail-value">${order.address}</span>
        </div>
      </div>

      <div class="modal-section">
        <h4><i class="fa-solid fa-microchip"></i> Configuration</h4>
        <div class="modal-detail-grid">
          <div class="modal-detail"><span class="detail-label">Devices</span><span class="detail-value">${order.devices || 0}</span></div>
          <div class="modal-detail"><span class="detail-label">Appliances</span><span class="detail-value">${order.appliances || 0}</span></div>
          <div class="modal-detail"><span class="detail-label">Sensors</span><span class="detail-value">${order.sensors || 0}</span></div>
          <div class="modal-detail"><span class="detail-label">Fan Controllers</span><span class="detail-value">${order.fans || 0}</span></div>
        </div>
        <div class="modal-detail modal-detail-full">
          <span class="detail-label">Config Summary</span>
          <span class="detail-value">${order.config || 'Custom Kit'}</span>
        </div>
        <div class="modal-total">
          <span>Total</span>
          <span class="modal-total-value">₹${(order.total || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      ${techSection}

      <div class="modal-section">
        <h4><i class="fa-solid fa-screwdriver-wrench"></i> Assign Technician</h4>
        <form class="tech-assign-form" id="tech-assign-form" data-id="${order.orderId}">
          <div class="tech-form-row">
            <div class="tech-field">
              <label>Technician Name</label>
              <input type="text" id="tech-name" placeholder="Enter name" value="${order.technicianName || ''}" required>
            </div>
            <div class="tech-field">
              <label>Technician Phone</label>
              <input type="tel" id="tech-phone" placeholder="10-digit number" value="${order.technicianPhone || ''}" pattern="\\d{10}" required>
            </div>
          </div>
          <button type="submit" class="neon-btn tech-assign-btn" id="tech-assign-btn">
            <i class="fa-solid fa-user-plus"></i> ${order.technicianName ? 'Update Technician' : 'Assign Technician'}
          </button>
        </form>
      </div>
    `;

        // Bind the form
        const techForm = document.getElementById('tech-assign-form');
        techForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const orderId = techForm.dataset.id;
            const techName = document.getElementById('tech-name').value.trim();
            const techPhone = document.getElementById('tech-phone').value.trim();

            if (!techName || !techPhone) return;
            if (!/^\d{10}$/.test(techPhone)) {
                alert('Please enter a valid 10-digit phone number.');
                return;
            }

            const btn = document.getElementById('tech-assign-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Assigning...';

            try {
                const res = await fetchWithAuth(`${API_BASE}/orders/${orderId}/technician`, {
                    method: 'PATCH',
                    body: JSON.stringify({ technicianName: techName, technicianPhone: techPhone })
                });
                if (res.ok) {
                    const updated = await res.json();
                    renderOrderModal(updated);
                    await loadOrders();
                }
            } catch { }
            finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Assign Technician';
            }
        });
    }

    orderModalClose.addEventListener('click', () => {
        orderModal.style.display = 'none';
        document.body.style.overflow = '';
    });
    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            orderModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // ══════════ PRICING ══════════
    async function loadPrices() {
        try {
            const res = await fetchWithAuth(`${API_BASE}/prices`);
            const prices = await res.json();
            document.getElementById('price-deviceBase').value = prices.deviceBase;
            document.getElementById('price-perAppliance').value = prices.perAppliance;
            document.getElementById('price-perSensor').value = prices.perSensor;
            document.getElementById('price-perFan').value = prices.perFan;
        } catch { }
    }

    document.getElementById('save-prices-btn').addEventListener('click', async () => {
        const prices = {
            deviceBase: parseInt(document.getElementById('price-deviceBase').value) || 0,
            perAppliance: parseInt(document.getElementById('price-perAppliance').value) || 0,
            perSensor: parseInt(document.getElementById('price-perSensor').value) || 0,
            perFan: parseInt(document.getElementById('price-perFan').value) || 0
        };
        try {
            await fetchWithAuth(`${API_BASE}/prices`, {
                method: 'PUT',
                body: JSON.stringify(prices)
            });
            showToast('price-toast');
        } catch { }
    });

    function showToast(id) {
        const toast = document.getElementById(id);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ══════════ INVENTORY ══════════
    async function loadInventory() {
        try {
            const res = await fetchWithAuth(`${API_BASE}/inventory`);
            const inventory = await res.json();
            renderInventory(inventory);
        } catch { }
    }

    function renderInventory(inventory) {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = inventory.map(item => {
            return `<div class="inventory-card">
        <div class="inventory-card-icon"><i class="${item.icon}"></i></div>
        <div class="inventory-card-info">
          <h3>${item.name}</h3>
          <span class="stock-badge ${item.inStock ? 'in-stock' : 'out-of-stock'}">
            ${item.inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
        <label class="inv-toggle">
          <input type="checkbox" ${item.inStock ? 'checked' : ''} data-id="${item.itemId}"
            onchange="window._toggleInventory(this)">
          <span class="inv-toggle-slider"></span>
        </label>
      </div>`;
        }).join('');
    }

    window._toggleInventory = async function (checkbox) {
        const itemId = checkbox.dataset.id;
        try {
            await fetchWithAuth(`${API_BASE}/inventory/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({ inStock: checkbox.checked })
            });
            await loadInventory();
        } catch { }
    };

    // ══════════ PINCODES ══════════
    async function loadPincodes() {
        try {
            const res = await fetchWithAuth(`${API_BASE}/pincodes`);
            const pincodes = await res.json();
            renderPincodes(pincodes);
        } catch { }
    }

    function renderPincodes(pincodes) {
        const container = document.getElementById('pincode-tags');
        container.innerHTML = pincodes.map(pin => {
            return `<span class="pincode-tag">
        ${pin}
        <button class="pincode-remove" data-code="${pin}" onclick="window._removePincode(this)" title="Remove">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </span>`;
        }).join('');
    }

    document.getElementById('add-pincode-btn').addEventListener('click', addPincode);
    document.getElementById('add-pincode-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addPincode();
    });

    async function addPincode() {
        const input = document.getElementById('add-pincode-input');
        const pin = input.value.trim();
        if (!/^\d{6}$/.test(pin)) { input.focus(); return; }

        try {
            await fetchWithAuth(`${API_BASE}/pincodes`, {
                method: 'POST',
                body: JSON.stringify({ code: pin })
            });
            input.value = '';
            await loadPincodes();
        } catch { }
    }

    window._removePincode = async function (btn) {
        const code = btn.dataset.code;
        try {
            await fetchWithAuth(`${API_BASE}/pincodes/${code}`, { method: 'DELETE' });
            await loadPincodes();
        } catch { }
    };

    // ══════════ INIT ══════════
    checkAuth();

})();
