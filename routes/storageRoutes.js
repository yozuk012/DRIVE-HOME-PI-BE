const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storageController');

// GET /api/storage
router.get('/', storageController.getStorageInfo);

// DELETE /api/storage/format
router.delete('/format', storageController.formatStorage);

module.exports = router;