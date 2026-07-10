// utils/lockStorage.js
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const { STORAGE_BASE_PATH, MASTER_LOCK_PASSWORD } = require('../config/storage');

// Path file penyimpanan lock
const LOCKS_FILE = path.join(STORAGE_BASE_PATH, '.config', 'folder-locks.json');

/**
 * Pastikan folder .config dan file locks.json ada
 */
const ensureLockFileExists = async () => {
    const configDir = path.dirname(LOCKS_FILE);
    
    // Buat folder .config jika belum ada
    try {
        await fs.access(configDir);
    } catch {
        await fs.mkdir(configDir, { recursive: true });
        console.log('✅ [LockStorage] Folder .config dibuat');
    }
    
    // Buat file locks.json jika belum ada
    try {
        await fs.access(LOCKS_FILE);
    } catch {
        await fs.writeFile(LOCKS_FILE, JSON.stringify({}, null, 2));
        console.log('✅ [LockStorage] File folder-locks.json dibuat');
    }
};

/**
 * Baca semua data lock dari file
 * @returns {Promise<Object>} Object dengan key = path folder, value = data lock
 */
const readLocks = async () => {
    await ensureLockFileExists();
    try {
        const data = await fs.readFile(LOCKS_FILE, 'utf-8');
        return JSON.parse(data || '{}');
    } catch (error) {
        console.error('❌ [LockStorage] Gagal membaca locks:', error.message);
        return {};
    }
};

/**
 * Tulis data lock ke file
 * @param {Object} locks - Data lock yang akan disimpan
 */
const writeLocks = async (locks) => {
    await ensureLockFileExists();
    
    // Debug: Log data yang akan ditulis
    console.log('📝 [LockStorage] Menulis data lock:', JSON.stringify(locks, null, 2));
    
    try {
        const data = JSON.stringify(locks, null, 2);
        await fs.writeFile(LOCKS_FILE, data, 'utf-8');
        
        // Verifikasi: Baca kembali untuk memastikan data tersimpan
        const verify = await fs.readFile(LOCKS_FILE, 'utf-8');
        console.log('✅ [LockStorage] Verifikasi tulis berhasil');
        
    } catch (error) {
        console.error('❌ [LockStorage] Gagal menulis locks:', error.message);
        throw error;
    }
};

/**
 * Hash password menggunakan bcrypt
 * @param {string} password - Password plain text
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Verifikasi password dengan hash
 * @param {string} password - Password plain text
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True jika password benar
 */
const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * Cek apakah password adalah Master Password
 * @param {string} password - Password yang akan dicek
 * @returns {boolean} True jika ini Master Password
 */
const isMasterPassword = (password) => {
    return password === MASTER_LOCK_PASSWORD;
};

/**
 * Cek apakah sebuah folder di-lock
 * @param {string} folderPath - Path folder yang akan dicek
 * @returns {Promise<boolean>} True jika folder di-lock
 */
const isFolderLocked = async (folderPath) => {
    const locks = await readLocks();
    return locks.hasOwnProperty(folderPath);
};

/**
 * Dapatkan data lock sebuah folder
 * @param {string} folderPath - Path folder
 * @returns {Promise<Object|null>} Data lock atau null jika tidak ada
 */
const getFolderLock = async (folderPath) => {
    const locks = await readLocks();
    return locks[folderPath] || null;
};

/**
 * Lock sebuah folder dengan password
 * @param {string} folderPath - Path folder yang akan di-lock
 * @param {string} password - Password untuk unlock
 * @returns {Promise<Object>} Result object
 */
const lockFolder = async (folderPath, password) => {
    if (!password || password.length < 4) {
        return { success: false, message: 'Password minimal 4 karakter' };
    }
    
    const locks = await readLocks();
    
    // Cek apakah sudah di-lock
    if (locks[folderPath]) {
        return { success: false, message: 'Folder sudah di-lock sebelumnya' };
    }
    
    // Hash password dan simpan
    const passwordHash = await hashPassword(password);
    locks[folderPath] = {
        passwordHash,
        createdAt: new Date().toISOString(),
        lockedBy: 'user'
    };
    
    await writeLocks(locks);
    console.log(`🔒 [LockStorage] Folder di-lock: ${folderPath}`);
    
    return { success: true, message: 'Folder berhasil di-lock' };
};

/**
 * Unlock sebuah folder dengan password
 * Support: Password biasa ATAU Master Password
 * @param {string} folderPath - Path folder yang akan di-unlock
 * @param {string} password - Password untuk verifikasi
 * @returns {Promise<Object>} Result object
 */
const unlockFolder = async (folderPath, password) => {
    const locks = await readLocks();
    const lockData = locks[folderPath];
    
    if (!lockData) {
        return { success: false, message: 'Folder tidak di-lock' };
    }
    
    // 1. Verifikasi password biasa
    let isValid = await verifyPassword(password, lockData.passwordHash);
    
    // 2. Jika password biasa salah, cek apakah ini Master Password
    if (!isValid && isMasterPassword(password)) {
        console.log(`🔑 [LockStorage] Unlock menggunakan MASTER PASSWORD untuk: ${folderPath}`);
        isValid = true;
    }

    if (!isValid) {
        return { success: false, message: 'Password salah' };
    }
    
    // Hapus lock
    delete locks[folderPath];
    await writeLocks(locks);
    console.log(`🔓 [LockStorage] Folder di-unlock: ${folderPath}`);
    
    return { success: true, message: 'Folder berhasil di-unlock' };
};

/**
 * Ubah password folder yang sudah di-lock
 * Support: oldPassword bisa berupa password biasa ATAU Master Password
 * @param {string} folderPath - Path folder
 * @param {string} oldPassword - Password lama (atau Master Password)
 * @param {string} newPassword - Password baru
 * @returns {Promise<Object>} Result object
 */
const changeLockPassword = async (folderPath, oldPassword, newPassword) => {
    if (!newPassword || newPassword.length < 4) {
        return { success: false, message: 'Password baru minimal 4 karakter' };
    }
    
    const locks = await readLocks();
    const lockData = locks[folderPath];
    
    if (!lockData) {
        return { success: false, message: 'Folder tidak di-lock' };
    }
    
    // 1. Verifikasi password lama
    let isValid = await verifyPassword(oldPassword, lockData.passwordHash);
    
    // 2. Jika password lama salah, cek apakah ini Master Password
    if (!isValid && isMasterPassword(oldPassword)) {
        console.log(`🔑 [LockStorage] Change password menggunakan MASTER PASSWORD untuk: ${folderPath}`);
        isValid = true;
    }
    
    if (!isValid) {
        return { success: false, message: 'Password lama salah' };
    }
    
    // Update dengan password baru
    lockData.passwordHash = await hashPassword(newPassword);
    lockData.changedAt = new Date().toISOString();
    locks[folderPath] = lockData;
    
    await writeLocks(locks);
    console.log(`🔑 [LockStorage] Password folder diubah: ${folderPath}`);
    
    return { success: true, message: 'Password berhasil diubah' };
};

/**
 * Verifikasi password untuk folder yang di-lock
 * Support: Password biasa ATAU Master Password
 * @param {string} folderPath - Path folder
 * @param {string} password - Password yang akan diverifikasi
 * @returns {Promise<Object>} Result object
 */
const verifyFolderPassword = async (folderPath, password) => {
    const lockData = await getFolderLock(folderPath);
    
    if (!lockData) {
        return { success: false, message: 'Folder tidak di-lock' };
    }
    
    // 1. Verifikasi password biasa
    let isValid = await verifyPassword(password, lockData.passwordHash);
    
    // 2. Jika password biasa salah, cek apakah ini Master Password
    if (!isValid && isMasterPassword(password)) {
        console.log(`🔑 [LockStorage] Verify menggunakan MASTER PASSWORD untuk: ${folderPath}`);
        isValid = true;
    }
    
    return {
        success: isValid,
        message: isValid ? 'Password benar' : 'Password salah'
    };
};

/**
 * Dapatkan semua folder yang di-lock (tanpa password hash)
 * @returns {Promise<Array>} Array path folder yang di-lock
 */
const getAllLockedFolders = async () => {
    const locks = await readLocks();
    return Object.keys(locks).map(folderPath => ({
        path: folderPath,
        createdAt: locks[folderPath].createdAt,
        lockedBy: locks[folderPath].lockedBy
    }));
};

module.exports = {
    readLocks,
    writeLocks,
    hashPassword,
    verifyPassword,
    isMasterPassword,
    isFolderLocked,
    getFolderLock,
    lockFolder,
    unlockFolder,
    changeLockPassword,
    verifyFolderPassword,
    getAllLockedFolders
};