// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { STORAGE_BASE_PATH } = require('../config/storage');
const { checkFolderLock, checkParentLock } = require('../middleware/lockMiddleware');

// Konfigurasi Multer (Penyimpanan Sementara di HDD, bukan di RAM)
const tempUploadPath = path.join(STORAGE_BASE_PATH, '.temp_upload');

// Initial check: Buat folder .temp_upload saat server start
if (!fs.existsSync(tempUploadPath)) {
    try {
        fs.mkdirSync(tempUploadPath, { recursive: true });
        console.log('✅ [Multer] Folder .temp_upload berhasil dibuat saat startup');
    } catch (err) {
        console.error('❌ [Multer] Gagal membuat folder .temp_upload saat startup:', err.message);
    }
}

/**
 * Middleware: Pastikan folder .temp_upload ada sebelum setiap upload
 */
const ensureTempFolderExists = (req, res, next) => {
    try {
        if (!fs.existsSync(tempUploadPath)) {
            fs.mkdirSync(tempUploadPath, { recursive: true });
            console.log('✅ [Upload] Folder .temp_upload dibuat ulang (sebelumnya tidak ada)');
        }
        next();
    } catch (err) {
        console.error('❌ [Upload] Gagal membuat folder .temp_upload:', err.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Gagal membuat folder temporary untuk upload. Periksa permission folder.',
            error: err.message 
        });
    }
};

/**
 * Middleware: Proteksi khusus untuk endpoint VIEW dan DOWNLOAD
 * Cek apakah file yang diakses berada di dalam folder yang di-lock
 * Ini mencegah bypass lock via direct URL access
 */
const protectFileAccess = async (req, res, next) => {
    try {
        const filePath = req.query.path;
        
        if (!filePath) {
            return next();
        }
        
        // Import lockStorage di sini untuk menghindari circular dependency
        const lockStorage = require('../utils/lockStorage');
        
        // Cek apakah file itu sendiri berada di folder yang di-lock
        // Caranya: cek semua parent folder dari file tersebut
        const parts = filePath.split('/').filter(Boolean);
        let currentPath = '';
        
        for (const part of parts) {
            currentPath += '/' + part;
            const isLocked = await lockStorage.isFolderLocked(currentPath);
            
            if (isLocked) {
                console.log(`🚫 [LockProtection] Akses ditolak: ${filePath} (parent ${currentPath} di-lock)`);
                return res.status(403).json({
                    success: false,
                    message: `Folder "${currentPath}" dikunci. Masukkan password untuk mengakses.`,
                    isLocked: true,
                    lockedPath: currentPath
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('❌ [LockProtection] Error:', error.message);
        // Fail-open: jika error, tetap lanjutkan agar tidak blocking user
        next();
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempUploadPath);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        file.originalname = safeName; 
        cb(null, Date.now() + '-' + safeName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: Infinity
    }
});

// ============================================
// ROUTES DENGAN PROTEKSI LOCK
// ============================================

// GET /api/files - List files/folders dalam sebuah folder
// Proteksi: Cek parent folder agar tidak bisa list isi folder yang di-lock
router.get('/', checkParentLock, fileController.getFiles);

// POST /api/files/upload - Upload file
// Proteksi: Cek parent folder agar tidak bisa upload ke folder yang di-lock
router.post('/upload', 
    ensureTempFolderExists,
    checkParentLock, // <-- TAMBAHKAN: Cegah upload ke folder terkunci
    (req, res, next) => {
        upload.array('files')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                console.error('❌ Multer Error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ success: false, message: 'Ukuran file terlalu besar!' });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ success: false, message: 'Jumlah file terlalu banyak!' });
                }
                return res.status(400).json({ success: false, message: `Error upload: ${err.message}` });
            } else if (err) {
                console.error('❌ Unknown Upload Error:', err);
                return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses file.' });
            }
            next();
        });
    }, 
    fileController.uploadFiles
); 

// PUT /api/files/rename - Rename file/folder
// Proteksi: Cek folder asal dan parent-nya
router.put('/rename', checkFolderLock, checkParentLock, fileController.renameFile);

// PUT /api/files/move - Move file/folder
// Proteksi: Cek folder asal, parent asal, DAN folder tujuan
router.put('/move', checkParentLock, fileController.moveFile);

// DELETE /api/files/delete - Delete file/folder
// Proteksi: Cek folder itu sendiri dan parent-nya
router.delete('/delete', checkFolderLock, checkParentLock, fileController.deleteFile);

// GET /api/files/view - Preview file di browser
// Proteksi: protectFileAccess akan cek SEMUA parent folder
router.get('/view', protectFileAccess, fileController.viewFile);

// GET /api/files/download - Download file
// Proteksi: protectFileAccess akan cek SEMUA parent folder
router.get('/download', protectFileAccess, fileController.downloadFile);

module.exports = router;