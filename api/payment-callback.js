// API Endpoint: POST /api/payment-callback
// Deskripsi: Webhook handler yang dipanggil oleh Midtrans secara otomatis setelah pembayaran.
// Fitur Keamanan: Verifikasi Signature Key SHA-512.

import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima request POST' });
    }

    try {
        const notification = req.body;
        
        // Ambil data penting dari notifikasi Midtrans
        const {
            order_id,
            status_code,
            gross_amount,
            transaction_status,
            fraud_status,
            signature_key
        } = notification;

        const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;
        const dbUrl = process.env.FIREBASE_DATABASE_URL || 'https://website-track-service-default-rtdb.asia-southeast1.firebasedatabase.app';

        if (!midtransServerKey) {
            console.error('Konfigurasi error: MIDTRANS_SERVER_KEY belum diatur.');
            return res.status(500).json({ error: 'Server key tidak dikonfigurasi.' });
        }

        // 1. Verifikasi Keamanan: Cocokkan Signature Key
        // Rumus: sha512(order_id + status_code + gross_amount + ServerKey)
        const stringToHash = `${order_id}${status_code}${gross_amount}${midtransServerKey}`;
        const computedSignature = crypto.createHash('sha512').update(stringToHash).digest('hex');

        if (computedSignature !== signature_key) {
            console.warn(`[WARNING] Signature key tidak cocok untuk Order ID: ${order_id}`);
            return res.status(401).json({ error: 'Signature Key tidak valid' });
        }

        console.log(`[INFO] Webhook terverifikasi untuk Order ID: ${order_id}, Status: ${transaction_status}`);

        // 2. Ekstrak Kode Invoice asli dari order_id Midtrans (hapus suffix timestamp)
        // Format order_id di create-payment: KC-YYMMDD-HHMMSS-RANDOM-TIMESTAMP
        const orderIdParts = order_id.split('-');
        // Kita ambil 4 bagian pertama (KC, YYMMDD, HHMMSS, RANDOM)
        const invoiceCode = orderIdParts.slice(0, 4).join('-');

        // 3. Tentukan status pembayaran di database
        let paymentStatus = 'Belum Dibayar';
        let shouldUpdate = false;

        // Status sukses transaksi Midtrans
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            if (transaction_status === 'capture' && fraud_status === 'challenge') {
                // Untuk kartu kredit, jika challenge butuh approval manual, jangan set lunas dulu
                paymentStatus = 'Review (Challenge)';
            } else {
                paymentStatus = 'Lunas';
                shouldUpdate = true;
            }
        } else if (transaction_status === 'pending') {
            paymentStatus = 'Menunggu Pembayaran';
        } else if (transaction_status === 'deny' || transaction_status === 'expire' || transaction_status === 'cancel') {
            paymentStatus = 'Gagal';
            shouldUpdate = true;
        }

        // 4. Update status pembayaran di Firebase Realtime Database
        if (shouldUpdate || paymentStatus === 'Menunggu Pembayaran') {
            const fbResponse = await fetch(`${dbUrl}/antrian/${invoiceCode}.json`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_status: paymentStatus
                })
            });

            if (!fbResponse.ok) {
                console.error(`[ERROR] Gagal mengupdate status Firebase untuk invoice ${invoiceCode}`);
                return res.status(500).json({ error: 'Gagal update database Firebase.' });
            }

            console.log(`[SUCCESS] Invoice ${invoiceCode} berhasil diupdate ke status pembayaran: ${paymentStatus}`);
        }

        // Kirim status sukses ke Midtrans
        return res.status(200).json({ status: 'OK', message: 'Notifikasi berhasil diproses' });

    } catch (error) {
        console.error('Error payment-callback:', error);
        return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
}
