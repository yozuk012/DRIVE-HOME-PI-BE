// routes/folderRoutes.js
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { checkFolderLock, checkParentLock } = require('../middleware/lockMiddleware');

/**
 * Middleware khusus untuk cek lock pada folder tujuan saat move
 * Ini diperlukan karena move folder melibatkan 2 path: source dan destination
 */
const checkMoveDestinationLock = async (req, res, next) => {
    try {
        const { targetPath } = req.body;
        
        if (!targetPath) {
            return next();
        }
        
        const lockStorage = require('../utils/lockStorage');
        
        // Cek apakah folder tujuan atau parent-nya di-lock
        const parts = targetPath.split('/').filter(Boolean);
        let currentPath = '';
        
        for (const part of parts) {
            currentPath += '/' + part;
            const isLocked = await lockStorage.isFolderLocked(currentPath);
            
            if (isLocked) {
                console.log(`🚫 [LockProtection] Move ditolak: tujuan ${targetPath} (parent ${currentPath} di-lock)`);
                return res.status(403).json({
                    success: false,
                    message: `Folder tujuan "${currentPath}" dikunci. Buka kunci terlebih dahulu.`,
                    isLocked: true,
                    lockedPath: currentPath
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('❌ [LockProtection] Error checkMoveDestinationLock:', error.message);
        next();
    }
};

// ============================================
// ROUTES DENGAN PROTEKSI LOCK
// ============================================

// [POST] /api/folders/create
// Proteksi: Tidak bisa buat folder di dalam folder yang di-lock
router.post('/create', checkParentLock, folderController.createFolder);

// [PUT] /api/folders/rename
// Proteksi: Cek folder itu sendiri dan parent-nya
router.put('/rename', checkFolderLock, checkParentLock, folderController.renameFolder);

// [DELETE] /api/folders/delete
// Proteksi: Cek folder itu sendiri dan parent-nya
router.delete('/delete', checkFolderLock, checkParentLock, folderController.deleteFolder);

// [PUT] /api/folders/move
// Proteksi: Cek parent folder asal + parent folder tujuan
router.put('/move', checkParentLock, checkMoveDestinationLock, folderController.moveFolder);

// [GET] /api/folders/download?path=/NamaFolder
// Proteksi: Cek folder itu sendiri dan parent-nya
router.get('/download', checkFolderLock, checkParentLock, folderController.downloadFolder);

module.exports = router;