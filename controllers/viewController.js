// controllers/viewController.js
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { STORAGE_BASE_PATH } = require('../config/storage');
const { getSafePath } = require('../utils/pathHelper');

/**
 * MIME Types mapping untuk berbagai ekstensi file
 */
const MIME_TYPES = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  'bmp': 'image/bmp',
  'ico': 'image/x-icon',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'rtf': 'application/rtf',
  
  // Text & Code
  'txt': 'text/plain',
  'md': 'text/markdown',
  'json': 'application/json',
  'xml': 'application/xml',
  'yaml': 'text/yaml',
  'yml': 'text/yaml',
  'csv': 'text/csv',
  
  // Programming Languages
  'js': 'text/javascript',
  'jsx': 'text/javascript',
  'ts': 'text/typescript',
  'tsx': 'text/typescript',
  'html': 'text/html',
  'css': 'text/css',
  'scss': 'text/scss',
  'less': 'text/less',
  'py': 'text/x-python',
  'java': 'text/x-java-source',
  'c': 'text/x-c',
  'cpp': 'text/x-c++',
  'h': 'text/x-c',
  'hpp': 'text/x-c++',
  'cs': 'text/x-csharp',
  'go': 'text/x-go',
  'rs': 'text/x-rust',
  'rb': 'text/x-ruby',
  'php': 'text/x-php',
  'sh': 'text/x-shellscript',
  'bash': 'text/x-shellscript',
  'sql': 'text/x-sql',
  
  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',
  'mov': 'video/quicktime',
  'wmv': 'video/x-ms-wmv',
  'flv': 'video/x-flv',
  'm4v': 'video/mp4',
  
  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'flac': 'audio/flac',
  'aac': 'audio/aac',
  'm4a': 'audio/mp4',
  'wma': 'audio/x-ms-wma',
};

/**
 * VIEW: Menampilkan file langsung di browser
 * GET /api/view?path=/path/to/file
 */
// GANTI FUNGSI viewFile DI controllers/viewController.js DENGAN INI:

const viewFile = async (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Path file tidak diberikan' 
      });
    }

    const targetPath = getSafePath(filePath);
    
    console.log(` [View] Requested path: ${filePath}`);
    console.log(`🔍 [View] Resolved targetPath: ${targetPath}`);

    // Validasi file ada dan bisa dibaca
    await fsPromises.access(targetPath, fs.constants.R_OK);
    const stat = await fsPromises.stat(targetPath);
    
    if (!stat.isFile()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Path yang diminta bukan sebuah file' 
      });
    }

    const ext = path.extname(targetPath).toLowerCase().substring(1);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileName = path.basename(targetPath);

    console.log(`📹 [View] Streaming file: ${fileName} (${mimeType})`);

    // === PERUBAHAN UTAMA: Gunakan fs.createReadStream manual ===
    res.status(200);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = fs.createReadStream(targetPath);
    
    // Pipe stream langsung ke response
    stream.pipe(res);

    // Handle error pada stream (misal hardisk eksternal tiba-tiba disconnect)
    stream.on('error', (err) => {
      console.error(' [Stream Error]:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Gagal streaming file' });
      } else {
        res.end();
      }
    });

    // Handle jika client (Postman/Browser) membatalkan request
    req.on('close', () => {
      console.log(`⚠️ [View] Koneksi ditutup oleh client saat streaming: ${fileName}`);
      stream.destroy();
    });

  } catch (error) {
    console.error('❌ [View Error]:', error.message);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
    }
    
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Gagal menampilkan file', error: error.message });
    }
  }
};

/**
 * Helper: Check apakah ekstensi bisa di-stream (video/audio)
 */
const isStreamable = (ext) => {
  const streamableTypes = ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'm4v', 'mp3', 'wav', 'flac', 'aac', 'm4a', 'wma'];
  return streamableTypes.includes(ext);
};

/**
 * GET /api/view/info?path=/path/to/file
 * Mendapatkan info file untuk preview (MIME type, size, dll)
 */
const getViewInfo = async (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Path file tidak diberikan' 
      });
    }

    const targetPath = getSafePath(filePath);
    
    const stat = await fsPromises.stat(targetPath);
    
    if (!stat.isFile()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Path yang diminta bukan sebuah file' 
      });
    }

    const ext = path.extname(targetPath).toLowerCase().substring(1);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const canView = Object.keys(MIME_TYPES).includes(ext);
    const fileName = path.basename(targetPath);

    res.json({
      success: true,
      data: {
        name: fileName,
        path: filePath,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        mimeType: mimeType,
        extension: ext,
        canView: canView,
        isStreamable: isStreamable(ext),
        lastModified: stat.mtime.toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ [View Info Error]:', error.message);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({ 
        success: false, 
        message: 'File tidak ditemukan' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mendapatkan info file', 
      error: error.message 
    });
  }
};

/**
 * Helper: Format bytes ke string yang mudah dibaca
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

module.exports = {
  viewFile,
  getViewInfo
};