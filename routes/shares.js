const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const shareController = require('../controllers/shareController');

/**
 * Rate limiter for share redemption and download
 * 10 attempts per 15 minutes per IP
 */
const shareLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Create a share code (authenticated)
router.post('/files/:id/share', authMiddleware, shareController.create);

// Redeem a share code (public, rate-limited)
router.post('/redeem', shareLimiter, shareController.redeem);

// Download via share code (public, rate-limited)
router.get('/:code/download', shareLimiter, shareController.download);

module.exports = router;