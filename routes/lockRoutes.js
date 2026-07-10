// routes/lockRoutes.js
const express = require('express');
const router = express.Router();
const lockController = require('../controllers/lockController');

// POST /api/locks - Lock folder
router.post('/', lockController.lockFolder);

// DELETE /api/locks - Unlock folder
router.delete('/', lockController.unlockFolder);

// PUT /api/locks/password - Ubah password
router.put('/password', lockController.changePassword);

// GET /api/locks/check?path=... - Cek status lock
router.get('/check', lockController.checkLock);

// GET /api/locks - Dapatkan semua folder yang di-lock
router.get('/', lockController.getAllLocked);

// POST /api/locks/verify - Verifikasi password
router.post('/verify', lockController.verifyPassword);

module.exports = router;