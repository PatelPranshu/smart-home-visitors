/**
 * track.js — Blinkdrop Order Tracking
 * Lookup orders by phone or email via backend API
 */
(function () {
  'use strict';

  const API_BASE = 'https://smart-home-visitors.onrender.com/api';

  const STATUSES = ['Order Received', 'Technician Assigned', 'Out for Installation', 'Completed'];
  const STATUS_ICONS = {
    'Order Received': 'fa-solid fa-clipboard-check',
    'Technician Assigned': 'fa-solid fa-user-gear',
    'Out for Installation': 'fa-solid fa-truck-fast',
    'Completed': 'fa-solid fa-circle-check'
  };

  const trackInput = document.getElementById('track-input');
  const trackBtn = document.getElementById('track-btn');
  const trackResults = document.getElementById('track-results');
  const trackEmpty = document.getElementById('track-empty');

  trackBtn.addEventListener('click', searchOrder);
  trackInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchOrder(); });

  async function searchOrder() {
    const query = trackInput.value.trim().toLowerCase();
    if (!query) return;

    trackBtn.disabled = true;
    trackBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const res = await fetch(`${API_BASE}/orders/track?q=${encodeURIComponent(query)}`);
      const orders = await res.json();

      if (!res.ok || !Array.isArray(orders) || orders.length === 0) {
        trackResults.innerHTML = '';
        trackEmpty.style.display = 'block';
        return;
      }

      trackEmpty.style.display = 'none';
      trackResults.innerHTML = orders.map(order => renderOrder(order)).join('');
    } catch (err) {
      trackResults.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:2rem;">Unable to connect to server. Please try again later.</p>';
      trackEmpty.style.display = 'none';
    } finally {
      trackBtn.disabled = false;
      trackBtn.innerHTML = '<i class="fa-solid fa-search"></i> Track';
    }
  }

  function renderOrder(order) {
    const currentIdx = STATUSES.indexOf(order.status);
    const date = new Date(order.createdAt || order.date);
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let timelineHtml = STATUSES.map((s, i) => {
      let cls = '';
      if (i < currentIdx) cls = 'completed';
      else if (i === currentIdx) cls = 'active';
      else cls = 'pending';

      return `<div class="timeline-step ${cls}">
        <div class="timeline-dot"><i class="${STATUS_ICONS[s]}"></i></div>
        <div class="timeline-label">${s}</div>
      </div>`;
    }).join('');

    let techHtml = '';
    if (order.technicianName) {
      techHtml = `<div class="track-address" style="border-top:1px solid var(--card-border);padding-top:0.8rem;margin-top:0.8rem;">
        <i class="fa-solid fa-user-gear"></i>
        <span><strong>Technician:</strong> ${order.technicianName} — ${order.technicianPhone || 'N/A'}</span>
      </div>`;
    }

    return `<div class="track-card">
      <div class="track-card-header">
        <div>
          <div class="track-order-id">${order.orderId}</div>
          <div class="track-date">${dateStr}</div>
        </div>
        <div class="track-total">₹${(order.total || 0).toLocaleString('en-IN')}</div>
      </div>
      <div class="track-config">${order.config || 'Custom Kit'}</div>
      <div class="track-timeline">${timelineHtml}</div>
      <div class="track-address">
        <i class="fa-solid fa-location-dot"></i>
        <span>${order.address}</span>
      </div>
      ${techHtml}
    </div>`;
  }

})();
