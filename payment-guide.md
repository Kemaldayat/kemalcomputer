# Panduan Pembayaran

## Metode sementara

Selama akun DOKU masih dalam proses validasi, pembayaran dilakukan secara manual:

- Tagihan sampai dengan Rp500.000 dapat dibayar menggunakan QRIS statis atau transfer bank.
- Tagihan di atas Rp500.000 menampilkan pilihan transfer bank atau tunai di toko; QRIS tidak ditampilkan.
- Pelanggan menghubungi toko melalui WhatsApp dari popup pembayaran untuk konfirmasi. Admin perlu memverifikasi pembayaran dan memperbarui status menjadi **Lunas** secara manual.

Atur rekening bank dan unggah gambar QRIS di Dashboard pada bagian **Pengaturan > Metode Pembayaran Pelanggan**.

## Rencana QRIS dinamis DOKU

Opsi DOKU di Dashboard saat ini dinonaktifkan sampai validasi akun merchant selesai dan integrasi backend siap. Setelah aktif, integrasi perlu membuat permintaan pembayaran QRIS dinamis di server, menerima notifikasi pembayaran DOKU, memverifikasi notifikasi tersebut, lalu memperbarui status pembayaran di Firebase. Simpan kredensial merchant hanya sebagai environment variables server—jangan masukkan secret key ke frontend atau kirim melalui chat.
