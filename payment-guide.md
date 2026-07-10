# Panduan Konfigurasi Payment Gateway Midtrans (Vercel Serverless)

Panduan ini menjelaskan langkah-langkah untuk mengaktifkan, mengonfigurasi, dan menguji integrasi Payment Gateway **Midtrans** pada aplikasi Kemal Computer yang berjalan di atas hosting **Vercel** dan menggunakan **Firebase Realtime Database**.

---

## Ringkasan Alur Pembayaran
1. Pelanggan melacak status servis mereka di beranda web.
2. Jika status servis sudah **"Selesai"** dan status pembayaran **"Belum Dibayar"**, tombol **"Bayar Sekarang"** akan muncul.
3. Saat diklik, frontend memanggil serverless endpoint `/api/create-payment`.
4. Serverless endpoint akan menginisialisasi transaksi di Midtrans secara aman (menyembunyikan Server Key) dan mengembalikan URL pembayaran.
5. Pelanggan dialihkan ke halaman checkout Midtrans yang aman untuk membayar (QRIS, E-Wallet, atau Transfer Bank).
6. Setelah pembayaran selesai, Midtrans mengirim notifikasi webhook (callback) ke `/api/payment-callback`.
7. Webhook memverifikasi tanda tangan transaksi, lalu secara otomatis memperbarui status pembayaran servis di Firebase menjadi **"Lunas"**.

---

## Langkah 1: Registrasi Akun Midtrans
1. Buka situs [Midtrans](https://midtrans.com/) dan daftar akun baru.
2. Saat pertama kali masuk, Anda akan berada di mode **Sandbox** (Lingkungan Uji Coba). Ini sangat bagus untuk testing pembayaran gratis.
3. Di Dashboard Midtrans, masuk ke menu **Settings** > **Access Keys**.
4. Catat Key berikut:
   * **Merchant ID**
   * **Client Key** (Digunakan jika Anda membutuhkan integrasi client-side, namun tidak wajib untuk alur redirect kami)
   * **Server Key** (Ini adalah key rahasia yang wajib dijaga keamanannya)

---

## Langkah 2: Setup Environment Variables di Vercel
Agar backend serverless kami di folder `/api` dapat berjalan dan terhubung dengan Midtrans & Firebase, Anda harus mengonfigurasi variabel lingkungan di dasbor proyek Vercel Anda.

1. Buka dasbor [Vercel](https://vercel.com/) dan pilih proyek web Kemal Computer Anda.
2. Pergi ke tab **Settings** > **Environment Variables**.
3. Tambahkan variabel-variabel berikut:

| Nama Variabel | Nilai Contoh / Deskripsi |
| :--- | :--- |
| `MIDTRANS_SERVER_KEY` | *Server Key yang didapatkan dari dashboard Midtrans Sandbox atau Production.* |
| `MIDTRANS_IS_PRODUCTION` | `false` *(Gunakan `false` untuk Sandbox, ubah ke `true` jika sudah live/Production).* |
| `FIREBASE_DATABASE_URL` | `https://website-track-service-default-rtdb.asia-southeast1.firebasedatabase.app` *(URL Firebase database Anda).* |

4. Klik **Save** pada setiap variabel.
5. Lakukan **Redeploy** proyek Anda di Vercel agar perubahan variabel lingkungan tersebut diterapkan.

---

## Langkah 3: Mengatur Webhook Notification di Midtrans
Agar Midtrans dapat mengabari server Anda secara otomatis ketika pelanggan menyelesaikan pembayaran, Anda harus mendaftarkan URL callback di dasbor Midtrans.

1. Buka dashboard Midtrans Anda.
2. Pergi ke menu **Settings** > **Configuration**.
3. Cari kolom **Payment Integration** > **Payment Notification URL**.
4. Masukkan URL domain Vercel Anda ditambahkan `/api/payment-callback`.
   * *Contoh Sandbox:* `https://kemalcomputer.vercel.app/api/payment-callback`
5. Atur **Transaction Status Association** jika diperlukan (biasanya default sudah cukup).
6. Klik **Update** atau **Save** di bagian bawah halaman Midtrans.

---

## Langkah 4: Uji Coba Transaksi (Sandbox)
Untuk memastikan sistem bekerja 100%:

1. Masuk ke halaman Admin (`/login.html` lalu ke `/admin.html`).
2. Buat data servis baru dengan status **"Selesai"** dan status pembayaran **"Belum Dibayar"** (masukkan estimasi biaya, misal `150000`).
3. Cari kode invoice-nya di dashboard admin atau catat (misal: `KC-260611-193444-RAND`).
4. Buka halaman utama web (`index.html`) dan lakukan pelacakan kode servis tersebut.
5. Anda akan melihat baris baru **Status Pembayaran: Belum Dibayar** dan tombol biru **"Bayar Sekarang"**.
6. Klik tombol tersebut. Tombol akan loading sejenak lalu mengalihkan Anda ke halaman pembayaran Midtrans Sandbox.
7. Pilih metode **QRIS** atau **Bank Transfer** (Virtual Account).
8. **Untuk QRIS Simulator**: Anda bisa mengunduh kode QR atau menggunakan Simulator QRIS Midtrans dengan mengunggah gambar QR-nya.
9. **Untuk Virtual Account Simulator**: Buka halaman [Midtrans Sandbox Simulator](https://simulator.sandbox.midtrans.com/), pilih bank yang sesuai, salin nomor VA yang diberikan Midtrans, lalu lakukan simulasi transfer sukses.
10. Setelah pembayaran dinyatakan sukses di simulator, kembali ke halaman pelacakan web Anda dan lacak ulang kode servis tersebut.
11. Verifikasi bahwa status pembayaran telah berubah otomatis menjadi **"Lunas"** dan tombol pembayaran telah hilang dari tampilan pelanggan.
12. Di dashboard admin, kolom status pembayaran juga akan otomatis terupdate sebagai **Lunas**.

---

## Catatan Keamanan Firebase Database Rules
Jika Firebase Realtime Database Anda diatur dengan aturan read/write publik (default bawaan template awal), webhook ini akan bekerja instan. Namun, jika database Anda memiliki aturan security rules yang ketat, pastikan Anda menambahkan token auth atau memberikan izin menulis untuk endpoint eksternal. Secara umum, aturan default template ini mendukung write instan REST API.
