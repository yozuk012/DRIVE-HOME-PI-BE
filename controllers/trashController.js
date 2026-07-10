// controllers/trashController.js
const fs = require('fs').promises;
const path = require('path');
const { TRASH_PATH } = require('../config/storage');
const { getSafePath } = require('../utils/pathHelper');

/**
 * 1. READ: Melihat isi tong sampah
 * GET /api/trash
 */
const getTrashItems = async (req, res) => {
    try {
        await fs.mkdir(TRASH_PATH, { recursive: true });

        const items = await fs.readdir(TRASH_PATH);
        const trashList = [];

        for (const item of items) {
            const itemPath = path.join(TRASH_PATH, item);
            const stats = await fs.stat(itemPath);

            trashList.push({
                trashName: item, // Nama yang sudah ada timestamp-nya
                isFolder: stats.isDirectory(),
                deletedAt: stats.mtime, // Waktu saat dipindah ke sampah
                size: stats.size
            });
        }

        res.json({ success: true, data: trashList });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal membaca tong sampah', error: error.message });
    }
};

/**
 * 2. RESTORE: Mengembalikan item ke folder utama
 * PUT /api/trash/restore
 */
const restoreItem = async (req, res) => {
    try {
        const { trashName, restoreDestination } = req.body; 
        // Contoh trashName: '1720194827192_PARTNER_IN_CRIME.png'
        // Contoh restoreDestination: '/Images'

        const trashItemPath = path.join(TRASH_PATH, trashName);
        const safeTargetDir = getSafePath(restoreDestination);

        await fs.access(trashItemPath);
        await fs.mkdir(safeTargetDir, { recursive: true });

        // Membersihkan angka timestamp dari nama file (Format Prefix & Suffix)
        const originalName = trashName.replace(/^\d+_/, '').replace(/_\d+$/, '');
        const finalRestorePath = path.join(safeTargetDir, originalName);

        await fs.rename(trashItemPath, finalRestorePath);

        res.json({ success: true, message: `Berhasil dikembalikan ke ${restoreDestination}/${originalName}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengembalikan item', error: error.message });
    }
};

/**
 * 3. DELETE: Menghapus permanen (Satu per satu)
 * DELETE /api/trash/delete
 */
const deletePermanent = async (req, res) => {
    try {
        const { trashName } = req.body;

        if (!trashName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parameter trashName wajib diberikan. Gunakan /api/trash/empty untuk mengosongkan semua.' 
            });
        }

        const trashItemPath = path.join(TRASH_PATH, trashName);
        
        // Validasi item ada
        await fs.access(trashItemPath);
        
        // Hapus permanen
        await fs.rm(trashItemPath, { recursive: true, force: true });
        
        console.log(`🗑️ [Trash] Item dihapus permanen: ${trashName}`);
        
        return res.json({ 
            success: true, 
            message: 'Item berhasil dihapus permanen',
            data: { trashName }
        });
    } catch (error) {
        console.error('❌ [Trash Delete Error]:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus permanen', 
            error: error.message 
        });
    }
};

/**
 * 4. EMPTY TRASH: Mengosongkan SEMUA isi tong sampah
 * DELETE /api/trash/empty
 * 
 * Fungsi baru yang lebih eksplisit dan aman untuk mengosongkan seluruh trash
 */
const emptyTrash = async (req, res) => {
    try {
        console.log('🧹 [Trash] Mengosongkan seluruh tong sampah...');
        
        // Pastikan folder trash ada
        await fs.mkdir(TRASH_PATH, { recursive: true });

        // Baca semua item di trash
        const items = await fs.readdir(TRASH_PATH);
        
        if (items.length === 0) {
            console.log('ℹ️ [Trash] Tong sampah sudah kosong');
            return res.json({ 
                success: true, 
                message: 'Tong sampah sudah kosong',
                data: {
                    deletedCount: 0,
                    freedSpace: 0
                }
            });
        }

        // Hitung total size sebelum dihapus (untuk info ke user)
        let totalFreedSpace = 0;
        const deletedItems = [];

        for (const item of items) {
            const itemPath = path.join(TRASH_PATH, item);
            
            try {
                const stats = await fs.stat(itemPath);
                totalFreedSpace += stats.size;
                
                // Hapus item
                await fs.rm(itemPath, { recursive: true, force: true });
                
                deletedItems.push({
                    name: item,
                    size: stats.size,
                    isFolder: stats.isDirectory()
                });
                
                console.log(`  ✓ Dihapus: ${item}`);
            } catch (itemError) {
                console.warn(`  ⚠️ Gagal menghapus: ${item} - ${itemError.message}`);
                // Lanjutkan ke item berikutnya, jangan stop semua proses
            }
        }

        console.log(`✅ [Trash] Berhasil mengosongkan ${deletedItems.length} item. Ruang dibebaskan: ${formatBytes(totalFreedSpace)}`);

        res.json({ 
            success: true, 
            message: `Berhasil mengosongkan ${deletedItems.length} item dari tong sampah`,
            data: {
                deletedCount: deletedItems.length,
                freedSpace: totalFreedSpace,
                freedSpaceFormatted: formatBytes(totalFreedSpace),
                deletedItems: deletedItems
            }
        });
    } catch (error) {
        console.error('❌ [Trash Empty Error]:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengosongkan tong sampah', 
            error: error.message 
        });
    }
};

/**
 * Helper: Format bytes ke string yang mudah dibaca
 */
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

module.exports = {
    getTrashItems,
    restoreItem,
    deletePermanent,
    emptyTrash
};