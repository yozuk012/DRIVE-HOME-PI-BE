// controllers/lockController.js
const lockStorage = require('../utils/lockStorage');
const { getSafePath } = require('../utils/pathHelper');
const fs = require('fs').promises;

/**
 * POST /api/locks
 * Lock sebuah folder dengan password
 */
const lockFolder = async (req, res) => {
    try {
        const { path: folderPath, password } = req.body;
        
        if (!folderPath || !password) {
            return res.status(400).json({
                success: false,
                message: 'Path dan password wajib diisi'
            });
        }
        
        const resolvedPath = getSafePath(folderPath);
        
        try {
            const stat = await fs.stat(resolvedPath);
            if (!stat.isDirectory()) {
                return res.status(400).json({
                    success: false,
                    message: 'Path yang diberikan bukan folder'
                });
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    message: 'Folder tidak ditemukan'
                });
            }
            throw err;
        }
        
        const result = await lockStorage.lockFolder(folderPath, password);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ [LockController] Error lockFolder:', error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal mengunci folder',
            error: error.message
        });
    }
};

/**
 * DELETE /api/locks
 * Unlock sebuah folder dengan password
 * Support: Password biasa ATAU Master Password
 */
const unlockFolder = async (req, res) => {
    try {
        const { path: folderPath, password } = req.body;
        
        if (!folderPath || !password) {
            return res.status(400).json({
                success: false,
                message: 'Path dan password wajib diisi'
            });
        }
        
        const result = await lockStorage.unlockFolder(folderPath, password);
        
        if (result.success) {
            res.json(result);
        } else {
            const statusCode = result.message === 'Password salah' ? 401 : 400;
            res.status(statusCode).json(result);
        }
    } catch (error) {
        console.error('❌ [LockController] Error unlockFolder:', error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal membuka kunci folder',
            error: error.message
        });
    }
};

/**
 * PUT /api/locks/password
 * Ubah password folder yang sudah di-lock
 * Support: oldPassword bisa berupa password biasa ATAU Master Password
 */
const changePassword = async (req, res) => {
    try {
        const { path: folderPath, oldPassword, newPassword } = req.body;
        
        if (!folderPath || !oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Path, password lama, dan password baru wajib diisi'
            });
        }
        
        const result = await lockStorage.changeLockPassword(
            folderPath, 
            oldPassword, 
            newPassword
        );
        
        if (result.success) {
            res.json(result);
        } else {
            const statusCode = result.message === 'Password lama salah' ? 401 : 400;
            res.status(statusCode).json(result);
        }
    } catch (error) {
        console.error('❌ [LockController] Error changePassword:', error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal mengubah password',
            error: error.message
        });
    }
};

/**
 * GET /api/locks/check?path=/folder
 * Cek apakah sebuah folder di-lock
 */
const checkLock = async (req, res) => {
    try {
        const { path: folderPath } = req.query;
        
        if (!folderPath) {
            return res.status(400).json({
                success: false,
                message: 'Parameter path wajib diisi'
            });
        }
        
        const isLocked = await lockStorage.isFolderLocked(folderPath);
        
        res.json({
            success: true,
            data: {
                path: folderPath,
                isLocked
            }
        });
    } catch (error) {
        console.error('❌ [LockController] Error checkLock:', error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal mengecek status lock',
            error: error.message
        });
    }
};

/**
 * GET /api/locks
 * Dapatkan semua folder yang di-lock
 */
const getAllLocked = async (req, res) => {
    try {
        const lockedFolders = await lockStorage.getAllLockedFolders();
        
        res.json({
            success: true,
            data: lockedFolders
        });
    } catch (error) {
        console.error('❌ [LockController] Error getAllLocked:', error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal mendapatkan daftar folder terkunci',
            error: error.message
        });
    }
};

/**
 * POST /api/locks/verify
 * Verifikasi password untuk folder yang di-lock
 * Support: Password biasa ATAU Master Password
 */
const verifyPassword = async (req, res) => {
    try {
        const { path: folderPath, password } = req.body;
        
        if (!folderPath || !password) {
            return res.status(400).json({
                success: false,
                message: 'Path dan password wajib diisi'
            });
        }
        
        // Gunakan fungsi verifyFolderPassword yang sudah support Master Password
        const result = await lockStorage.verifyFolderPassword(folderPath, password);
        
        res.json(result);
    } catch (error) {
        console.error('❌ [LockController] Error verifyPassword:', error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal verifikasi password',
            error: error.message
        });
    }
};

module.exports = {
    lockFolder,
    unlockFolder,
    changePassword,
    checkLock,
    getAllLocked,
    verifyPassword
};