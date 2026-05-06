import { db, dbRef as ref, get, set, remove, onValue } from "./firebase-config.js";

// ═══════════════════════════════════════════
// MANAJEMEN ULASAN PENDING
// ═══════════════════════════════════════════

const escapeHTML = (str) =>
    String(str || '').replace(/[&<>'"]/g, tag =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));

let pendingTestimoniData = {};

// Real-time listener
onValue(ref(db, 'testimoni_pending'), (snap) => {
    pendingTestimoniData = {};
    if (snap.exists()) {
        snap.forEach(child => { pendingTestimoniData[child.key] = child.val(); });
    }
    renderPendingTestimoni();
    updatePendingBadge();
});

function updatePendingBadge() {
    const count = Object.keys(pendingTestimoniData).length;
    const badge = document.getElementById('badgePending');
    const countBadge = document.getElementById('pendingCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (countBadge) countBadge.textContent = count + ' ulasan';
}

function renderPendingTestimoni() {
    const container = document.getElementById('pendingTestimoniContainer');
    if (!container) return;

    const entries = Object.entries(pendingTestimoniData)
        .sort(([, a], [, b]) => (b.timestamp || 0) - (a.timestamp || 0));

    if (entries.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:var(--text-light);">
                <i class="fas fa-check-circle fa-3x" style="display:block; margin-bottom:15px; color:#10b981;"></i>
                <h3 style="margin-bottom:8px; color:var(--text-color);">Semua bersih!</h3>
                <p>Tidak ada ulasan yang menunggu persetujuan.</p>
            </div>`;
        return;
    }

    container.innerHTML = entries.map(([key, t]) => {
        const rating = Math.min(5, Math.max(1, t.rating || 5));
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const tgl = t.timestamp ? new Date(t.timestamp).toLocaleString('id-ID') : '-';
        const initial = escapeHTML((t.nama || '?')[0].toUpperCase());

        return `
        <div style="background:var(--secondary-color); border:1px solid var(--border-color); border-radius:12px; padding:20px; display:flex; gap:16px; align-items:flex-start;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--primary-color); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1.2rem; flex-shrink:0;">
                ${initial}
            </div>
            <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong style="font-size:1rem;">${escapeHTML(t.nama || 'Anonim')}</strong>
                        <span style="color:var(--text-light); font-size:0.85rem; margin-left:8px;">${escapeHTML(t.role || 'Pelanggan')}</span>
                    </div>
                    <span style="color:#f59e0b; font-size:1.1rem; letter-spacing:2px;">${stars}</span>
                </div>
                <p style="margin:8px 0; color:var(--text-color); font-size:0.95rem; line-height:1.6;">&#8220;${escapeHTML(t.teks || '')}&#8221;</p>
                <p style="margin:0; font-size:0.78rem; color:var(--text-light);"><i class="fas fa-clock"></i> ${tgl}</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; flex-shrink:0;">
                <button class="btn btn-success" onclick="window.approveTestimoni('${key}')" style="padding:8px 16px; font-size:0.85rem; white-space:nowrap;">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-danger" onclick="window.rejectTestimoni('${key}')" style="padding:8px 16px; font-size:0.85rem; white-space:nowrap;">
                    <i class="fas fa-times"></i> Tolak
                </button>
            </div>
        </div>`;
    }).join('');
}

window.approveTestimoni = async (key) => {
    const t = pendingTestimoniData[key];
    if (!t) return;
    try {
        // Ambil array testimoni yang sudah ada
        const snap = await get(ref(db, 'pengaturan_toko/testimonis'));
        let arr = (snap.exists() && Array.isArray(snap.val())) ? snap.val() : [];
        // Tambahkan ulasan yang diapprove
        arr.push({
            nama: t.nama || 'Pelanggan',
            role: t.role || 'Pelanggan',
            teks: t.teks || ''
        });
        // Simpan balik ke pengaturan_toko/testimonis
        await set(ref(db, 'pengaturan_toko/testimonis'), arr);
        // Hapus dari pending
        await remove(ref(db, 'testimoni_pending/' + key));
        if (window.showSweetAlert) {
            window.showSweetAlert('Ulasan disetujui dan tampil di beranda!', 'success');
        } else if (window.showModal) {
            window.showModal('✅ Ulasan disetujui dan ditampilkan di beranda!', 'info');
        }
    } catch (err) {
        console.error(err);
        if (window.showModal) window.showModal('Gagal approve: ' + err.message, 'info');
    }
};

window.rejectTestimoni = (key) => {
    const confirmFn = async () => {
        try {
            await remove(ref(db, 'testimoni_pending/' + key));
            if (window.showModal) window.showModal('Ulasan ditolak dan dihapus.', 'info');
        } catch (err) {
            if (window.showModal) window.showModal('Gagal: ' + err.message, 'info');
        }
    };
    if (window.showModal) {
        window.showModal('Yakin ingin menolak dan menghapus ulasan ini?', 'confirm', confirmFn);
    } else {
        if (confirm('Yakin menolak ulasan ini?')) confirmFn();
    }
};
