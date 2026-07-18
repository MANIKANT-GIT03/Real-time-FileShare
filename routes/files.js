const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const fileController = require('../controllers/fileController');

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Generate a UUID for the stored filename
        // This prevents directory traversal attacks
        const uuid = crypto.randomUUID();
        cb(null, uuid);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB max
    }
});

// Routes
router.post('/', authMiddleware, upload.single('file'), fileController.upload);
router.get('/', authMiddleware, fileController.list);
router.get('/:id/download', authMiddleware, fileController.download);
router.delete('/:id', authMiddleware, fileController.remove);

module.exports = router;