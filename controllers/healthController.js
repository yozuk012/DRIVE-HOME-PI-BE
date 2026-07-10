// controllers/healthController.js
const os = require('os');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { STORAGE_BASE_PATH } = require('../config/storage');

/**
 * GET /api/health
 * Endpoint untuk monitoring kesehatan backend
 */
const getHealth = async (req, res) => {
    try {
        // 1. Cek uptime backend
        const uptime = process.uptime();
        const uptimeFormatted = formatUptime(uptime);

        // 2. Cek memory usage
        const memoryUsage = process.memoryUsage();
        const memoryInfo = {
            rss: formatBytes(memoryUsage.rss),
            heapTotal: formatBytes(memoryUsage.heapTotal),
            heapUsed: formatBytes(memoryUsage.heapUsed),
            external: formatBytes(memoryUsage.external),
        };

        // 3. Cek system info
        const systemInfo = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            cpuCores: os.cpus().length,
            totalMemory: formatBytes(os.totalmem()),
            freeMemory: formatBytes(os.freemem()),
            uptime: formatUptime(os.uptime()),
            loadAverage: os.loadavg().map(l => l.toFixed(2)),
        };

        // 4. Cek storage HDD
        let storageInfo = null;
        try {
            const storageData = await getStorageInfo();
            storageInfo = storageData;
        } catch (err) {
            storageInfo = { error: 'Gagal membaca storage' };
        }

        // 5. Cek apakah folder .temp_upload ada
        let tempUploadExists = false;
        try {
            await fs.access(`${STORAGE_BASE_PATH}/.temp_upload`);
            tempUploadExists = true;
        } catch {
            tempUploadExists = false;
        }

        // 6. Cek apakah folder .config ada
        let configExists = false;
        try {
            await fs.access(`${STORAGE_BASE_PATH}/.config`);
            configExists = true;
        } catch {
            configExists = false;
        }

        // 7. Response
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            backend: {
                uptime: uptimeFormatted,
                uptimeSeconds: Math.floor(uptime),
                nodeVersion: process.version,
                memory: memoryInfo,
            },
            system: systemInfo,
            storage: storageInfo,
            folders: {
                baseStorage: STORAGE_BASE_PATH,
                tempUpload: tempUploadExists ? '✅ exists' : '❌ missing',
                config: configExists ? '✅ exists' : '❌ missing',
            }
        });
    } catch (error) {
        console.error('❌ [Health] Error:', error.message);
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * GET /api/health/ping
 * Simple ping endpoint (untuk quick check)
 */
const ping = (req, res) => {
    res.json({
        success: true,
        message: 'pong',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
};

// Helper: Format bytes ke human-readable
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper: Format uptime ke human-readable
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
};

// Helper: Get storage info via df command
const getStorageInfo = () => {
    return new Promise((resolve, reject) => {
        exec(`df -BG "${STORAGE_BASE_PATH}" | tail -1`, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            
            const parts = stdout.trim().split(/\s+/);
            const total = parseInt(parts[1]) || 0;
            const used = parseInt(parts[2]) || 0;
            const available = parseInt(parts[3]) || 0;
            
            resolve({
                total: `${total} GB`,
                used: `${used} GB`,
                available: `${available} GB`,
                percentage: total > 0 ? Math.round((used / total) * 100) : 0
            });
        });
    });
};

module.exports = {
    getHealth,
    ping
};