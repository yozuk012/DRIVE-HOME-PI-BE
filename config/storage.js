// config/storage.js
const path = require('path');
require('dotenv').config(); // Load environment variables dari .env

// Titik mount utama HDD 500GB Anda
const STORAGE_BASE_PATH = '/mnt/homedrive';

// Folder khusus untuk fitur "Sampah 28 Hari"
const TRASH_PATH = path.join(STORAGE_BASE_PATH, '.trash');

// Master Password untuk bypass lock folder
// Dibaca dari environment variable MASTER_LOCK_PASSWORD
// PENTING: Pastikan sudah set di file .env!
const MASTER_LOCK_PASSWORD = process.env.MASTER_LOCK_PASSWORD;

// Validasi: Pastikan Master Password sudah di-set
if (!MASTER_LOCK_PASSWORD) {
    console.warn('⚠️ [WARNING] MASTER_LOCK_PASSWORD belum di-set di file .env!');
    console.warn('⚠️ Fitur Master Password tidak akan berfungsi.');
    console.warn('⚠️ Silakan tambahkan MASTER_LOCK_PASSWORD=your_password di file .env');
} else {
    console.log('✅ [Config] Master Password berhasil dimuat dari .env');
}

module.exports = {
    STORAGE_BASE_PATH,
    TRASH_PATH,
    MASTER_LOCK_PASSWORD
};