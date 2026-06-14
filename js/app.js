import { db, dbRef as ref, get, child, push } from "./firebase-config.js";

// Utility: Anti-blocker for ImgBB
const antiBlokir = (url) => {
    if (!url) return '';
    if (url.includes('ibb.co')) {
        return 'https://wsrv.nl/?url=' + encodeURIComponent(url);
    }
    return url;
};

// Utility: Currency Formatting
const formatRupiah = (angka) => { 
    if (!angka || angka == 0) return "<span class='badge badge-pickedup' style='font-style:italic;'>Menunggu pengecekan / Belum ditentukan</span>"; 
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka); 
};

// Utility: Escape HTML
const escapeHTML = (str) => String(str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
window.escapeHTML = escapeHTML;

let globalWaNumber = "";
let currentSlide = 0; 
let slideInterval; 
let slides = [];
window.tokoSettings = {};

// Handle Navigation
const pages = document.querySelectorAll('.page-content');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const pageLoader = document.getElementById('page-loader');

window.showPage = (pageId) => {
    // Show loader
    pageLoader.classList.remove('hidden');
    
    setTimeout(() => {
        pages.forEach(page => page.classList.add('hidden'));
        const newPage = document.getElementById(pageId);
        if (newPage) newPage.classList.remove('hidden');
        
        setTimeout(() => { 
            pageLoader.classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    }, 300);
    
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
};

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
}

// Slider Logic
function createDots() {
    const dotsContainer = document.getElementById('slider-dots');
    if (!dotsContainer || slides.length <= 1) return;
    dotsContainer.innerHTML = Array.from(slides).map((_, i) =>
        `<button class="slider-dot${i === 0 ? ' active' : ''}" onclick="goToSlide(${i})" aria-label="Slide ${i+1}"></button>`
    ).join('');
}
window.goToSlide = (index) => {
    stopSlider(); currentSlide = index; updateSlider(); startSlider();
};
function updateDots() {
    const dots = document.querySelectorAll('.slider-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}
function startSlider() { 
    slideInterval = setInterval(() => { 
        currentSlide = (currentSlide + 1) % slides.length; 
        updateSlider(); 
    }, 4000); 
}
function stopSlider() { clearInterval(slideInterval); }
function updateSlider() { 
    const slider = document.getElementById('image-slider'); 
    if (slider && slides.length > 0) {
        slider.style.transform = `translateX(-${currentSlide * 100}%)`; 
        updateDots();
    }
}

document.getElementById('prev-btn')?.addEventListener('click', () => { 
    stopSlider(); 
    currentSlide = (currentSlide - 1 + slides.length) % slides.length; 
    updateSlider(); 
    startSlider(); 
});
document.getElementById('next-btn')?.addEventListener('click', () => { 
    stopSlider(); 
    currentSlide = (currentSlide + 1) % slides.length; 
    updateSlider(); 
    startSlider(); 
});

// Scroll Reveal
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// WA Order Logic
window.beliViaWa = (namaProduk, harga) => {
    if (!globalWaNumber) { 
        if(window.showSweetAlert) window.showSweetAlert('Nomor WA Toko belum diatur.', 'info');
        else alert('Nomor WA Toko belum diatur.'); 
        return; 
    }
    let infoHarga = harga > 0 ? `Harga: Rp ${harga.toLocaleString('id-ID')}` : `Harga: Menyesuaikan Budget`;
    const pesan = `Halo Admin, saya tertarik untuk layanan pengadaan/rakit ini:\n\n*${namaProduk}*\n${infoHarga}\n\nMohon info lebih lanjut.`;
    window.open(`https://wa.me/${globalWaNumber}?text=${encodeURIComponent(pesan)}`, '_blank');
};

// Load Data from Firebase
async function loadWebsiteSettings() {
    try {
        const snapshot = await get(ref(db, 'pengaturan_toko'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            window.tokoSettings = data;

            // Apply Theme Color
            if (data.warnaUtama) {
                document.documentElement.style.setProperty('--color-primary', data.warnaUtama);
            }

            // Apply Texts
            const nama = data.namaToko || 'Toko Servis';
            document.title = `Lacak Servis - ${nama}`;
            // Fix 5: Update meta OG title dynamically
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.content = `${nama} - Cek Status Servis`;
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc && data.subHeadline) ogDesc.content = data.subHeadline;
            const headerNamaElements = document.querySelectorAll('.headerNamaToko');
            headerNamaElements.forEach(el => el.innerText = nama);
            
            if (document.getElementById('mapsNamaToko')) document.getElementById('mapsNamaToko').innerText = nama; 
            if (document.getElementById('copyrightText')) document.getElementById('copyrightText').innerText = `© ${new Date().getFullYear()} ${nama}. All Rights Reserved.`;

            // Apply Logos
            if (data.logoUrl) {
                let logoAman = antiBlokir(data.logoUrl);
                if (document.getElementById('faviconImg')) document.getElementById('faviconImg').href = logoAman;
                const logoElements = document.querySelectorAll('.tokoLogo');
                logoElements.forEach(el => el.src = logoAman);
            }

            if (data.headline && document.getElementById('heroHeadline')) document.getElementById('heroHeadline').innerText = data.headline;
            if (data.subHeadline && document.getElementById('heroSubHeadline')) document.getElementById('heroSubHeadline').innerText = data.subHeadline;

            // Legalitas
            const legalitasSection = document.getElementById('legalitas-section');
            if (legalitasSection) {
                if (data.nib) {
                    legalitasSection.classList.remove('hidden');
                    document.getElementById('teksNib').innerText = data.nib;
                    document.getElementById('teksLegalitasDesc').innerText = data.legalitasDesc || 'Usaha ini telah terdaftar resmi secara hukum.';
                } else {
                    legalitasSection.classList.add('hidden');
                }
            }

            // Contact & Maps
            if (data.alamat) { 
                if(document.getElementById('mapsAlamat')) document.getElementById('mapsAlamat').innerText = data.alamat; 
                if(document.getElementById('footerAlamat')) document.getElementById('footerAlamat').innerText = data.alamat; 
            }
            if (data.maps && document.getElementById('mapsContainer')) { 
                let mapSrc = data.maps; 
                if (mapSrc.includes('src="')) mapSrc = mapSrc.split('src="')[1].split('"')[0]; 
                document.getElementById('mapsContainer').innerHTML = `<iframe src="${mapSrc}" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`; 
            }

            if (data.wa) {
                const waNumber = data.wa.replace(/[^0-9]/g, '');
                globalWaNumber = waNumber;
                if(document.getElementById('footerWaLink')) {
                    document.getElementById('footerWaLink').innerText = `+${waNumber}`; 
                    document.getElementById('footerWaLink').href = `tel:+${waNumber}`;
                }
                const waLinkText = `https://wa.me/${waNumber}?text=Halo%20Admin,%20saya%20ingin%20konsultasi%20servis.`;
                if(document.getElementById('btnFloatingWa')) document.getElementById('btnFloatingWa').href = waLinkText; 
                if(document.getElementById('btnReservasiWa')) document.getElementById('btnReservasiWa').href = waLinkText;
            }

            // Social Media
            if(document.getElementById('linkIg')) document.getElementById('linkIg').href = data.ig || '#'; 
            if(document.getElementById('linkTiktok')) document.getElementById('linkTiktok').href = data.tiktok || '#'; 
            if(document.getElementById('linkYoutube')) document.getElementById('linkYoutube').href = data.youtube || '#';
            if (!data.ig && document.getElementById('linkIg')) document.getElementById('linkIg').style.display = 'none'; 
            if (!data.tiktok && document.getElementById('linkTiktok')) document.getElementById('linkTiktok').style.display = 'none'; 
            if (!data.youtube && document.getElementById('linkYoutube')) document.getElementById('linkYoutube').style.display = 'none';

            // Sliders
            const sliderWrapper = document.getElementById('image-slider');
            if (sliderWrapper) {
                if (data.sliders && data.sliders.length > 0) {
                    sliderWrapper.innerHTML = data.sliders.map(url => `<img src="${antiBlokir(url)}" style="width:100%; height:100%; object-fit:cover; flex-shrink:0;" alt="Banner">`).join('');
                } else {
                    sliderWrapper.innerHTML = `<img src="images/servislaptop.jpg" style="width:100%; height:100%; object-fit:cover; flex-shrink:0;" alt="Banner"><img src="images/servishp.jpg" style="width:100%; height:100%; object-fit:cover; flex-shrink:0;" alt="Banner">`;
                }
                slides = sliderWrapper.querySelectorAll('img'); 
                if (slides.length > 1) { createDots(); startSlider(); }
            }

            // Layanan
            const layananGrid = document.getElementById('layanan-grid');
            const layananSection = layananGrid ? layananGrid.closest('.section') : null;
            if (layananGrid) {
                if (data.layanans && data.layanans.length > 0) {
                    if (layananSection) layananSection.style.display = '';
                    layananGrid.innerHTML = data.layanans.map(l => {
                        let safeIcon = l.icon ? l.icon.trim() : 'fa-tools';
                        safeIcon = safeIcon.replace('fas ', '').replace('fab ', '');
                        return `
                        <div class="card p-6 service-card" style="padding: 2rem;">
                            <div class="service-icon-wrapper"><i class="fas ${safeIcon}"></i></div>
                            <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${l.title}</h3>
                            <p style="color: var(--color-text-muted);">${l.desc}</p>
                        </div>
                        `;
                    }).join('');
                } else {
                    if (layananSection) layananSection.style.display = 'none';
                }
            }

            // Testimoni (Infinite Slider)
            const testimoniTrack = document.getElementById('testimoni-track');
            const testimoniSection = document.getElementById('testimoni-section');
            if (testimoniSection && testimoniTrack) {
                if (data.testimonis && data.testimonis.length > 0) {
                    testimoniSection.style.display = 'block';
                    
                    // Buat HTML ulasan
                    const testimoniHTML = data.testimonis.map(t => {
                        const rating = Number(t.rating) || 5;
                        let starsHtml = '';
                        for (let i = 1; i <= 5; i++) {
                            if (i <= rating) {
                                starsHtml += '<i class="fas fa-star"></i>';
                            } else {
                                starsHtml += '<i class="far fa-star"></i>';
                            }
                        }
                        return `
                        <div class="testimoni-card-slider">
                            <div style="color: #fbbf24; margin-bottom: 1rem;">
                                ${starsHtml}
                            </div>
                            <p style="font-style: italic; margin-bottom: 1.5rem; opacity: 0.9; color: #e2e8f0; min-height: 80px;">"${t.teks}"</p>
                            <div class="flex items-center gap-4">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                                    ${t.nama.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 style="margin:0; color: white;">${t.nama}</h4>
                                    <span style="font-size: 0.85rem; opacity: 0.7; color: #94a3b8;">${t.role}</span>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');

                    // Gandakan isi agar slider tidak terputus (Infinite effect)
                    testimoniTrack.innerHTML = testimoniHTML + testimoniHTML + testimoniHTML;
                    
                    // Sesuaikan kecepatan berdasarkan jumlah ulasan
                    const count = data.testimonis.length;
                    const duration = count * 10; // 10 detik per ulasan
                    testimoniTrack.style.animationDuration = `${duration}s`;
                    
                    // Update keyframe 100% agar pas sesuai jumlah ulasan
                    const style = document.createElement('style');
                    style.innerHTML = `@keyframes scrollTestimoni { 
                        0% { transform: translateX(0); } 
                        100% { transform: translateX(calc(-370px * ${count})); } 
                    }`;
                    document.head.appendChild(style);
                } else { 
                    testimoniSection.style.display = 'none'; 
                }
            }

            // Katalog
            const katalogGrid = document.getElementById('katalog-grid');
            const katalogSection = katalogGrid ? katalogGrid.closest('.section') : null;
            if (katalogGrid) {
                if (data.katalog && data.katalog.length > 0) {
                    if (katalogSection) katalogSection.style.display = '';
                    katalogGrid.innerHTML = data.katalog.map(p => {
                        const mediaHtml = p.img ? `<img src="${antiBlokir(p.img)}" alt="${p.nama}" style="width: 100%; height: 200px; object-fit: cover;">` : `<div style="height: 200px; display:flex; align-items:center; justify-content:center; background:#f1f5f9;"><i class="fas fa-desktop" style="font-size: 3rem; color:#cbd5e1;"></i></div>`;
                        const hargaHtml = p.harga > 0 ? `Rp ${p.harga.toLocaleString('id-ID')}` : `Menyesuaikan Budget`;
                        return `
                        <div class="card flex-col flex katalog-card">
                            ${mediaHtml}
                            <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                                <h3 style="margin-bottom: 0.5rem;">${p.nama}</h3>
                                <p style="color: var(--color-text-muted); font-size: 0.875rem; flex: 1; margin-bottom: 1rem;">${p.desc}</p>
                                <div style="color: var(--color-primary); font-weight: 700; font-size: 1.25rem; margin-bottom: 1rem;">${hargaHtml}</div>
                                <button onclick="beliViaWa('${p.nama}', ${p.harga})" class="btn btn-primary w-full" style="background-color: var(--color-success);">
                                    <i class="fab fa-whatsapp"></i> Pesan via WA
                                </button>
                            </div>
                        </div>
                        `;
                    }).join('');
                } else {
                    if (katalogSection) katalogSection.style.display = 'none';
                }
            }

            // Stats CMS-editable
            const stats = data.stats || {};
            const statEls = [
                { id: 'statTahun',     val: stats.tahun     || '5+',   label: null },
                { id: 'statPelanggan', val: stats.pelanggan || '500+', label: null },
                { id: 'statRating',    val: stats.rating    || '4.9★', label: null },
                { id: 'statGaransi',   val: stats.garansi   || '30H',  label: null },
            ];
            statEls.forEach(s => {
                const el = document.getElementById(s.id);
                if (el) el.textContent = s.val;
            });
        }
    } catch (error) { 
        console.error("Error CMS:", error); 
    }
}

// Track Service
window.currentTrackedService = null; 
window.currentTrackedCode = null;

window.trackService = async (kodeParam = null) => {
    const searchButton = document.getElementById('searchButton');
    const searchButtonText = document.getElementById('searchButtonText');
    const searchSpinner = document.getElementById('searchSpinner');
    const resultContainer = document.getElementById('resultContainer');
    const trackingContent = document.getElementById('trackingContent');

    const code = kodeParam || document.getElementById('serviceCode').value.trim().toUpperCase();
    if (!code) return;

    searchButtonText.textContent = 'Mencari...';
    searchSpinner.classList.remove('hidden');
    searchButton.disabled = true;

    resultContainer.classList.add('hidden');
    resultContainer.classList.remove('animate-fade-in');

    try {
        // Artificial delay 800ms agar efek loading spinner terlihat premium
        await new Promise(r => setTimeout(r, 800));

        const snapshot = await get(child(ref(db), `antrian/${code}`));
        if (snapshot.exists()) {
            const service = snapshot.val(); 
            window.currentTrackedService = service; 
            window.currentTrackedCode = code;
            
            let statusBadgeClass = '';
            switch (service.status) { 
                case 'Menunggu': statusBadgeClass = 'badge-waiting'; break; 
                case 'Proses': statusBadgeClass = 'badge-process'; break; 
                case 'Selesai': statusBadgeClass = 'badge-finished'; break; 
                case 'Diambil': statusBadgeClass = 'badge-pickedup'; break; 
                default: statusBadgeClass = 'badge-pickedup'; 
            }

            let fotoHtml = ''; 
            let rawFotos = service.fotoUrls || service.fotoUrl; 
            let safeFotoArray = [];
            
            if (Array.isArray(rawFotos)) safeFotoArray = rawFotos; 
            else if (typeof rawFotos === 'object' && rawFotos !== null) safeFotoArray = Object.values(rawFotos); 
            else if (typeof rawFotos === 'string') safeFotoArray = [rawFotos];

            if (safeFotoArray.length > 0) {
                let galleryHtml = safeFotoArray.map(url => `<a href="${antiBlokir(url)}" target="_blank" title="Klik untuk memperbesar"><img src="${antiBlokir(url)}" alt="Foto Service" style="width: 100%; height: 120px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border);"></a>`).join('');
                fotoHtml = `
                <div class="tracking-row">
                    <div class="tracking-label"><i class="fas fa-camera"></i> Lampiran Foto</div>
                    <div class="tracking-value"><div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">${galleryHtml}</div></div>
                </div>`;
            }

            let garansiHtml = '';
            if (service.garansi_sampai) {
                const now = new Date();
                const garansiDate = new Date(service.garansi_sampai);
                const formatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                if (now <= garansiDate) {
                    garansiHtml = `<div class="tracking-row" style="border-bottom:none;"><div class="tracking-label"><i class="fas fa-shield-alt" style="color:#10b981; background:rgba(16, 185, 129, 0.1);"></i> Garansi Digital</div><div class="tracking-value"><span style="color:#10b981; font-weight:bold;"><i class="fas fa-check-circle"></i> Aktif s.d ${formatter.format(garansiDate)}</span></div></div>`;
                } else {
                    garansiHtml = `<div class="tracking-row" style="border-bottom:none;"><div class="tracking-label"><i class="fas fa-shield-alt" style="color:#ef4444; background:rgba(239, 68, 68, 0.1);"></i> Garansi Digital</div><div class="tracking-value"><span style="color:#ef4444; font-weight:bold;"><i class="fas fa-times-circle"></i> Habis per ${formatter.format(garansiDate)}</span></div></div>`;
                }
            }

            let payStatus = service.payment_status || 'Belum Dibayar';
            let payBadgeClass = payStatus === 'Lunas' ? 'badge-finished' : 'badge-waiting';
            let payRow = `<div class="tracking-row"><div class="tracking-label"><i class="fas fa-credit-card" style="color:#3b82f6; background:rgba(59, 130, 246, 0.1);"></i> Status Pembayaran</div><div class="tracking-value"><span class="badge ${payBadgeClass}">${payStatus}</span></div></div>`;

            let payButtonHtml = '';
            if (service.status === 'Selesai' && payStatus !== 'Lunas' && service.biaya > 0) {
                const settings = window.tokoSettings || {};
                const tipePembayaran = settings.tipePembayaran || 'manual';

                if (tipePembayaran === 'otomatis') {
                    payButtonHtml = `
                    <div style="margin-top: 1rem;">
                        <button id="payOnlineBtn" onclick="payServiceOnline('${code}')" class="btn" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; width: 100%; padding: 14px; font-weight: 600; font-size: 1rem; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); transition: all 0.2s;"><i class="fas fa-wallet"></i> Bayar Sekarang (QRIS / E-Wallet / VA)</button>
                    </div>
                    `;
                } else {
                    // Manual Transfer / QRIS Statis -> Menggunakan Pop-up Modal untuk kerapian UI
                    payButtonHtml = `
                    <div style="margin-top: 1rem;">
                        <button id="payOnlineBtn" onclick="window.showManualPaymentModal('${code}', ${service.biaya}, '${settings.bcaNoRek || ''}', '${settings.bcaNama || ''}', '${settings.qrisUrl || ''}')" class="btn" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; width: 100%; padding: 14px; font-weight: 600; font-size: 1rem; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); transition: all 0.2s;"><i class="fas fa-wallet"></i> Bayar Sekarang (QRIS / Transfer BCA)</button>
                    </div>
                    `;
                }
            }

            trackingContent.innerHTML = `
                <style>
                    .tracking-row { display: flex; flex-direction: column; padding: 1rem 0; border-bottom: 1px solid var(--color-border); }
                    .tracking-label { font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
                    .tracking-label i { width: 30px; height: 30px; background: rgba(0,0,0,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                    .tracking-value { font-weight: 500; color: var(--color-text); }
                    @media(min-width: 768px){
                        .tracking-row { flex-direction: row; }
                        .tracking-label { width: 35%; margin-bottom: 0; }
                        .tracking-value { width: 65%; }
                    }
                </style>
                <div class="tracking-details">
                    <div class="tracking-row"><div class="tracking-label"><i class="fas fa-user"></i> Nama Pelanggan</div><div class="tracking-value">${escapeHTML(service.nama)}</div></div>
                    <div class="tracking-row"><div class="tracking-label"><i class="fas fa-laptop"></i> Jenis Device</div><div class="tracking-value">${escapeHTML(service.device) || '-'}</div></div>
                    <div class="tracking-row"><div class="tracking-label"><i class="fas fa-tools" style="color:var(--color-danger); background:rgba(239, 68, 68, 0.1);"></i> Kerusakan</div><div class="tracking-value">${escapeHTML(service.kerusakan)}</div></div>
                    ${service.keterangan ? `<div class="tracking-row"><div class="tracking-label"><i class="fas fa-info-circle" style="color:var(--color-info); background:rgba(59, 130, 246, 0.1);"></i> Catatan Teknisi</div><div class="tracking-value">${escapeHTML(service.keterangan)}</div></div>` : ''}
                    ${fotoHtml}
                    <div class="tracking-row"><div class="tracking-label"><i class="fas fa-money-bill-wave" style="color:var(--color-success); background:rgba(16, 185, 129, 0.1);"></i> Total Biaya</div><div class="tracking-value" style="font-size:1.25rem; font-weight:700; color:var(--color-primary);">${formatRupiah(service.biaya)}</div></div>
                    ${payRow}
                    <div class="tracking-row"><div class="tracking-label"><i class="fas fa-tasks" style="color:#8b5cf6; background:rgba(139, 92, 246, 0.1);"></i> Status Saat Ini</div><div class="tracking-value"><span class="badge ${statusBadgeClass}">${service.status}</span></div></div>
                    ${garansiHtml}
                </div>
                <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="printCustomerInvoice()" class="btn" style="background-color: var(--color-primary, #0d9488); color: white; width: 100%; padding: 14px; font-weight: 600; font-size: 1rem; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fas fa-file-download"></i> Download / Cetak Nota (PDF)</button>
                    ${payButtonHtml}
                </div>
            `;
        } else { 
            trackingContent.innerHTML = `<div style="background: rgba(239, 68, 68, 0.1); color: var(--color-danger); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem;"><i class="fas fa-exclamation-circle"></i> Invoice <b>${escapeHTML(code)}</b> tidak ditemukan.</div>`; 
        }
    } catch (error) { 
        trackingContent.innerHTML = `<div style="background: rgba(245, 158, 11, 0.1); color: var(--color-warning); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem;"><i class="fas fa-wifi"></i> Gangguan koneksi.</div>`; 
    } finally { 
        resultContainer.classList.remove('hidden'); 
        resultContainer.classList.add('animate-fade-in'); 
        searchButtonText.textContent = 'Lacak Sekarang'; 
        searchSpinner.classList.add('hidden'); 
        searchButton.disabled = false; 
    }
};

// Fungsi bayar online via Midtrans Redirect
window.payServiceOnline = async (orderId) => {
    const payBtn = document.getElementById('payOnlineBtn');
    if (!payBtn) return;

    const originalText = payBtn.innerHTML;
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan Pembayaran...';

    try {
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal membuat invoice pembayaran.');
        }

        if (data.redirect_url) {
            // Arahkan pelanggan ke halaman pembayaran Midtrans yang aman
            window.location.href = data.redirect_url;
        } else {
            throw new Error('URL pembayaran tidak diterima dari server.');
        }
    } catch (error) {
        console.error('Error payServiceOnline:', error);
        if (window.showSweetAlert) {
            window.showSweetAlert(error.message, 'error');
        } else {
            alert(error.message);
        }
        payBtn.disabled = false;
        payBtn.innerHTML = originalText;
    }
};

// Fungsi menampilkan Pop-up Modal Transfer Manual / QRIS
window.showManualPaymentModal = (code, amount, bcaNoRek, bcaNama, qrisUrl) => {
    let modal = document.getElementById('manualPayModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manualPayModal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            animation: kc-fade-in 0.25s ease-out;
            padding: 20px;
        `;
        // Tutup modal jika mengklik area background luar
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        document.body.appendChild(modal);
    }
    
    const formatRupiahVal = (angka) => { 
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka); 
    };

    let qrisImgHtml = qrisUrl 
        ? `<div style="text-align:center; margin-bottom: 1.25rem;"><img src="${antiBlokir(qrisUrl)}" alt="QRIS Toko" style="max-width: 210px; border-radius: 12px; border: 1px solid var(--color-border); padding: 8px; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: block; margin: 0 auto;"><p style="font-size:0.8rem; color:#64748b; margin-top:6px; font-weight: 500;">Scan QRIS di atas untuk membayar</p></div>` 
        : '';
    
    let transferHtml = bcaNoRek 
        ? `<div style="background: rgba(0,0,0,0.02); padding: 1rem; border-radius: 10px; border: 1px solid var(--color-border); margin-bottom: 1.25rem; text-align: left; font-size: 0.9rem;">
            <p style="margin: 0 0 0.5rem; font-weight: bold; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; color: var(--color-text);"><i class="fas fa-university" style="color:var(--color-primary);"></i> Transfer Bank</p>
            <p style="margin:0 0 0.25rem; color:var(--color-text-muted);">Bank: <b style="color:var(--color-text);">BCA</b></p>
            <p style="margin:0 0 0.25rem; color:var(--color-text-muted);">No. Rekening: <b style="color:var(--color-text); font-family: monospace; font-size: 1.15rem; letter-spacing: 0.5px;">${escapeHTML(bcaNoRek)}</b></p>
            <p style="margin:0; color:var(--color-text-muted);">Atas Nama: <b style="color:var(--color-text);">${escapeHTML(bcaNama || '')}</b></p>
           </div>` 
        : '';
    
    let pesanWA = `Halo Admin, saya ingin konfirmasi pembayaran untuk nomor invoice *${code}* sebesar *${formatRupiahVal(amount)}*.\n\nBerikut bukti transfer saya:`;
    let waUrl = `https://wa.me/${globalWaNumber}?text=${encodeURIComponent(pesanWA)}`;
    
    modal.innerHTML = `
        <style>
            @keyframes kc-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes kc-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .kc-pay-card {
                background: white;
                border-radius: 16px;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                animation: kc-slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
                position: relative;
                border: 1px solid var(--color-border);
            }
            body.dark-mode .kc-pay-card {
                background: #1e293b;
                color: #f8fafc;
                border-color: rgba(255,255,255,0.08);
            }
            body.dark-mode .kc-pay-card p, body.dark-mode .kc-pay-card label {
                color: #cbd5e1;
            }
            body.dark-mode .kc-pay-card b {
                color: white !important;
            }
        </style>
        <div class="kc-pay-card">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, var(--color-surface, #0f172a) 0%, var(--color-bg, #1e293b) 100%); padding: 1.25rem 1.5rem; color: white; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border);">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; color: white;"><i class="fas fa-wallet" style="color:var(--color-primary);"></i> Pembayaran Servis</h3>
                <button onclick="document.getElementById('manualPayModal').style.display='none'" style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; line-height: 1; transition: color 0.2s;">&times;</button>
            </div>
            
            <!-- Body -->
            <div style="padding: 1.5rem;">
                <div style="text-align: center; margin-bottom: 1.25rem;">
                    <span style="font-size: 0.8rem; color: var(--color-text-muted); display: block; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Total Tagihan</span>
                    <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-primary);">${formatRupiahVal(amount)}</span>
                </div>
                
                ${qrisImgHtml}
                ${transferHtml}
                
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 10px;">
                    <a href="${waUrl}" target="_blank" class="btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; width: 100%; padding: 14px; font-weight: 600; font-size: 1rem; border-radius: 10px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: all 0.2s; text-align: center;"><i class="fab fa-whatsapp"></i> Kirim Bukti Transfer WA</a>
                    <button onclick="document.getElementById('manualPayModal').style.display='none'" class="btn" style="background: var(--color-border); color: var(--color-text); width: 100%; padding: 12px; font-weight: 600; font-size: 0.95rem; border-radius: 10px; border: none; cursor: pointer;">Tutup</button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
};

const checkStatusForm = document.getElementById('checkStatusForm');
if (checkStatusForm) {
    checkStatusForm.addEventListener('submit', (e) => {
        e.preventDefault();
        window.trackService();
    });
}

// Print Invoice Customer
window.printCustomerInvoice = async () => {
    if (!window.currentTrackedService || !window.currentTrackedCode) return;
    const s = window.currentTrackedService;
    const code = window.currentTrackedCode;
    const tgl = new Date(s.timestamp || Date.now()).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const settings = window.tokoSettings || {};

    const printBiaya = s.biaya && s.biaya > 0 
        ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(s.biaya) 
        : "Menunggu pengecekan / Belum ditentukan";

    const scriptTag = '<scr' + 'ipt> setTimeout(() => window.print(), 800); </scr' + 'ipt>';

    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html lang="id"><head><title>Nota - ${escapeHTML(code)}</title><style>body { font-family: monospace; font-size: 14px; max-width: 80mm; margin: auto; padding:20px; } .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; } .header img { max-width: 80px; border-radius: 8px; } .header h1 { font-size: 22px; margin: 0 0 5px 0; } .header p { margin: 0; font-size: 12px; } .table-item { width: 100%; border-collapse: collapse; margin-top: 10px; } .table-item td { vertical-align: top; padding: 4px 0; } .table-item td:first-child { width: 35%; font-weight: bold; } .total-section { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin-top: 15px; text-align: right; } .total-section h2 { margin: 0; font-size: 18px; } .footer { text-align: center; font-size: 11px; margin-top: 20px; } @media print { @page { margin: 0; } body { margin: 1cm auto; max-width: 100%; } }</style></head><body><div class="header"><img src="${antiBlokir(settings.logoUrl)}" onerror="this.style.display='none'"><h1>${escapeHTML(settings.namaToko ? settings.namaToko.toUpperCase() : 'INVOICE')}</h1><p>${escapeHTML(settings.alamat || '')}</p><p>WhatsApp: ${escapeHTML(settings.wa || '')}</p></div><div class="content"><p><strong>Nota:</strong> ${escapeHTML(code)}</p><p><strong>Tgl :</strong> ${tgl}</p><table class="table-item"><tr><td>Pelanggan</td><td>: ${escapeHTML(s.nama)}</td></tr><tr><td>No. HP</td><td>: ${escapeHTML(s.nomorHp) || '-'}</td></tr><tr><td>Device</td><td>: ${escapeHTML(s.device)}</td></tr><tr><td>Keluhan</td><td>: ${escapeHTML(s.kerusakan)}</td></tr><tr><td>Status</td><td>: ${escapeHTML(s.status).toUpperCase()}</td></tr></table></div><div class="total-section"><p style="margin:0; font-size: 12px;">Total Tagihan:</p><h2>${printBiaya}</h2></div><div class="footer"><p>Terima kasih!</p><p><em>${escapeHTML(settings.teksGaransi || '')}</em></p></div>` + scriptTag + `</body></html>`);
    pw.document.close();
};

// Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    await loadWebsiteSettings(); 

    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');

    if (codeFromUrl) {
        showPage('tracking-page');
        document.getElementById('serviceCode').value = codeFromUrl.toUpperCase();
        setTimeout(() => {
            if (typeof window.trackService === 'function') {
                window.trackService(codeFromUrl.toUpperCase());
            }
        }, 600);
    } else {
        showPage('home-page');
    }
});

// --- Dark Mode Logic (Forced Dark Mode Only) ---
document.body.classList.add('dark-mode');


// ═══════════════════════════════
// FORM TESTIMONI PELANGGAN
// ═══════════════════════════════

// Star Rating Interaction
const starBtns = document.querySelectorAll('.star-btn');
const ratingInput = document.getElementById('ratingValue');
if (starBtns.length && ratingInput) {
    starBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const val = parseInt(btn.dataset.val);
            starBtns.forEach((b, i) => b.classList.toggle('active', i < val));
        });
        btn.addEventListener('click', () => {
            ratingInput.value = btn.dataset.val;
        });
    });
    document.getElementById('starRating')?.addEventListener('mouseleave', () => {
        const selected = parseInt(ratingInput.value);
        starBtns.forEach((b, i) => b.classList.toggle('active', i < selected));
    });
}

// Char Counter untuk textarea
const teksArea = document.getElementById('testimoniTeks');
const charCount = document.getElementById('charCount');
if (teksArea && charCount) {
    teksArea.addEventListener('input', () => {
        charCount.textContent = `${teksArea.value.length} / 300`;
        charCount.style.color = teksArea.value.length > 270
            ? 'var(--color-warning)' : 'var(--color-text-muted)';
    });
}

// Submit Form Testimoni → Firebase
const testimoniForm = document.getElementById('testimoniForm');
if (testimoniForm) {
    testimoniForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = parseInt(document.getElementById('ratingValue').value);
        if (!rating || rating < 1) {
            if (window.showSweetAlert) window.showSweetAlert('Silakan pilih rating bintang terlebih dahulu.', 'info');
            else alert('Silakan pilih rating bintang terlebih dahulu.');
            return;
        }
        const nama  = document.getElementById('testimoniNama').value.trim();
        const role  = document.getElementById('testimoniRole').value.trim() || 'Pelanggan';
        const teks  = document.getElementById('testimoniTeks').value.trim();
        const btn   = document.getElementById('submitTestimoniBtn');
        const btnTxt = document.getElementById('submitTestimoniBtnText');
        const spinner = document.getElementById('submitTestimoniSpinner');

        btn.disabled = true;
        btnTxt.innerHTML = 'Mengirim...';
        spinner.classList.remove('hidden');

        try {
            await push(ref(db, 'testimoni_pending'), {
                nama,
                role,
                teks,
                rating,
                timestamp: Date.now(),
                approved: false
            });
            // Tampilkan sukses
            testimoniForm.classList.add('hidden');
            document.getElementById('testimoniSuccess').classList.remove('hidden');
        } catch (err) {
            console.error('Error kirim testimoni:', err);
            if (window.showSweetAlert) window.showSweetAlert('Gagal mengirim ulasan. Coba lagi.', 'error');
            else alert('Gagal mengirim ulasan. Silakan coba lagi.');
        } finally {
            btn.disabled = false;
            btnTxt.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Ulasan';
            spinner.classList.add('hidden');
        }
    });
}

// Reset Form Testimoni
window.resetTestimoniForm = () => {
    const form = document.getElementById('testimoniForm');
    const success = document.getElementById('testimoniSuccess');
    if (form && success) {
        form.reset();
        document.getElementById('ratingValue').value = '0';
        document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
        if (charCount) charCount.textContent = '0 / 300';
        success.classList.add('hidden');
        form.classList.remove('hidden');
    }
};

// --- Logika Tombol Kembali ke Atas (Back to Top) ---
const backToTopBtn = document.getElementById('backToTopBtn');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
