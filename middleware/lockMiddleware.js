// middleware/lockMiddleware.js
const lockStorage = require('../utils/lockStorage');

/**
 * Middleware untuk mengecek apakah folder yang diakses di-lock
 * Mendukung berbagai field name: path, oldPath, sourcePath
 */
const checkFolderLock = async (req, res, next) => {
    try {
        // Ambil path dari berbagai kemungkinan field
        const folderPath = req.query.path || req.body.path || req.body.oldPath || req.body.sourcePath;
        
        if (!folderPath) {
            console.log('⚠️ [LockMiddleware] Tidak ada path yang diberikan, lanjutkan');
            return next(); // Tidak ada path, lanjutkan
        }
        
        console.log(`🔍 [LockMiddleware] Mengecek lock untuk: ${folderPath}`);
        
        // Cek apakah folder di-lock
        const isLocked = await lockStorage.isFolderLocked(folderPath);
        
        if (isLocked) {
            console.log(`🚫 [LockMiddleware] Akses ditolak: ${folderPath} (folder di-lock)`);
            return res.status(403).json({
                success: false,
                message: 'Folder ini dikunci. Masukkan password untuk mengakses.',
                isLocked: true,
                path: folderPath
            });
        }
        
        console.log(`✅ [LockMiddleware] Folder tidak di-lock: ${folderPath}`);
        next();
    } catch (error) {
        console.error('❌ [LockMiddleware] Error:', error.message);
        console.error('❌ [LockMiddleware] Stack:', error.stack);
        // Fail-open: jika error, tetap lanjutkan
        next();
    }
};

/**
 * Middleware untuk mengecek lock pada parent folder
 * Jika parent folder di-lock, child folder juga tidak bisa diakses
 * Mendukung berbagai field name: path, oldPath, sourcePath
 */
const checkParentLock = async (req, res, next) => {
    try {
        // Ambil path dari berbagai kemungkinan field
        const folderPath = req.query.path || req.body.path || req.body.oldPath || req.body.sourcePath;
        
        if (!folderPath) {
            console.log('⚠️ [LockMiddleware] Tidak ada path yang diberikan untuk parent check, lanjutkan');
            return next();
        }
        
        console.log(`🔍 [LockMiddleware] Mengecek parent lock untuk: ${folderPath}`);
        
        // Cek semua parent folder
        const parts = folderPath.split('/').filter(Boolean);
        let currentPath = '';
        
        for (const part of parts) {
            currentPath += '/' + part;
            const isLocked = await lockStorage.isFolderLocked(currentPath);
            
            if (isLocked) {
                console.log(`🚫 [LockMiddleware] Parent lock: ${folderPath} (parent ${currentPath} di-lock)`);
                return res.status(403).json({
                    success: false,
                    message: `Parent folder "${currentPath}" dikunci. Buka kunci parent terlebih dahulu.`,
                    isLocked: true,
                    lockedPath: currentPath
                });
            }
        }
        
        console.log(`✅ [LockMiddleware] Tidak ada parent yang di-lock: ${folderPath}`);
        next();
    } catch (error) {
        console.error('❌ [LockMiddleware] Error checkParentLock:', error.message);
        console.error('❌ [LockMiddleware] Stack:', error.stack);
        next();
    }
};

module.exports = {
    checkFolderLock,
    checkParentLock
};