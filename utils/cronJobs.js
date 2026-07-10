const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { TRASH_PATH } = require('../config/storage');

const cleanOldTrash = async () => {
    try {
        console.log('🤖 [Cron] Memulai pengecekan rutin tong sampah...');
        await fs.mkdir(TRASH_PATH, { recursive: true });

        const items = await fs.readdir(TRASH_PATH);
        const now = Date.now();
        // 28 Hari dalam satuan milidetik
        const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000; 

        let deletedCount = 0;

        for (const item of items) {
            const itemPath = path.join(TRASH_PATH, item);
            const stats = await fs.stat(itemPath);

            // Hitung umur item sejak dipindahkan ke .trash
            const ageMs = now - stats.mtimeMs;

            if (ageMs > TWENTY_EIGHT_DAYS_MS) {
                // Hapus folder/file secara permanen
                await fs.rm(itemPath, { recursive: true, force: true });
                deletedCount++;
                console.log(`🗑️ [Cron] Dihapus permanen (Kadaluarsa >28 Hari): ${item}`);
            }
        }

        console.log(`✅ [Cron] Pengecekan selesai. ${deletedCount} item dihapus.`);
    } catch (error) {
        console.error('❌ [Cron] Gagal membersihkan tong sampah:', error.message);
    }
};

const startCronJobs = () => {
    // Penjadwalan: Berjalan setiap hari pada jam 00:00 (Tengah Malam)
    // Format: Menit Jam Tanggal Bulan Hari
    cron.schedule('0 0 * * *', cleanOldTrash);
    console.log('⏳ Cron Job "Trash Cleaner 28 Hari" telah diaktifkan');
};

module.exports = { startCronJobs };