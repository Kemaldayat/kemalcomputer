        import { db, auth, adminEmail, signOut, onAuthStateChanged, dbRef as ref, get, set, remove, onValue } from "./firebase-config.js";
        const IMGBB_API_KEY = "0f505a6d586e11b597f5a191a8c76f9f"; // Variabel harus di bawah import

        // JURUS ANTI BLOKIR IMGBB 
        const antiBlokir = (url) => {
            if (!url) return '';
            if (url.includes('ibb.co')) {
                return 'https://wsrv.nl/?url=' + encodeURIComponent(url);
            }
            return url;
        };
        // Utility: Escape HTML
        window.escapeHTML = (str) => String(str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));

        let servicesData = {}; let customersData = {}; let expensesData = {};
        window.financeChartInstance = null;
        let currentTabFilter = 'Semua';

        // Variabel CMS
        window.existingPhotos = []; window.pendingFiles = [];
        window.existingSliders = []; window.pendingSliders = [];
        window.tokoSettings = { namaToko: "Manajemen Servis", logoUrl: "images/logo.png", wa: "-", alamat: "-", warnaUtama: "#0d9488", teksGaransi: "*Garansi 1 minggu" };

        document.getElementById('financeMonthPicker').value = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        onAuthStateChanged(auth, async (user) => {
            if (user && user.email === adminEmail) {
                await loadWebsiteSettings();
                loadServices(); loadExpenses();
                if(window.loadInventory) window.loadInventory();

                // Catat setiap sesi akses dashboard ke Firebase
                try {
                    const logId = 'LOG-' + Date.now();
                    await set(ref(db, 'riwayat_login/' + logId), {
                        email: user.email,
                        waktu: new Date().toISOString(),
                        metode: user.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password'
                    });
                } catch(e) { console.warn("Gagal mencatat log akses:", e.code, e.message); }

            } else { window.location.href = 'login.html'; }
        });

        window.openTab = (tabId, element, titleText) => {
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
            element.classList.add('active'); document.getElementById(tabId).classList.add('active');
            document.getElementById('topbarTitle').innerText = titleText;
            const settingsTabs = ['tab-identitas', 'tab-tampilan', 'tab-sosmed', 'tab-sistem', 'tab-katalog'];
            if (settingsTabs.includes(tabId)) document.getElementById('floatingSaveBtn').classList.add('show');
            else document.getElementById('floatingSaveBtn').classList.remove('show');
            
            // Close sidebar on mobile after clicking a tab
            if(window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('open');
                document.querySelector('.sidebar-overlay').classList.remove('open');
            }
        };

        window.toggleSidebar = () => {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        };

        const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
            return new Promise((r) => {
                const reader = new FileReader(); reader.readAsDataURL(file);
                reader.onload = (e) => {
                    const img = new Image(); img.src = e.target.result;
                    img.onload = () => {
                        let w = img.width, h = img.height;
                        if (w > h && w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
                        else if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; }
                        const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
                        cvs.getContext('2d').drawImage(img, 0, 0, w, h);

                        let fileType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                        cvs.toBlob((b) => r(new File([b], file.name, { type: fileType })), fileType, quality);
                    };
                };
            });
        };

        // UPLOAD KE IMGBB
        window.uploadProductImage = async (inputElem) => {
            if (inputElem.files.length === 0) return;
            const file = inputElem.files[0]; const btn = inputElem.nextElementSibling; const textInput = inputElem.previousElementSibling;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
            try {
                let f = await compressImage(file, 600, 600, 0.8);
                const fd = new FormData(); fd.append('image', f);
                const res = await (await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd })).json();
                if (res.success) textInput.value = res.data.url; // Simpan URL asli ke input
            } catch (e) { window.showSweetAlert("Gagal upload foto.", "error"); console.log(e); }
            btn.innerHTML = '<i class="fas fa-upload"></i> Foto'; btn.disabled = false; inputElem.value = '';
        };

        window.addLayananUI = (icon = 'fa-laptop', title = '', desc = '') => {
            let safeIcon = icon ? icon.trim().replace('fas ', '').replace('fab ', '') : 'fa-desktop';
            const w = document.getElementById('layananWrapper');
            const html = `<div class="dynamic-item"><button type="button" onclick="this.parentElement.remove()" class="btn-remove-item" title="Hapus">×</button><div style="display:flex; gap:10px;"><input type="text" class="lay-icon" placeholder="Contoh: fa-laptop" value="${safeIcon}" style="width:30%; padding:8px; border:1px solid var(--border-color); border-radius:5px;"><input type="text" class="lay-title" placeholder="Judul Layanan" value="${title}" style="width:70%; padding:8px; border:1px solid var(--border-color); border-radius:5px;"></div><textarea class="lay-desc" placeholder="Deskripsi Singkat" style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:5px; margin-top:10px;">${desc}</textarea></div>`;
            w.insertAdjacentHTML('beforeend', html);
        };

        window.addTestimoniUI = (nama = '', role = '', teks = '', rating = 5) => {
            const w = document.getElementById('testimoniWrapper');
            const stars = [1,2,3,4,5].map(i =>
                `<label style="cursor:pointer; font-size:1.4rem; color: ${i <= rating ? '#f59e0b' : '#d1d5db'}; transition:color 0.15s;" title="${i} bintang" onclick="this.parentElement.dataset.rating='${i}'; this.parentElement.querySelectorAll('label').forEach((l,idx)=>l.style.color=idx<${i}?'#f59e0b':'#d1d5db')">&#9733;</label>`
            ).join('');
            const html = `<div class="dynamic-item"><button type="button" onclick="this.parentElement.remove()" class="btn-remove-item" title="Hapus">×</button><div style="display:flex; gap:10px; margin-bottom:10px;"><input type="text" class="test-nama" placeholder="Nama Pelanggan" value="${escapeHTML(nama)}" style="width:50%; padding:8px; border:1px solid var(--border-color); border-radius:5px;"><input type="text" class="test-role" placeholder="Pekerjaan" value="${escapeHTML(role)}" style="width:50%; padding:8px; border:1px solid var(--border-color); border-radius:5px;"></div><div class="test-rating-wrap" data-rating="${rating}" style="margin-bottom:8px;">${stars}</div><textarea class="test-teks" placeholder="Isi Ulasan/Review" style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:5px; margin-top:4px;">${escapeHTML(teks)}</textarea></div>`;
            w.insertAdjacentHTML('beforeend', html);
        };

        window.addKatalogUI = (nama = '', harga = '', img = '', desc = '') => {
            const w = document.getElementById('katalogWrapper');
            const inputStyle = `padding:10px; border:1px solid var(--border-color); border-radius:6px; background:var(--input-bg, var(--bg-secondary)); color:var(--text-color); font-family:inherit; font-size:0.95em; box-sizing:border-box;`;
            const html = `
            <div class="dynamic-item">
                <button type="button" onclick="this.parentElement.remove()" class="btn-remove-item" title="Hapus Produk">×</button>
                <div style="display:flex; gap:10px; margin-bottom:10px;">
                    <input type="text" class="prod-nama" placeholder="Paket / Tipe PC" value="${nama}" style="width:60%; ${inputStyle}">
                    <input type="number" class="prod-harga" placeholder="Harga (Cth: 3500000 / 0=Menyesuaikan)" value="${harga}" style="width:40%; ${inputStyle}">
                </div>
                <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                    <input type="text" class="prod-img" placeholder="Link Foto (Upload via tombol ->)" value="${img}" style="width:75%; ${inputStyle}">
                    <input type="file" accept="image/*" style="display:none;" onchange="uploadProductImage(this)">
                    <button type="button" class="btn btn-secondary" onclick="this.previousElementSibling.click()" style="width:25%; padding:10px; background:var(--primary-color); color:white; border-radius:6px; border:none; cursor:pointer;"><i class="fas fa-upload"></i> Foto</button>
                </div>
                <textarea class="prod-desc" placeholder="Deskripsi komponen PC..." style="width:100%; ${inputStyle} min-height:80px; resize:vertical;">${desc}</textarea>
            </div>`;
            w.insertAdjacentHTML('beforeend', html);
        };

        document.getElementById('setSliderFile').addEventListener('change', function (e) { if (e.target.files.length === 0) return; window.pendingSliders = window.pendingSliders.concat(Array.from(e.target.files)); renderSliderPreviews(); this.value = ''; });

        window.renderSliderPreviews = async () => {
            const c = document.getElementById('previewSliderContainer'); c.innerHTML = '';
            window.existingSliders.forEach((url, i) => {
                c.innerHTML += `<div class="photo-preview-item slider-box"><img src="${antiBlokir(url)}"><button type="button" class="remove-btn" onclick="remExSlider(${i})">×</button></div>`;
            });
            for (let i = 0; i < window.pendingSliders.length; i++) {
                const reader = new FileReader(); const res = await new Promise(r => { reader.onload = e => r(e.target.result); reader.readAsDataURL(window.pendingSliders[i]); });
                c.innerHTML += `<div class="photo-preview-item slider-box"><img src="${res}" style="opacity:0.6"><div class="badge-new">BARU</div><button type="button" class="remove-btn" onclick="remPenSlider(${i})">×</button></div>`;
            }
        };
        window.remExSlider = i => { window.existingSliders.splice(i, 1); renderSliderPreviews(); }; window.remPenSlider = i => { window.pendingSliders.splice(i, 1); renderSliderPreviews(); };

        async function loadWebsiteSettings() {
            try {
                const snapshot = await get(ref(db, 'pengaturan_toko'));
                if (snapshot.exists()) {
                    const data = snapshot.val();

                    if (data.namaToko) window.tokoSettings.namaToko = data.namaToko;
                    if (data.warnaUtama) document.documentElement.style.setProperty('--primary-color', data.warnaUtama);

                    document.getElementById('adminTitle').innerText = `Super Admin - ${window.tokoSettings.namaToko}`;
                    document.getElementById('sidebarNamaToko').innerText = window.tokoSettings.namaToko;

                    document.getElementById('setNamaToko').value = data.namaToko || '';
                    document.getElementById('setWa').value = data.wa || '';
                    document.getElementById('setAlamat').value = data.alamat || '';
                    document.getElementById('setMaps').value = data.maps || '';
                    document.getElementById('setHeadline').value = data.headline || '';
                    document.getElementById('setSubHeadline').value = data.subHeadline || '';
                    document.getElementById('setIg').value = data.ig || '';
                    document.getElementById('setTiktok').value = data.tiktok || '';
                    document.getElementById('setYoutube').value = data.youtube || '';
                    document.getElementById('setWarnaUtama').value = data.warnaUtama || '#0d9488';
                    document.getElementById('hexWarnaTeks').innerText = data.warnaUtama || '#0d9488';
                    document.getElementById('setTeksGaransi').value = data.teksGaransi || '';

                    document.getElementById('setNib').value = data.nib || '';
                    document.getElementById('setLegalitasDesc').value = data.legalitasDesc || '';

                    if (data.logoUrl) {
                        let logoAman = antiBlokir(data.logoUrl);
                        document.getElementById('previewLogo').src = logoAman;
                        document.getElementById('sidebarLogo').src = logoAman;
                        document.getElementById('faviconImg').href = logoAman;
                        document.getElementById('setLogoUrl').value = data.logoUrl;
                    }

                    if (data.sliders) { window.existingSliders = data.sliders; } else { window.existingSliders = []; }
                    window.pendingSliders = []; renderSliderPreviews();

                    document.getElementById('layananWrapper').innerHTML = '';
                    if (data.layanans && data.layanans.length > 0) {
                        data.layanans.forEach(l => addLayananUI(l.icon, l.title, l.desc));
                    } else {
                        addLayananUI('fa-desktop', 'Menjual & Perakitan Komputer', 'Sesuai budget...');
                        addLayananUI('fa-laptop-medical', 'Servis Laptop & PC', 'Perbaikan mati total...');
                    }

                    document.getElementById('testimoniWrapper').innerHTML = '';
                    if (data.testimonis && data.testimonis.length > 0) {
                        data.testimonis.forEach(t => addTestimoniUI(t.nama, t.role, t.teks, t.rating || 5));
                    }

                    // Fix 7: Load stats fields
                    const stats = data.stats || {};
                    if (document.getElementById('setStatTahun'))     document.getElementById('setStatTahun').value     = stats.tahun     || '';
                    if (document.getElementById('setStatPelanggan')) document.getElementById('setStatPelanggan').value = stats.pelanggan || '';
                    if (document.getElementById('setStatRating'))    document.getElementById('setStatRating').value    = stats.rating    || '';
                    if (document.getElementById('setStatGaransi'))   document.getElementById('setStatGaransi').value   = stats.garansi   || '';

                    document.getElementById('katalogWrapper').innerHTML = '';
                    if (data.katalog && data.katalog.length > 0) {
                        data.katalog.forEach(k => addKatalogUI(k.nama, k.harga, k.img, k.desc));
                    } else {
                        addKatalogUI('PC Admin Core i3', '3500000', '', 'Spesifikasi: Core i3 gen 4 Ram 4 Gb...');
                        addKatalogUI('PC Kantor Editing', '7500000', '', 'Spesifikasi: Core i3 gen 10 Ram 8 Gb SSD...');
                    }
                }
            } catch (error) { console.error("Gagal memuat pengaturan:", error); }
        }

        document.getElementById('setWarnaUtama').addEventListener('input', e => { document.getElementById('hexWarnaTeks').innerText = e.target.value; });

        document.getElementById('setLogoFile').addEventListener('change', async function (e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0]; document.getElementById('previewLogo').src = URL.createObjectURL(file);
                const btnSave = document.getElementById('btnSaveSettings'); btnSave.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Upload Logo..."; btnSave.disabled = true;
                try {
                    let f = await compressImage(file, 800, 800, 0.8);
                    const fd = new FormData(); fd.append('image', f);
                    const res = await (await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd })).json();
                    if (res.success) document.getElementById('setLogoUrl').value = res.data.url;
                } catch (err) { console.log(err); }
                btnSave.innerHTML = "<i class='fas fa-save'></i> Simpan Pengaturan CMS"; btnSave.disabled = false;
            }
        });

        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSaveSettings');
            btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Menyimpan..."; btn.disabled = true;

            let finalSliders = [...window.existingSliders];
            for (let i = 0; i < window.pendingSliders.length; i++) {
                try {
                    let f = await compressImage(window.pendingSliders[i], 1200, 800, 0.8);
                    const fd = new FormData(); fd.append('image', f);
                    const res = await (await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd })).json();
                    if (res.success) finalSliders.push(res.data.url);
                } catch (e) { console.log(e); }
            }

            const layanansArr = [];
            document.querySelectorAll('#layananWrapper .dynamic-item').forEach(el => {
                let rawIcon = el.querySelector('.lay-icon').value.trim().replace('fas ', '').replace('fab ', '');
                layanansArr.push({ icon: rawIcon, title: el.querySelector('.lay-title').value.trim(), desc: el.querySelector('.lay-desc').value.trim() });
            });

            const testimoniArr = [];
            document.querySelectorAll('#testimoniWrapper .dynamic-item').forEach(el => {
                const ratingVal = parseInt(el.querySelector('.test-rating-wrap')?.dataset.rating || 5);
                testimoniArr.push({
                    nama: el.querySelector('.test-nama').value.trim(),
                    role: el.querySelector('.test-role').value.trim(),
                    teks: el.querySelector('.test-teks').value.trim(),
                    rating: ratingVal
                });
            });

            const katalogArr = [];
            document.querySelectorAll('#katalogWrapper .dynamic-item').forEach(el => {
                katalogArr.push({ nama: el.querySelector('.prod-nama').value.trim(), harga: Number(el.querySelector('.prod-harga').value) || 0, img: el.querySelector('.prod-img').value.trim(), desc: el.querySelector('.prod-desc').value.trim() });
            });

            const dataToSave = {
                namaToko: document.getElementById('setNamaToko').value.trim(), logoUrl: document.getElementById('setLogoUrl').value || 'images/logo.png', nib: document.getElementById('setNib').value.trim(), legalitasDesc: document.getElementById('setLegalitasDesc').value.trim(),
                wa: document.getElementById('setWa').value.trim(), alamat: document.getElementById('setAlamat').value.trim(), maps: document.getElementById('setMaps').value.trim(), headline: document.getElementById('setHeadline').value.trim(), subHeadline: document.getElementById('setSubHeadline').value.trim(),
                ig: document.getElementById('setIg').value.trim(), tiktok: document.getElementById('setTiktok').value.trim(), youtube: document.getElementById('setYoutube').value.trim(), warnaUtama: document.getElementById('setWarnaUtama').value, teksGaransi: document.getElementById('setTeksGaransi').value.trim(),
                sliders: finalSliders, layanans: layanansArr, testimonis: testimoniArr, katalog: katalogArr,
                stats: {
                    tahun:     document.getElementById('setStatTahun')?.value.trim()     || '5+',
                    pelanggan: document.getElementById('setStatPelanggan')?.value.trim() || '500+',
                    rating:    document.getElementById('setStatRating')?.value.trim()    || '4.9★',
                    garansi:   document.getElementById('setStatGaransi')?.value.trim()   || '30H',
                }
            };

            try {
                await set(ref(db, 'pengaturan_toko'), dataToSave);
                showModal("Pengaturan CMS Berhasil Disimpan!", "info", () => { loadWebsiteSettings(); });
            } catch (err) { showModal("Gagal menyimpan pengaturan.", "info"); }
            btn.innerHTML = "<i class='fas fa-save'></i> Simpan Pengaturan CMS"; btn.disabled = false;
        });

        window.logoutAdmin = async () => { try { await signOut(auth); window.location.href = 'login.html'; } catch (error) { } };
        window.refreshData = () => { loadServices(); loadExpenses(); loadWebsiteSettings(); if(window.loadInventory) window.loadInventory(); };
        const formatRupiah = (angka) => { if (!angka || angka == 0) return "<span style='color:var(--text-light); font-size:0.9em;'>Rp 0</span>"; return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka); };

        window.loadServices = () => {
            onValue(ref(db, 'antrian'), (snapshot) => {
                const tableBody = document.getElementById('serviceTable').getElementsByTagName('tbody')[0];
                const customerTableBody = document.getElementById('customerTable').getElementsByTagName('tbody')[0];
                tableBody.innerHTML = ''; customerTableBody.innerHTML = '';
                servicesData = {}; customersData = {};

                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        const code = child.key; const s = child.val(); servicesData[code] = s;
                        let bClass = '';
                        switch (s.status) { case 'Menunggu': bClass = 'status-waiting'; break; case 'Proses': bClass = 'status-process'; break; case 'Selesai': bClass = 'status-finished'; break; case 'Diambil': bClass = 'status-picked-up'; break; }
                        let safeFotoArray = Array.isArray(s.fotoUrls) ? s.fotoUrls : (s.fotoUrls ? Object.values(s.fotoUrls) : (s.fotoUrl ? [s.fotoUrl] : []));
                        let dText = escapeHTML(s.device) || '-'; if (safeFotoArray.length > 0) dText += ` <span style="font-size:0.8em; color:var(--primary-color); font-weight:bold; margin-left:5px;"><i class="fas fa-image"></i> ${safeFotoArray.length}</span>`;
                        const row = tableBody.insertRow(); row.setAttribute('data-id', code); row.setAttribute('data-status', s.status);
                        row.innerHTML = `<td>${escapeHTML(s.nama)}</td><td>${dText}</td><td>${escapeHTML(s.kerusakan)}</td><td>${escapeHTML(s.nomorHp) || '-'}</td><td class="biaya-text">${formatRupiah(s.biaya)}</td><td class="biaya-text" style="color: var(--warning-color);">${formatRupiah(s.modal_komponen || 0)}</td><td class="status-column"><span class="status-badge ${bClass}">${s.status}</span></td><td>${escapeHTML(s.keterangan) || '-'}</td><td><strong style="color:var(--primary-color)">${escapeHTML(code)}</strong></td><td class="action-buttons action-column"><button class="icon-btn print-button" onclick="printInvoice('${code}')"><i class="fas fa-print"></i></button><button class="icon-btn whatsapp-button" onclick="sendWhatsappNotification('${code}')"><i class="fab fa-whatsapp"></i></button><button class="icon-btn edit-button" onclick="openEditModal('${code}')"><i class="fas fa-edit"></i></button><button class="icon-btn delete-button" onclick="deleteService('${code}')"><i class="fas fa-trash"></i></button></td>`;

                        const hp = s.nomorHp ? s.nomorHp.trim() : 'Tanpa Nomor';
                        if (!customersData[hp]) customersData[hp] = { nama: s.nama, hp: hp, totSrv: 0, totB: 0, riwayat: [] };
                        customersData[hp].totSrv += 1; customersData[hp].totB += (Number(s.biaya) || 0);
                        if (s.device && !customersData[hp].riwayat.includes(s.device)) customersData[hp].riwayat.push(s.device);
                    });
                    for (const k in customersData) {
                        const c = customersData[k]; const rBody = customerTableBody.insertRow();
                        const rBadges = c.riwayat.map(d => `<span style="background:var(--secondary-color); padding:4px 8px; border-radius:6px; font-size:0.85em; border:1px solid var(--border-color); margin-right:4px; display:inline-block; margin-bottom:4px;">${escapeHTML(d)}</span>`).join('');
                        rBody.innerHTML = `<td><strong>${escapeHTML(c.nama)}</strong></td><td>${escapeHTML(c.hp)}</td><td style="text-align: center;"><span class="status-badge" style="background-color:var(--info-color)">${c.totSrv} Kali</span></td><td class="biaya-text">${formatRupiah(c.totB)}</td><td style="white-space: normal; min-width: 200px;">${rBadges || '-'}</td><td class="action-column"><button class="btn btn-primary" style="padding: 8px 12px; font-size: 0.85em;" onclick="contactCustomer('${escapeHTML(c.hp)}', '${escapeHTML(c.nama)}')"><i class="fab fa-whatsapp"></i> Chat</button></td>`;
                    }
                }
                filterTableServices(); filterTableCustomers(); calculateFinance();
            });
        };

        window.loadExpenses = () => { onValue(ref(db, 'pengeluaran'), (snap) => { expensesData = {}; if (snap.exists()) { snap.forEach((c) => { expensesData[c.key] = c.val(); }); } calculateFinance(); }); };
        
        window.inventoryData = {};
        window.loadInventory = () => { onValue(ref(db, 'inventaris'), (snap) => { window.inventoryData = {}; if (snap.exists()) { snap.forEach((c) => { window.inventoryData[c.key] = c.val(); }); } window.filterTableInventory(); }); };
        window.currentInventoryCategory = 'Semua';
        window.filterInventoryByCategory = (cat, el) => {
            window.currentInventoryCategory = cat;
            document.querySelectorAll('#inventoryCategoryTabs .tab-btn').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            window.filterTableInventory();
        };

        window.filterTableInventory = () => {
            const tableBody = document.getElementById('inventoryTable').getElementsByTagName('tbody')[0]; tableBody.innerHTML = '';
            const search = (document.getElementById('searchInputInventory') ? document.getElementById('searchInputInventory').value.toLowerCase() : '');
            let count = 0;
            for (const key in window.inventoryData) {
                const item = window.inventoryData[key];
                
                let matchesCategory = false;
                const katLow = item.kategori ? item.kategori.toLowerCase() : '';
                if (window.currentInventoryCategory === 'Semua') matchesCategory = true;
                else if (window.currentInventoryCategory === 'Lainnya') {
                    matchesCategory = !['laptop', 'hp', 'pc'].includes(katLow);
                } else {
                    matchesCategory = katLow.includes(window.currentInventoryCategory.toLowerCase());
                }

                if(matchesCategory && (item.nama.toLowerCase().includes(search) || katLow.includes(search))) {
                    count++;
                    const row = tableBody.insertRow();
                    let stokColor = item.stok < 5 ? 'var(--danger-color)' : 'var(--text-color)';
                    row.innerHTML = `<td><strong>${escapeHTML(item.nama)}</strong></td><td>${escapeHTML(item.kategori)}</td><td style="text-align: center; color: ${stokColor}; font-weight: bold;">${item.stok}</td><td class="biaya-text">${formatRupiah(item.harga_modal)}</td><td class="action-buttons action-column"><button class="icon-btn print-button" onclick="openMutasiModal('${key}', '${escapeHTML(item.nama)}')" title="Mutasi Stok"><i class="fas fa-exchange-alt"></i></button><button class="icon-btn whatsapp-button" onclick="openRiwayatMutasiModal('${key}', '${escapeHTML(item.nama)}')" title="Riwayat Mutasi"><i class="fas fa-history"></i></button><button class="icon-btn edit-button" onclick="editInventory('${key}')" title="Edit Barang"><i class="fas fa-edit"></i></button><button class="icon-btn delete-button" onclick="deleteInventory('${key}')" title="Hapus"><i class="fas fa-trash"></i></button></td>`;
                }
            }
            if (count === 0) renderNoDataRow(tableBody, 'Data inventaris kosong atau tidak ditemukan.', 5);
        };
        window.openInventoryModal = () => { document.getElementById('inventoryForm').reset(); document.getElementById('invId').value = ''; document.getElementById('inventoryModalTitle').innerText = 'Tambah Barang Inventaris'; document.getElementById('inventoryModal').style.display = 'flex'; };
        window.closeInventoryModal = () => { document.getElementById('inventoryModal').style.display = 'none'; };
        window.editInventory = (key) => { 
            const item = window.inventoryData[key]; if(!item) return;
            document.getElementById('inventoryForm').reset();
            document.getElementById('inventoryModalTitle').innerText = 'Edit Barang Inventaris';
            document.getElementById('invId').value = key;
            document.getElementById('invNama').value = item.nama;
            document.getElementById('invKategori').value = item.kategori;
            document.getElementById('invStok').value = item.stok;
            document.getElementById('invModal').value = item.harga_modal;
            document.getElementById('inventoryModal').style.display = 'flex';
        };
        window.saveInventory = async () => {
            const id = document.getElementById('invId').value, nama = document.getElementById('invNama').value.trim(), kategori = document.getElementById('invKategori').value.trim(), stok = document.getElementById('invStok').value, modal = document.getElementById('invModal').value;
            if(!nama || !kategori || stok === '' || modal === '') {
                showModal('Semua kolom harus diisi!', 'info');
                return;
            }
            const data = { nama: nama, kategori: kategori, stok: Number(stok), harga_modal: Number(modal) };
            const targetId = id ? id : `INV-${Date.now()}`;
            try { 
                await set(ref(db, `inventaris/${targetId}`), data); 
                closeInventoryModal(); 
                showModal('Tersimpan!', 'info'); 
            } catch(e) {
                console.error(e);
                showModal('Gagal menyimpan: ' + e.message, 'info');
            }
        };
        window.deleteInventory = (key) => { showModal('Yakin hapus barang ini?', 'confirm', async () => { try { await remove(ref(db, `inventaris/${key}`)); showModal('Dihapus!', 'info'); } catch(e) {} }); };

        window.openMutasiModal = (key, nama) => {
            document.getElementById('mutasiForm').reset();
            document.getElementById('mutasiInvId').value = key;
            document.getElementById('mutasiInvNama').value = nama;
            document.getElementById('mutasiModal').style.display = 'flex';
        };
        window.closeMutasiModal = () => { document.getElementById('mutasiModal').style.display = 'none'; };
        window.saveMutasi = async () => {
            const id = document.getElementById('mutasiInvId').value;
            const nama = document.getElementById('mutasiInvNama').value;
            const jenis = document.getElementById('mutasiJenis').value;
            const jumlah = Number(document.getElementById('mutasiJumlah').value);
            const ket = document.getElementById('mutasiKeterangan').value.trim();
            
            if(!id || jumlah <= 0 || !ket) return showModal('Jumlah dan Keterangan wajib diisi dengan benar.', 'info');
            
            const item = window.inventoryData[id];
            if(!item) return showModal('Barang tidak ditemukan.', 'info');
            
            let stokBaru = item.stok;
            if (jenis === 'Masuk') stokBaru += jumlah;
            else if (jenis === 'Keluar') stokBaru -= jumlah;
            
            if(stokBaru < 0) return showModal('Stok tidak mencukupi untuk dikeluarkan sebanyak itu.', 'info');
            
            try {
                // Update stok di inventaris
                await set(ref(db, `inventaris/${id}/stok`), stokBaru);
                
                // Tambah histori ke mutasi_inventaris
                const mutasiId = `MUT-${Date.now()}`;
                const mutasiData = {
                    id_barang: id,
                    nama_barang: nama,
                    jenis: jenis,
                    jumlah: jumlah,
                    keterangan: ket,
                    tanggal: new Date().toISOString()
                };
                await set(ref(db, `mutasi_inventaris/${mutasiId}`), mutasiData);
                
                closeMutasiModal();
                showModal('Mutasi Stok Berhasil Disimpan.', 'info');
            } catch(e) { showModal('Gagal menyimpan mutasi: ' + e.message, 'info'); }
        };

        window.riwayatMutasiData = {};
        onValue(ref(db, 'mutasi_inventaris'), (snap) => {
            window.riwayatMutasiData = {};
            if(snap.exists()) {
                snap.forEach(c => { window.riwayatMutasiData[c.key] = c.val(); });
            }
        });

        window.openRiwayatMutasiModal = (key, nama) => {
            document.getElementById('riwayatNamaBarang').innerText = nama;
            const tbody = document.getElementById('riwayatMutasiTable').getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            
            let count = 0;
            const mutations = Object.values(window.riwayatMutasiData)
                                    .filter(m => m.id_barang === key)
                                    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
                                    
            for (const m of mutations) {
                count++;
                const row = tbody.insertRow();
                const color = m.jenis === 'Masuk' ? 'var(--success-color, #10b981)' : 'var(--danger-color, #ef4444)';
                let dText = '';
                try { dText = new Date(m.tanggal).toLocaleString('id-ID'); } catch(e) { dText = m.tanggal; }
                row.innerHTML = `<td>${escapeHTML(dText)}</td><td style="color:${color}; font-weight:bold;">${escapeHTML(m.jenis)}</td><td style="text-align:center;">${m.jumlah}</td><td>${escapeHTML(m.keterangan)}</td>`;
            }
            
            if(count === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-light);">Belum ada riwayat mutasi.</td></tr>`;
            }
            document.getElementById('riwayatMutasiModal').style.display = 'flex';
        };
        window.closeRiwayatMutasiModal = () => { document.getElementById('riwayatMutasiModal').style.display = 'none'; };

        window.calculateFinance = () => {
            const selMonthStr = document.getElementById('financeMonthPicker').value; if (!selMonthStr) return;
            const selYear = selMonthStr.split('-')[0]; document.getElementById('chartYearDisplay').innerText = selYear;
            let tInc = 0, tExp = 0, tModal = 0; let cInc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], cExp = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const eTable = document.getElementById('expenseTable').getElementsByTagName('tbody')[0]; eTable.innerHTML = ''; let eCount = 0;

            for (const k in servicesData) {
                const s = servicesData[k];
                if ((s.status === 'Selesai' || s.status === 'Diambil') && s.biaya && s.timestamp) {
                    if (s.timestamp.substring(0, 4) === selYear) cInc[parseInt(s.timestamp.substring(5, 7)) - 1] += Number(s.biaya);
                    if (s.timestamp.startsWith(selMonthStr)) {
                        tInc += Number(s.biaya);
                        tModal += Number(s.modal_komponen || 0);
                    }
                }
            }
            for (const k in expensesData) {
                const e = expensesData[k];
                if (e.tanggal) {
                    if (e.tanggal.substring(0, 4) === selYear) cExp[parseInt(e.tanggal.substring(5, 7)) - 1] += Number(e.nominal);
                    if (e.tanggal.startsWith(selMonthStr)) {
                        tExp += Number(e.nominal); eCount++;
                        eTable.insertRow().innerHTML = `<td>${e.tanggal}</td><td>${e.keterangan}</td><td class="biaya-text" style="color:var(--danger-color);">${formatRupiah(e.nominal)}</td><td class="action-buttons action-column"><button class="icon-btn delete-button" onclick="deleteExpense('${k}')"><i class="fas fa-trash"></i></button></td>`;
                    }
                }
            }
            if (eCount === 0) renderNoDataRow(eTable, `Belum ada pengeluaran di bulan ini.`, 4);
            document.getElementById('totalPendapatan').innerHTML = formatRupiah(tInc); document.getElementById('totalPengeluaran').innerHTML = formatRupiah(tExp);
            if(document.getElementById('totalModal')) document.getElementById('totalModal').innerHTML = formatRupiah(tModal);
            const laba = tInc - tModal - tExp; document.getElementById('labaBersih').innerHTML = formatRupiah(laba); document.getElementById('labaBersih').style.color = laba < 0 ? 'var(--danger-color)' : 'var(--text-color)';
            renderFinanceChart(cInc, cExp);
        };

        window.renderFinanceChart = (inc, exp) => {
            const ctx = document.getElementById('financeChart').getContext('2d');
            if (window.financeChartInstance) window.financeChartInstance.destroy();
            window.financeChartInstance = new Chart(ctx, { type: 'bar', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'], datasets: [{ label: 'Pendapatan', data: inc, backgroundColor: window.tokoSettings.warnaUtama, borderRadius: 6, barPercentage: 0.6 }, { label: 'Pengeluaran', data: exp, backgroundColor: '#ef4444', borderRadius: 6, barPercentage: 0.6 }] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: function (c) { let l = c.dataset.label || ''; if (l) l += ': '; if (c.parsed.y !== null) l += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(c.parsed.y); return l; } } } }, scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4] }, ticks: { callback: function (v) { if (v === 0) return '0'; if (v >= 1000000) return 'Rp ' + (v / 1000000) + ' Jt'; return v; } } } } } });
        };

        window.printInvoice = (code) => {
            const s = servicesData[code]; if (!s) return;
            const tgl = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            // Trik memecah tag script agar browser tidak bingung
            const scriptTag = '<scr' + 'ipt> setTimeout(() => window.print(), 800); </scr' + 'ipt>';
            const pw = window.open('', '_blank');
            pw.document.write(`<!DOCTYPE html><html lang="id"><head><title>Nota - ${code}</title><style>body { font-family: monospace; font-size: 14px; max-width: 80mm; margin: auto; padding:20px; } .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; } .header img { max-width: 80px; border-radius: 8px; } .header h1 { font-size: 22px; margin: 0 0 5px 0; } .header p { margin: 0; font-size: 12px; } .table-item { width: 100%; border-collapse: collapse; margin-top: 10px; } .table-item td { vertical-align: top; padding: 4px 0; } .table-item td:first-child { width: 35%; font-weight: bold; } .total-section { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin-top: 15px; text-align: right; } .total-section h2 { margin: 0; font-size: 18px; } .footer { text-align: center; font-size: 11px; margin-top: 20px; } @media print { @page { margin: 0; } body { margin: 1cm auto; max-width: 100%; } }</style></head><body><div class="header"><img src="${window.tokoSettings.logoUrl}" onerror="this.style.display='none'"><h1>${escapeHTML(window.tokoSettings.namaToko.toUpperCase())}</h1><p>${escapeHTML(window.tokoSettings.alamat)}</p><p>WhatsApp: ${escapeHTML(window.tokoSettings.wa)}</p></div><div class="content"><p><strong>Nota:</strong> ${escapeHTML(code)}</p><p><strong>Tgl :</strong> ${tgl}</p><table class="table-item"><tr><td>Pelanggan</td><td>: ${escapeHTML(s.nama)}</td></tr><tr><td>No. HP</td><td>: ${escapeHTML(s.nomorHp) || '-'}</td></tr><tr><td>Device</td><td>: ${escapeHTML(s.device)}</td></tr><tr><td>Keluhan</td><td>: ${escapeHTML(s.kerusakan)}</td></tr><tr><td>Status</td><td>: ${escapeHTML(s.status).toUpperCase()}</td></tr></table></div><div class="total-section"><p style="margin:0; font-size: 12px;">Total Tagihan:</p><h2>${formatRupiah(s.biaya)}</h2></div><div class="footer"><p>Terima kasih!</p><p><em>${escapeHTML(window.tokoSettings.teksGaransi)}</em></p></div>` + scriptTag + `</body></html>`);
            pw.document.close();
        };

        window.contactCustomer = (hp, nama) => { if (hp === 'Tanpa Nomor') return showModal('Nomor HP tidak tercatat.', 'info'); window.open(`https://wa.me/${hp}?text=${encodeURIComponent(`Halo Kak ${nama},\nTerima kasih sudah mempercayakan servis di ${window.tokoSettings.namaToko}...`)}`, '_blank'); };

        // PENGIRIMAN WHATSAPP CUSTOM KEMAL COMPUTER (ULTIMATE FIX EMOTICON)
        window.sendWhatsappNotification = (code) => {
            const s = servicesData[code]; if (!s) return;

            let pesanStatus = '';
            if (s.status === 'Menunggu') pesanStatus = 'masih menunggu antrean pengecekan.';
            else if (s.status === 'Proses') pesanStatus = 'saat ini sedang dalam proses pengerjaan oleh teknisi kami.';
            else if (s.status === 'Selesai') pesanStatus = 'sudah selesai dikerjakan dan siap untuk diambil.';
            else if (s.status === 'Diambil') pesanStatus = 'telah diambil. Terima kasih telah mempercayakan servis pada kami!';

            // Pisah pesan menjadi 2 bagian untuk diselipkan kode murni emoji di tengahnya
            let pesanBagian1 = `*Notifikasi |Kemal Computer| Service*\n*==============================*\nKepada Yth. ${s.nama},\nService-an anda ${s.device || 'Perangkat Elektronik'} dengan nomor invoice ${code}, ${pesanStatus}\n*==============================*\nUntuk Proses Tracking, Kamu bisa memantau melalui link dibawah ini. Terimakasih `;

            let pesanBagian2 = `\n_https://kemalcomputer.vercel.app/?code=${code}_`;

            // Kode murni URL untuk emoji ðŸ™ðŸ™ðŸ˜Š (Browser tidak akan merusaknya karena berupa teks biasa)
            let emotAman = "%F0%9F%99%8F%F0%9F%99%8F%F0%9F%98%8A";

            // Rakit link URL secara paksa
            let linkWA = `https://wa.me/${s.nomorHp}?text=${encodeURIComponent(pesanBagian1)}${emotAman}${encodeURIComponent(pesanBagian2)}`;

            window.open(linkWA, '_blank');
        };

        window.openExpenseModal = () => { document.getElementById('expenseForm').reset(); document.getElementById('expTanggal').value = new Date().toISOString().split('T')[0]; document.getElementById('expenseModal').style.display = 'flex'; }; window.closeExpenseModal = () => { document.getElementById('expenseModal').style.display = 'none'; };
        window.saveExpense = async () => { const t = document.getElementById('expTanggal').value, k = document.getElementById('expKeterangan').value.trim(), n = document.getElementById('expNominal').value; if (!t || !k || !n) return; try { await set(ref(db, `pengeluaran/EXP-${Date.now()}`), { tanggal: t, keterangan: k, nominal: Number(n) }); closeExpenseModal(); showModal('Tersimpan!', 'info'); } catch (e) { } };

        window.deleteExpense = (id) => { showModal(`Yakin hapus pengeluaran ini?`, "confirm", async () => { try { await remove(ref(db, `pengeluaran/${id}`)); showModal('Dihapus!', 'info'); } catch (e) { } }); };
        window.deleteService = (code) => { showModal(`Yakin hapus antrian ${code}?`, "confirm", async () => { try { await remove(ref(db, `antrian/${code}`)); showModal('Dihapus!', 'info'); } catch (e) { } }); };

        window.openEditModal = (code) => {
            const s = servicesData[code]; if (!s) return;
            document.getElementById('editKodeService').value = code; document.getElementById('editNama').value = s.nama; document.getElementById('editDevice').value = s.device || ''; document.getElementById('editKerusakan').value = s.kerusakan; document.getElementById('editNomorHp').value = s.nomorHp || ''; document.getElementById('editBiaya').value = s.biaya || ''; document.getElementById('editModalKomponen').value = s.modal_komponen || ''; document.getElementById('editStatus').value = s.status; document.getElementById('editKeterangan').value = s.keterangan || ''; document.getElementById('editFoto').value = '';
            document.getElementById('editGaransi').value = "0";
            if(s.status === 'Selesai' || s.status === 'Diambil') { document.getElementById('garansiGroup').style.display = 'block'; } else { document.getElementById('garansiGroup').style.display = 'none'; }
            let rf = s.fotoUrls || s.fotoUrl; window.existingPhotos = Array.isArray(rf) ? [...rf] : (typeof rf === 'object' && rf !== null ? Object.values(rf) : (typeof rf === 'string' ? [rf] : []));
            window.pendingFiles = []; renderPhotoPreviewsEdit(); document.getElementById('editModal').style.display = 'flex';
        };
        window.closeEditModal = () => document.getElementById('editModal').style.display = 'none';
        document.getElementById('editStatus').addEventListener('change', function() {
            if(this.value === 'Selesai' || this.value === 'Diambil') { document.getElementById('garansiGroup').style.display = 'block'; } else { document.getElementById('garansiGroup').style.display = 'none'; }
        });
        document.getElementById('editFoto').addEventListener('change', function (e) { if (e.target.files.length === 0) return; window.pendingFiles = window.pendingFiles.concat(Array.from(e.target.files)); renderPhotoPreviewsEdit(); this.value = ''; });
        window.renderPhotoPreviewsEdit = async () => { const c = document.getElementById('previewFotoContainer'); c.innerHTML = ''; window.existingPhotos.forEach((url, i) => { c.innerHTML += `<div class="photo-preview-item"><img src="${antiBlokir(url)}"><button type="button" class="remove-btn" onclick="removeExistingPhoto(${i})">&times;</button></div>`; }); for (let i = 0; i < window.pendingFiles.length; i++) { const reader = new FileReader(); const res = await new Promise(r => { reader.onload = e => r(e.target.result); reader.readAsDataURL(window.pendingFiles[i]); }); c.innerHTML += `<div class="photo-preview-item"><img src="${res}" style="opacity: 0.6;"><div class="badge-new">BARU</div><button type="button" class="remove-btn" onclick="removePendingPhoto(${i})">&times;</button></div>`; } };
        window.removeExistingPhoto = (i) => { window.existingPhotos.splice(i, 1); renderPhotoPreviewsEdit(); }; window.removePendingPhoto = (i) => { window.pendingFiles.splice(i, 1); renderPhotoPreviewsEdit(); };

        window.saveEdit = async () => {
            const code = document.getElementById('editKodeService').value, nm = document.getElementById('editNama').value.trim(), dv = document.getElementById('editDevice').value.trim(), kr = document.getElementById('editKerusakan').value.trim(), hp = document.getElementById('editNomorHp').value.trim(), by = document.getElementById('editBiaya').value.trim(), mk = document.getElementById('editModalKomponen').value.trim(), st = document.getElementById('editStatus').value, kt = document.getElementById('editKeterangan').value.trim(), gr = document.getElementById('editGaransi').value, btn = document.getElementById('btnSaveEdit');
            if (!nm || !dv || !kr || !hp || !st) return showModal('Wajib diisi semua!', 'info');
            btn.disabled = true;
            try {
                let fUrls = [...window.existingPhotos];
                for (let i = 0; i < window.pendingFiles.length; i++) {
                    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Foto ${i + 1}...`;
                    try {
                        let f = await compressImage(window.pendingFiles[i], 800, 800, 0.7);
                        const fd = new FormData(); fd.append('image', f);
                        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
                        const result = await response.json();
                        if (result.success) fUrls.push(result.data.url);
                    } catch (e) { console.log(e); }
                }
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
                const d = { nama: nm, device: dv, kerusakan: kr, nomorHp: hp, biaya: Number(by) || 0, modal_komponen: Number(mk) || 0, status: st, keterangan: kt, timestamp: servicesData[code]?.timestamp || new Date().toISOString() };
                if (servicesData[code]?.garansi_sampai) d.garansi_sampai = servicesData[code].garansi_sampai;
                if ((st === 'Selesai' || st === 'Diambil') && Number(gr) > 0) {
                    const now = new Date(); now.setDate(now.getDate() + Number(gr));
                    d.garansi_sampai = now.toISOString();
                } else if (st !== 'Selesai' && st !== 'Diambil') {
                    d.garansi_sampai = null;
                }
                if (fUrls.length > 0) { d.fotoUrls = fUrls; d.fotoUrl = fUrls[0]; } else { d.fotoUrls = null; d.fotoUrl = null; }
                const oldStatus = servicesData[code]?.status;
                await set(ref(db, `antrian/${code}`), d); showModal("Tersimpan!", "info"); closeEditModal();
                if(st === 'Selesai' && oldStatus !== 'Selesai') {
                    setTimeout(() => {
                        showModal(`Kirim notifikasi WhatsApp ke ${nm} bahwa servis sudah selesai?`, "confirm", () => {
                            window.sendWhatsappNotification(code);
                        });
                    }, 500);
                }
            } catch (e) { showModal("Gagal", "info"); } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan Data'; }
        };

        window.filterByTab = (status, el) => {
            currentTabFilter = status;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            window.filterTableServices();
        };

        window.filterTableServices = () => {
            const searchInput = document.getElementById('searchInputServices');
            const searchText = searchInput ? searchInput.value.toLowerCase() : '';
            const tbody = document.querySelector('#serviceTable tbody');
            if (!tbody) return;

            const noDataRows = tbody.querySelectorAll('.no-data-row');
            noDataRows.forEach(r => r.remove());

            const rows = tbody.querySelectorAll('tr');
            let hasVisibleData = false;

            rows.forEach(row => {
                const status = row.getAttribute('data-status');
                const matchesStatus = (currentTabFilter === 'Semua' || status === currentTabFilter);
                const matchesSearch = row.textContent.toLowerCase().includes(searchText);

                if (matchesStatus && matchesSearch) {
                    row.style.display = '';
                    hasVisibleData = true;
                } else {
                    row.style.display = 'none';
                }
            });

            if (!hasVisibleData && rows.length > 0) {
                const colCount = document.querySelector('#serviceTable thead tr').children.length;
                tbody.insertAdjacentHTML('beforeend', `<tr class="no-data-row"><td colspan="${colCount}" style="text-align:center; padding:30px; color:var(--text-light);"><i class="fas fa-box-open fa-2x" style="display:block;margin-bottom:10px"></i> Tidak ada data untuk kategori "${currentTabFilter}".</td></tr>`);
            }
        };

        window.filterTableCustomers = () => { const t = document.getElementById('searchInputCustomers').value.toLowerCase(), r = document.getElementById('customerTable').getElementsByTagName('tbody')[0].getElementsByTagName('tr'); let f = false, h = false; document.querySelector('#customerTable .no-data-row')?.remove(); for (let i = 0; i < r.length; i++) if (!r[i].classList.contains('no-data-row')) h = true; for (let i = 0; i < r.length; i++) { if (r[i].classList.contains('no-data-row')) continue; if (r[i].textContent.toLowerCase().includes(t)) { r[i].style.display = ""; f = true; } else r[i].style.display = "none"; } if (!f && h) renderNoDataRow(document.getElementById('customerTable').getElementsByTagName('tbody')[0], 'Tidak ditemukan.', 6, true); };
        const renderNoDataRow = (tb, msg, col, isS = false) => { tb.innerHTML += `<tr class="no-data-row"><td colspan="${col}" style="text-align:center; padding:30px; color:${isS ? 'var(--danger-color)' : 'var(--text-light)'};">${isS ? '<i class="fas fa-search"></i>' : '<i class="fas fa-box-open fa-2x" style="display:block;margin-bottom:10px"></i>'} ${msg}</td></tr>`; };

        const customModal = document.getElementById('customModal');
        window.showModal = (msg, type, cb) => {
            if (window.showSweetAlert) {
                window.showSweetAlert(msg, type, cb);
            } else {
                alert(msg);
                if(cb) cb();
            }
        };
        window.closeModal = () => {};

        // Riwayat Login Logic
        window.loginLogData = {};
        onValue(ref(db, 'riwayat_login'), (snap) => {
            window.loginLogData = {};
            if(snap.exists()) {
                snap.forEach(c => { window.loginLogData[c.key] = c.val(); });
            }
            window.renderLoginLog();
        });

        window.renderLoginLog = () => {
            const tbody = document.getElementById('loginLogTable')?.getElementsByTagName('tbody')[0];
            if (!tbody) return;
            tbody.innerHTML = '';
            
            const logs = Object.entries(window.loginLogData).map(([key, val]) => ({ key, ...val }))
                            .sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
                            
            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-light);">Belum ada riwayat akses.</td></tr>`;
                return;
            }

            for (const l of logs) {
                const row = tbody.insertRow();
                let dText = '';
                try { dText = new Date(l.waktu).toLocaleString('id-ID'); } catch(e) { dText = l.waktu; }
                const methodBadge = l.metode === 'Google' ? '<span class="status-badge" style="background:#4285F4"><i class="fab fa-google"></i> Google</span>' : '<span class="status-badge status-process"><i class="fas fa-envelope"></i> Email</span>';
                row.innerHTML = `<td>${escapeHTML(dText)}</td><td><strong>${escapeHTML(l.email)}</strong></td><td>${methodBadge}</td>`;
            }
        };

        window.clearLoginLog = () => {
            window.showSweetAlert('Yakin ingin membersihkan semua riwayat login?', 'confirm', async () => {
                try {
                    await remove(ref(db, 'riwayat_login'));
                    window.showSweetAlert('Riwayat dibersihkan!', 'success');
                } catch(e) { window.showSweetAlert('Gagal: ' + e.message, 'error'); }
            });
        };
        window.onclick = (e) => { 
            if (e.target == customModal || e.target == document.getElementById('editModal') || e.target == document.getElementById('expenseModal') || e.target == document.getElementById('mutasiModal') || e.target == document.getElementById('riwayatMutasiModal') || e.target == document.getElementById('inventoryModal') || e.target == document.getElementById('settingsModal')) { 
                closeModal(); closeEditModal(); closeExpenseModal(); 
                if(window.closeMutasiModal) closeMutasiModal();
                if(window.closeRiwayatMutasiModal) closeRiwayatMutasiModal();
                if(window.closeInventoryModal) closeInventoryModal();
                if(window.closeSettingsModal) closeSettingsModal();
            } 
        };

        // --- Dark Mode Logic ---
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            if (localStorage.getItem('darkMode') === 'enabled') {
                document.body.classList.add('dark-mode');
                darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                if (document.body.classList.contains('dark-mode')) {
                    localStorage.setItem('darkMode', 'enabled');
                    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                } else {
                    localStorage.setItem('darkMode', 'disabled');
                    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                }
            });
        }
