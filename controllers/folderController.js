const fs = require('fs').promises;
const path = require('path');
const { ZipArchive } = require('archiver');
const { TRASH_PATH } = require('../config/storage');
const { getSafePath } = require('../utils/pathHelper');

// 1. CREATE: Membuat folder baru
const createFolder = async (req, res) => {
    try {
        const { folderPath } = req.body;
        const targetPath = getSafePath(folderPath);

        // recursive: true agar jika folder induknya belum ada, otomatis dibuatkan
        await fs.mkdir(targetPath, { recursive: true });

        res.json({
            success: true,
            message: `Folder berhasil dibuat di ${folderPath}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal membuat folder', error: error.message });
    }
};

// 2. EDIT: Mengubah nama folder (Rename)
const renameFolder = async (req, res) => {
    try {
        const { oldPath, newPath } = req.body; 
        
        const safeOldPath = getSafePath(oldPath);
        const safeNewPath = getSafePath(newPath);

        await fs.access(safeOldPath);
        await fs.rename(safeOldPath, safeNewPath);

        res.json({
            success: true,
            message: 'Nama folder berhasil diubah'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengubah nama folder', error: error.message });
    }
};

// 3. DELETE: Menghapus folder (Memindahkan ke .trash)
const deleteFolder = async (req, res) => {
    try {
        const { folderPath } = req.body;
        const targetPath = getSafePath(folderPath);
        
        await fs.mkdir(TRASH_PATH, { recursive: true });

        const folderName = path.basename(targetPath);
        const timestamp = Date.now();
        const trashDestination = path.join(TRASH_PATH, `${folderName}_${timestamp}`);

        await fs.rename(targetPath, trashDestination);

        res.json({
            success: true,
            message: 'Folder berhasil dipindahkan ke tempat sampah'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus folder', error: error.message });
    }
};

// 4. MOVE: Memindahkan folder
const moveFolder = async (req, res) => {
    try {
        const { sourcePath, targetDirectory } = req.body; 

        const safeSourcePath = getSafePath(sourcePath);
        const folderName = path.basename(safeSourcePath);
        const safeDestinationPath = getSafePath(path.join(targetDirectory, folderName));

        await fs.access(safeSourcePath);

        const safeTargetDir = getSafePath(targetDirectory);
        await fs.mkdir(safeTargetDir, { recursive: true });

        await fs.rename(safeSourcePath, safeDestinationPath);

        res.json({
            success: true,
            message: `Folder berhasil dipindahkan ke ${targetDirectory}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memindahkan folder', error: error.message });
    }
};

// 5. DOWNLOAD: Mengompresi folder menjadi ZIP dan langsung mengunduhnya
const downloadFolder = async (req, res) => {
    try {
        const folderPath = req.query.path;
        if (!folderPath) {
            return res.status(400).json({ success: false, message: 'Path folder tidak diberikan' });
        }

        const targetPath = getSafePath(folderPath);
        let folderName = path.basename(targetPath);
        if (!folderName) folderName = 'arsip_folder';

        // Validasi keberadaan folder
        const stat = await fs.stat(targetPath);
        if (!stat.isDirectory()) {
            return res.status(400).json({ success: false, message: 'Path yang diminta bukan sebuah folder' });
        }

        console.log(`📦 [Download] Menyiapkan kompresi untuk folder: ${folderName}...`);

        // Set header response HANYA setelah kita yakin foldernya ada
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

        // Gunakan pemanggilan standar archiver
      const archive = new ZipArchive({
        zlib: { level: 9 } 
        });

        // 1. Pantau jika ada error di tengah proses kompresi
        archive.on('error', (err) => {
            console.error('❌ [Error Kompresi]:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Gagal mengompresi folder' });
            } else {
                // SANGAT PENTING: Paksa tutup koneksi agar browser tidak muter terus
                res.end(); 
            }
        });

        // 2. Pantau jika proses kompresi sudah benar-benar selesai
        archive.on('end', () => {
            console.log(`✅ [Download] Berhasil! Total ukuran ZIP: ${archive.pointer()} bytes.`);
        });

        // 3. Alirkan data ke browser
        archive.pipe(res);

        // 4. Masukkan isi targetPath ke dalam folder bernama 'folderName' di dalam zip
        // Menggunakan nama folder sebagai parameter kedua jauh lebih stabil daripada nilai 'false'
        archive.directory(targetPath, folderName);

        // 5. Kunci dan jalankan kompresi
        await archive.finalize();

    } catch (error) {
        console.error('❌ [Error System]:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Gagal mengunduh folder', error: error.message });
        } else {
            res.end(); // Putuskan koneksi jika error mendadak
        }
    }
};

module.exports = {
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    downloadFolder
};