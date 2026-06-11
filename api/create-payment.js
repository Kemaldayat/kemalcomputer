// API Endpoint: POST /api/create-payment
// Deskripsi: Membuat transaksi Midtrans secara aman dan mengembalikan redirect URL.

export default async function handler(req, res) {
    // Tangani preflight CORS (jika ada)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(455).json({ error: 'Hanya menerima request POST' });
    }

    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'orderId wajib dikirimkan' });
    }

    const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const dbUrl = process.env.FIREBASE_DATABASE_URL || 'https://website-track-service-default-rtdb.asia-southeast1.firebasedatabase.app';

    if (!midtransServerKey) {
        return res.status(500).json({ 
            error: 'Konfigurasi server bermasalah: MIDTRANS_SERVER_KEY belum diset di environment variable Vercel.' 
        });
    }

    try {
        // 1. Ambil data servis dari Firebase Realtime Database via REST API secara aman
        // Kebijakan keamanan: data nominal pembayaran diambil dari database, bukan dari input user di frontend.
        const fbResponse = await fetch(`${dbUrl}/antrian/${orderId}.json`);
        if (!fbResponse.ok) {
            return res.status(500).json({ error: 'Gagal mengambil data dari database Firebase.' });
        }
        
        const service = await fbResponse.json();
        if (!service) {
            return res.status(444).json({ error: `Invoice ${orderId} tidak ditemukan.` });
        }

        const amount = Number(service.biaya);
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Biaya servis belum ditentukan atau bernilai 0.' });
        }

        // 2. Tentukan Midtrans endpoint & headers
        const midtransHost = isProduction 
            ? 'https://app.midtrans.com' 
            : 'https://app.sandbox.midtrans.com';
        
        const authString = Buffer.from(midtransServerKey + ':').toString('base64');

        // Untuk mencegah error "order_id sudah diproses" di Midtrans jika user mengklik tombol bayar berulang kali,
        // kita tambahkan suffix timestamp pada order_id Midtrans.
        // Contoh: KC-260611-123456-XYZW-1718123456
        const midtransOrderId = `${orderId}-${Date.now()}`;

        // 3. Siapkan payload transaksi Midtrans
        const payload = {
            transaction_details: {
                order_id: midtransOrderId,
                gross_amount: amount
            },
            customer_details: {
                first_name: service.nama,
                phone: service.nomorHp || ''
            },
            item_details: [
                {
                    id: orderId,
                    price: amount,
                    quantity: 1,
                    name: `Servis Device: ${service.device || 'Perangkat Elektronik'}`
                }
            ],
            credit_card: {
                secure: true
            }
        };

        // 4. Request ke Midtrans Snap API
        const midtransResponse = await fetch(`${midtransHost}/snap/v1/transactions`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        const midtransData = await midtransResponse.json();
        
        if (!midtransResponse.ok) {
            return res.status(midtransResponse.status).json({ 
                error: 'Error dari Midtrans: ' + (midtransData.error_messages ? midtransData.error_messages.join(', ') : 'Gagal membuat transaksi.') 
            });
        }

        // Kembalikan token dan redirect URL
        return res.status(200).json({
            token: midtransData.token,
            redirect_url: midtransData.redirect_url
        });

    } catch (error) {
        console.error('Error create-payment:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan internal: ' + error.message });
    }
}
