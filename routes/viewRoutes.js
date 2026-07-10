// routes/viewRoutes.js
const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');

// 🚨 MIDDLEWARE JEBAKAN 400 🚨
// Middleware ini akan melacak siapa yang memanggil res.status(400)
router.get('/', (req, res, next) => {
    console.log('🔍 [View Route] Incoming request:', req.method, req.url);
    console.log('🔍 [View Route] Query params:', req.query);
    
    // Override fungsi res.status untuk mendeteksi jika ada yang set status 400
    const originalStatus = res.status;
    res.status = function(code) {
        if (code === 400) {
            console.error('🚨 [View Route] ADA YANG MENGEMBALIKAN 400! Lihat stack trace di bawah:');
            console.trace(); // Ini akan mencetak lokasi file dan baris kode yang memicu 400
        }
        return originalStatus.call(this, code);
    };
    
    next();
}, viewController.viewFile);

// GET /api/view/info?path=/path/to/file - Get info file untuk preview
router.get('/info', viewController.getViewInfo);

// Error Handler Middleware khusus untuk route ini
router.use((err, req, res, next) => {
  console.error('❌ [View Routes Error]:', err.message);
  if (err.message.includes('Akses Ditolak')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses request',
      error: err.message
    });
  }
});

module.exports = router;