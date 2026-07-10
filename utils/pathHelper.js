// src/utils/pathHelper.js
const path = require('path');
const { STORAGE_BASE_PATH } = require('../config/storage');

const getSafePath = (requestedPath = '') => {
    // 1. Validasi tipe data
    if (typeof requestedPath !== 'string') {
        throw new Error('Akses Ditolak: Path tidak valid.');
    }

    // 2. Resolve Base Path untuk memastikan kita punya absolute path yang konsisten
    const resolvedBasePath = path.resolve(STORAGE_BASE_PATH);

    // 3. Normalisasi requestedPath:
    // - Hilangkan garis miring (slash/backslash) di awal agar tidak dianggap absolute path dari root OS
    // - Ganti semua backslash (\) dengan slash (/) untuk konsistensi lintas OS
    let cleanPath = requestedPath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');

    // 4. Gabungkan dan Resolve untuk mendapatkan absolute path target yang sebenarnya.
    // path.resolve akan otomatis menetralkan ../ atau ./ secara sempurna.
    const resolvedTargetPath = path.resolve(resolvedBasePath, cleanPath);

    // 5. Security Check (Directory Traversal Prevention)
    // Pastikan resolvedTargetPath benar-benar berada di dalam resolvedBasePath.
    
    // Cek jika path yang diminta adalah base path itu sendiri (misal: requestedPath = '/')
    const isSamePath = resolvedTargetPath === resolvedBasePath;
    
    // Cek jika path berada di dalam base path.
    // PENTING: Kita tambahkan path.sep (slash pemisah direktori) pada resolvedBasePath 
    // untuk mencegah bug "startsWith" (misal: base='/var/storage', target='/var/storage_malicious')
    const isInsideBase = resolvedTargetPath.startsWith(resolvedBasePath + path.sep);

    if (!isSamePath && !isInsideBase) {
        throw new Error('Akses Ditolak: Path berada di luar direktori aman (Directory Traversal Detected).');
    }

    return resolvedTargetPath;
};

module.exports = { 
    getSafePath 
};