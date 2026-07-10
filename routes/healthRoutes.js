// routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// GET /api/health - Full health check
router.get('/', healthController.getHealth);

// GET /api/health/ping - Simple ping
router.get('/ping', healthController.ping);

module.exports = router;