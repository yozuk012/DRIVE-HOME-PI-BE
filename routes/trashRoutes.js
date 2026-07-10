const express = require('express');
const router = express.Router();
const trashController = require('../controllers/trashController');

router.get('/', trashController.getTrashItems);
router.post('/restore', trashController.restoreItem);
router.delete('/permanent', trashController.deletePermanent);
router.delete('/empty', trashController.emptyTrash);

// PASTIKAN BARIS INI ADA DAN TEPAT SEPERTI INI:
module.exports = router;