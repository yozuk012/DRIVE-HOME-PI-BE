// controllers/storageController.js
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { STORAGE_BASE_PATH } = require('../config/storage');

// 1. FORMAT: Mengosongkan seluruh isi HDD secara permanen
const formatStorage = async (req, res) => {
    try {
        console.log('⚠️ [Storage] Memulai proses pengosongan seluruh HDD...');

        // Membaca seluruh isi folder root HDD (termasuk file hidden)
        const items = await fs.readdir(STORAGE_BASE_PATH);

        let deletedCount = 0;

        // Loop untuk menghapus setiap item (file/folder) satu per satu
        for (const item of items) {
            const itemPath = path.join(STORAGE_BASE_PATH, item);
            
            // fs.rm dengan parameter recursive & force akan melibas folder beserta isinya tanpa ampun
            await fs.rm(itemPath, { recursive: true, force: true });
            deletedCount++;
            console.log(`🗑️ [Storage] Menghapus: ${item}`);
        }

        console.log(`✅ [Storage] Total ${deletedCount} item root dihapus.`);

        // PENTING: Buat ulang folder .temp_upload setelah format
        // Ini diperlukan agar fitur upload tetap berfungsi setelah HDD dikosongkan
        const tempUploadPath = path.join(STORAGE_BASE_PATH, '.temp_upload');
        try {
            await fs.mkdir(tempUploadPath, { recursive: true });
            console.log('✅ [Storage] Folder .temp_upload berhasil dibuat ulang');
        } catch (mkdirError) {
            console.error('⚠️ [Storage] Gagal membuat folder .temp_upload:', mkdirError.message);
            // Tidak return error karena format sudah berhasil, ini hanya warning
        }

        // Buat juga folder .trash jika diperlukan (opsional, untuk fitur trash)
        const trashPath = path.join(STORAGE_BASE_PATH, '.trash');
        try {
            await fs.mkdir(trashPath, { recursive: true });
            console.log('✅ [Storage] Folder .trash berhasil dibuat ulang');
        } catch (mkdirError) {
            console.error('⚠️ [Storage] Gagal membuat folder .trash:', mkdirError.message);
        }

        res.json({
            success: true,
            message: 'Seluruh isi HDD berhasil dikosongkan secara permanen.'
        });
    } catch (error) {
        console.error('❌ [Storage Error]:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengosongkan HDD', 
            error: error.message 
        });
    }
};

// 2. INFO: Mendapatkan info penyimpanan HDD menggunakan command 'df'
const getStorageInfo = async (req, res) => {
    try {
        // Jalankan command 'df' untuk cek storage usage
        // -BG = output dalam GB
        // tail -1 = ambil baris terakhir saja
        exec(`df -BG "${STORAGE_BASE_PATH}" | tail -1`, (error, stdout, stderr) => {
            if (error) {
                console.error('[Storage Error]:', error.message);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Gagal membaca info storage', 
                    error: error.message 
                });
            }

            // Parse output df command
            // Format: Filesystem      Size  Used Avail Use% Mounted
            // Contoh: /dev/sda1       500G  125G  375G  25% /mnt/hdd
            const parts = stdout.trim().split(/\s+/);
            
            // Mengambil angka saja dan menghilangkan huruf 'G' bawaan output Linux
            const total = parseInt(parts[1]) || 500;      // Size (GB)
            const used = parseInt(parts[2]) || 0;         // Used (GB)
            const available = parseInt(parts[3]) || 0;    // Avail (GB)

            res.json({
                success: true,
                data: {
                    total: total,
                    used: used,
                    available: available,
                    percentage: total > 0 ? Math.round((used / total) * 100) : 0
                }
            });
        });
    } catch (error) {
        console.error('[Storage Controller Error]:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal membaca info storage', 
            error: error.message 
        });
    }
};

module.exports = { 
    formatStorage, 
    getStorageInfo 
};