// controllers/searchController.js
const fs = require('fs').promises;
const path = require('path');
const { STORAGE_BASE_PATH, TRASH_PATH } = require('../config/storage');
const { getSafePath } = require('../utils/pathHelper');

/**
 * SEARCH: Mencari file dan folder berdasarkan nama (recursive)
 * GET /api/search?query=xxx&limit=50
 * 
 * Fitur:
 * - Case-insensitive search
 * - Recursive traversal
 * - Skip folder tersembunyi (.) dan Trash
 * - Limit hasil untuk performa (Pi 3 lambat)
 * - Return format yang match dengan frontend
 */
const searchFiles = async (req, res) => {
    try {
        const query = req.query.query?.trim();
        const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 results

        if (!query) {
            return res.status(400).json({ 
                success: false, 
                message: 'Query pencarian tidak boleh kosong' 
            });
        }

        // Validasi query tidak mengandung path traversal
        if (query.includes('..') || query.includes('/') || query.includes('\\')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Query pencarian tidak valid' 
            });
        }

        console.log(`🔍 [Search] Mencari: "${query}" (limit: ${limit})...`);

        const results = [];
        const queryLower = query.toLowerCase();
        const startTime = Date.now();

        // Recursive search function
        const searchRecursive = async (currentPath, relativePath = '') => {
            // Stop jika sudah mencapai limit
            if (results.length >= limit) return;

            // Timeout protection - stop jika sudah > 10 detik (Pi 3 lambat)
            if (Date.now() - startTime > 10000) {
                console.warn('⚠️ [Search] Timeout - hasil dibatasi');
                return;
            }

            try {
                const items = await fs.readdir(currentPath, { withFileTypes: true });

                for (const item of items) {
                    // Stop jika sudah mencapai limit
                    if (results.length >= limit) break;

                    // Skip folder tersembunyi (awalan .)
                    if (item.name.startsWith('.')) continue;

                    // Skip folder Trash
                    const itemFullPath = path.join(currentPath, item.name);
                    const trashResolved = path.resolve(TRASH_PATH);
                    const itemResolved = path.resolve(itemFullPath);
                    if (itemResolved === trashResolved || itemResolved.startsWith(trashResolved + path.sep)) {
                        continue;
                    }

                    const itemRelativePath = relativePath 
                        ? `${relativePath}/${item.name}` 
                        : `/${item.name}`;

                    // Check apakah nama match dengan query (case-insensitive)
                    const isMatch = item.name.toLowerCase().includes(queryLower);

                    if (item.isDirectory()) {
                        if (isMatch) {
                            try {
                                const stat = await fs.stat(itemFullPath);
                                results.push({
                                    id: `folder-${Buffer.from(itemRelativePath).toString('base64')}`,
                                    name: item.name,
                                    type: 'folder',
                                    path: itemRelativePath,
                                    size: 0,
                                    modifiedAt: stat.mtime.toISOString(),
                                });
                            } catch (statErr) {
                                // Skip jika tidak bisa baca stat
                            }
                        }

                        // Rekursif ke subfolder (meskipun folder ini tidak match, isinya mungkin match)
                        // Skip symlink untuk hindari infinite loop
                        try {
                            const stat = await fs.lstat(itemFullPath);
                            if (!stat.isSymbolicLink()) {
                                await searchRecursive(itemFullPath, itemRelativePath);
                            }
                        } catch (lstatErr) {
                            // Skip jika error
                        }
                    } else if (item.isFile()) {
                        if (isMatch) {
                            try {
                                const stat = await fs.stat(itemFullPath);
                                results.push({
                                    id: `file-${Buffer.from(itemRelativePath).toString('base64')}`,
                                    name: item.name,
                                    type: 'file',
                                    path: itemRelativePath,
                                    size: stat.size,
                                    modifiedAt: stat.mtime.toISOString(),
                                });
                            } catch (statErr) {
                                // Skip jika tidak bisa baca stat
                            }
                        }
                    }
                }
            } catch (readErr) {
                // Skip folder yang tidak bisa dibaca (permission denied, dll)
                console.warn(`⚠️ [Search] Skip folder: ${currentPath} - ${readErr.message}`);
            }
        };

        // Mulai search dari root storage
        await searchRecursive(STORAGE_BASE_PATH, '');

        const duration = Date.now() - startTime;
        console.log(`✅ [Search] Ditemukan ${results.length} hasil dalam ${duration}ms`);

        res.json({
            success: true,
            query: query,
            total: results.length,
            duration: duration,
            data: {
                results: results
            }
        });

    } catch (error) {
        console.error('❌ [Search Error]:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal melakukan pencarian', 
            error: error.message 
        });
    }
};

module.exports = { searchFiles };