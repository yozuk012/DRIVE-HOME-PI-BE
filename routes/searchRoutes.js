// routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const lockStorage = require('../utils/lockStorage');

/**
 * Middleware: Filter hasil search agar TIDAK menampilkan file/folder
 * yang berada di dalam folder yang di-lock
 */
const filterLockedResults = async (req, res, next) => {
    // Simpan fungsi json asli
    const originalJson = res.json.bind(res);
    
    // Override fungsi json untuk memfilter hasil
    res.json = async (data) => {
        if (data.success && data.data && data.data.results) {
            const filteredResults = [];
            
            for (const item of data.data.results) {
                // Cek apakah item ini berada di folder yang di-lock
                const parts = item.path.split('/').filter(Boolean);
                let currentPath = '';
                let isLocked = false;
                
                // Cek semua parent folder (kecuali item itu sendiri jika file)
                const checkParts = item.type === 'folder' ? parts.slice(0, -1) : parts;
                
                for (const part of checkParts) {
                    currentPath += '/' + part;
                    if (await lockStorage.isFolderLocked(currentPath)) {
                        isLocked = true;
                        break;
                    }
                }
                
                // Jika tidak di-lock, tambahkan ke hasil
                if (!isLocked) {
                    filteredResults.push(item);
                } else {
                    console.log(`🚫 [Search Filter] Menyembunyikan: ${item.path}`);
                }
            }
            
            data.data.results = filteredResults;
        }
        
        return originalJson(data);
    };
    
    next();
};

// GET /api/search?query=xxx&limit=50
// Proteksi: Filter hasil agar tidak menampilkan item dari folder terkunci
router.get('/', filterLockedResults, searchController.searchFiles);

module.exports = router;