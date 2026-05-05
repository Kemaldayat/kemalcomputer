import { db, auth, adminEmail, onAuthStateChanged, dbRef as ref, get, set } from "./firebase-config.js";

// Sinkronisasi Tema (Dark Mode)
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
}

// Pengecekan Akses Admin
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== adminEmail) {
        window.showSweetAlert("Anda tidak memiliki izin akses ke halaman ini.", "error", () => {
            window.location.href = 'login.html';
        });
    } else {
        // Begitu berhasil login, langsung tarik data pelanggan
        loadCustomerDatabase();
    }
});

// -------------------------------------------------------------
// LOGIKA AUTO-FILL (DARI NAMA -> NOMOR HP) + DROPDOWN LIST
// -------------------------------------------------------------
let databasePelanggan = {}; // Menyimpan data dengan key = nama huruf kecil
const datalistPelanggan = document.getElementById('listPelangganLama');
const inputNama = document.getElementById('inputNama');
const inputNomorHp = document.getElementById('inputNomorHp');
const badgeAutofill = document.getElementById('badgeAutofill');

// Fungsi mengambil seluruh nama & no HP dari Firebase
async function loadCustomerDatabase() {
    try {
        const snapshot = await get(ref(db, 'antrian'));
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.nama && data.nomorHp) {
                    const nameKey = data.nama.toLowerCase().trim();
                    // Menyimpan data terbaru ke dalam object (supaya unik)
                    databasePelanggan[nameKey] = {
                        namaAsli: data.nama,
                        nomorHp: data.nomorHp
                    };
                }
            });

            // Memasukkan nama-nama tersebut ke dalam datalist
            for (const key in databasePelanggan) {
                const option = document.createElement('option');
                option.value = databasePelanggan[key].namaAsli;
                datalistPelanggan.appendChild(option);
            }
        }
    } catch (error) {
        console.error("Gagal load data pelanggan:", error);
    }
}

// Listener saat Abang mengetik atau memilih nama
if (inputNama && badgeAutofill && inputNomorHp) {
    inputNama.addEventListener('input', () => {
        const namaDiketik = inputNama.value.toLowerCase().trim();
        badgeAutofill.style.display = 'none';

        // Cek apakah nama yang diketik persis ada di databasePelanggan
        if (databasePelanggan[namaDiketik]) {
            // Jika ketemu, otomatis isi nomor HP-nya
            inputNomorHp.value = databasePelanggan[namaDiketik].nomorHp;
            
            // Tampilkan badge hijau & kasih animasi background
            badgeAutofill.style.display = 'inline-flex';
            inputNomorHp.style.backgroundColor = '#dcfce7';
            setTimeout(() => { inputNomorHp.style.backgroundColor = 'var(--secondary-color)'; }, 1000);
        }
    });
}
// -------------------------------------------------------------

function generateServiceCode() {
    const now = new Date();
    const year = now.getFullYear().toString().substring(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `KC-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

const addServiceForm = document.getElementById('addServiceForm');
if (addServiceForm) {
    addServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = document.getElementById('btnSubmit');
        const nama = document.getElementById('inputNama').value.trim();
        const device = document.getElementById('inputDevice').value.trim();
        const kerusakan = document.getElementById('inputKerusakan').value.trim();
        const nomorHp = inputNomorHp.value.trim();
        const status = document.getElementById('inputStatus').value;
        const biaya = document.getElementById('inputBiaya').value.trim();
        const modalKomponen = document.getElementById('inputModalKomponen').value.trim();
        const keterangan = document.getElementById('inputKeterangan').value.trim();

        if (!/^\d+$/.test(nomorHp) || !nomorHp.startsWith('62')) {
            window.showSweetAlert('Nomor HP tidak valid. Wajib diawali 62 dan hanya angka (Contoh: 62812...).', 'error');
            inputNomorHp.focus();
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        const serviceCode = generateServiceCode();

        try {
            await set(ref(db, `antrian/${serviceCode}`), {
                nama: nama,
                device: device,
                kerusakan: kerusakan,
                nomorHp: nomorHp,
                status: status,
                biaya: Number(biaya) || 0,
                modal_komponen: Number(modalKomponen) || 0,
                keterangan: keterangan,
                timestamp: new Date().toISOString()
            });
            
            window.showSweetAlert(`Data sukses disimpan! Nomor Invoice: ${serviceCode}`, 'success', () => {
                window.location.href = 'dashboard.html';
            });

        } catch (error) {
            window.showSweetAlert('Gagal menambahkan layanan. Periksa koneksi internet Anda.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-save"></i> Simpan Data Servis';
        }
    });
}
