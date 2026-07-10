const fs = require('fs').promises;
const path = require('path');
const { STORAGE_BASE_PATH, TRASH_PATH } = require('../config/storage');
const { getSafePath } = require('../utils/pathHelper');
const { getCategoryFolder } = require('../utils/filterEngine');

// ==========================================
// HELPER: Memindahkan file dengan aman
// Mencegah error EXDEV (Cross-device link) yang sering terjadi 
// jika folder .temp dan folder tujuan berada di partisi/drive berbeda.
// ==========================================
const safeMove = async (source, destination) => {
    try {
        // Coba pindahkan dengan rename (paling cepat & efisien)
        await fs.rename(source, destination);
    } catch (error) {
        if (error.code === 'EXDEV') {
            // Jika beda device/partisi, fallback ke copyFile lalu hapus file asli
            await fs.copyFile(source, destination);
            await fs.unlink(source);
        } else {
            // Jika error lain, lempar errornya
            throw error;
        }
    }
};

// 1. READ: Melihat daftar file & folder di suatu path
const getFiles = async (req, res) => {
    try {
        const currentPath = req.query.path || '/'; 
        const targetPath = getSafePath(currentPath);

        const items = await fs.readdir(targetPath, { withFileTypes: true });
        
        const files = [];
        const folders = [];

        items.forEach(item => {
            // Sembunyikan folder sistem yang berawalan titik (seperti .trash atau .temp_upload)
            if (item.name.startsWith('.')) return;

            if (item.isDirectory()) {
                folders.push(item.name);
            } else {
                files.push(item.name);
            }
        });

        res.json({ success: true, currentPath, folders, files });
    } catch (error) {
        console.error('Error getFiles:', error); // Log error
        res.status(500).json({ success: false, message: 'Gagal membaca direktori', error: error.message });
    }
};

// 2. UPLOAD: Menangani multi/single upload dengan auto-filtrasi
const uploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
        }

        const uploadedResults = [];
        const failedResults = [];

        for (const file of req.files) {
            try {
                // Tentukan folder kategori berdasarkan ekstensi
                const categoryFolder = getCategoryFolder(file.originalname);
                const targetDirectory = getSafePath(categoryFolder);

                // Buat foldernya jika belum ada
                await fs.mkdir(targetDirectory, { recursive: true });

                // Pindahkan file dari folder .temp ke folder kategori menggunakan safeMove
                const finalPath = path.join(targetDirectory, file.originalname);
                await safeMove(file.path, finalPath);

                uploadedResults.push({
                    filename: file.originalname,
                    category: categoryFolder,
                    savedAt: finalPath
                });
            } catch (fileError) {
                // Jika 1 file gagal, catat dan lanjutkan ke file berikutnya (tidak menggagalkan semua)
                console.error(`Gagal memproses file ${file.originalname}:`, fileError);
                failedResults.push({
                    filename: file.originalname,
                    error: fileError.message
                });
            }
        }

        // Jika semua file gagal diproses
        if (uploadedResults.length === 0 && failedResults.length > 0) {
            return res.status(500).json({ 
                success: false, 
                message: 'Semua file gagal diunggah', 
                data: { success: uploadedResults, failed: failedResults }
            });
        }

        res.json({
            success: true,
            message: `${uploadedResults.length} file berhasil diunggah dan difilter otomatis`,
            data: { success: uploadedResults, failed: failedResults }
        });
    } catch (error) {
        console.error('Error saat upload file:', error); // PENTING: Log error agar tidak silent
        res.status(500).json({ success: false, message: 'Gagal mengunggah file', error: error.message });
    }
};

// 3. RENAME: Mengubah nama file
const renameFile = async (req, res) => {
    try {
        const { oldPath, newPath } = req.body; 
        const safeOldPath = getSafePath(oldPath);
        const safeNewPath = getSafePath(newPath);

        await fs.access(safeOldPath);
        await safeMove(safeOldPath, safeNewPath); // Gunakan safeMove

        res.json({ success: true, message: 'Nama file berhasil diubah' });
    } catch (error) {
        console.error('Error rename file:', error);
        res.status(500).json({ success: false, message: 'Gagal mengubah nama file', error: error.message });
    }
};

// 4. MOVE: Memindahkan file
const moveFile = async (req, res) => {
    try {
        const { sourcePath, targetDirectory } = req.body; 
        const safeSourcePath = getSafePath(sourcePath);
        const fileName = path.basename(safeSourcePath);
        const safeDestinationPath = getSafePath(path.join(targetDirectory, fileName));

        await fs.access(safeSourcePath);
        
        const safeTargetDir = getSafePath(targetDirectory);
        await fs.mkdir(safeTargetDir, { recursive: true });
        
        await safeMove(safeSourcePath, safeDestinationPath); // Gunakan safeMove

        res.json({ success: true, message: `File berhasil dipindahkan ke ${targetDirectory}` });
    } catch (error) {
        console.error('Error move file:', error);
        res.status(500).json({ success: false, message: 'Gagal memindahkan file', error: error.message });
    }
};

// 5. DELETE: Memindahkan file ke sampah
const deleteFile = async (req, res) => {
    try {
        const { filePath } = req.body;
        const targetPath = getSafePath(filePath);
        
        await fs.mkdir(TRASH_PATH, { recursive: true });

        const fileName = path.basename(targetPath);
        const timestamp = Date.now();
        const trashDestination = path.join(TRASH_PATH, `${timestamp}_${fileName}`);

        await safeMove(targetPath, trashDestination); // Gunakan safeMove

        res.json({ success: true, message: 'File berhasil dipindahkan ke tempat sampah' });
    } catch (error) {
        console.error('Error delete file:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus file', error: error.message });
    }
};

// 6. VIEW: Pratinjau file langsung di browser (Streaming Video/Audio/Image)
const viewFile = (req, res) => {
    try {
        const targetPath = getSafePath(req.query.path);
        res.sendFile(targetPath);
    } catch (error) {
        console.error('Error view file:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat file', error: error.message });
    }
};

// 7. DOWNLOAD: Memaksa browser untuk mengunduh file
const downloadFile = (req, res) => {
    try {
        const targetPath = getSafePath(req.query.path);
        res.download(targetPath);
    } catch (error) {
        console.error('Error download file:', error);
        res.status(500).json({ success: false, message: 'Gagal mengunduh file', error: error.message });
    }
};

module.exports = {
    getFiles,
    uploadFiles,
    renameFile,
    moveFile,
    deleteFile,
    viewFile,
    downloadFile
};