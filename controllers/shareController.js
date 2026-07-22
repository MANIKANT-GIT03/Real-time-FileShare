const shareService = require('../services/shareService');
const fs = require('fs');
const path = require('path');
const storageService = require('../services/storageService');

/**
 * POST /api/files/:id/share
 * Creates a share code for a file (requires authentication)
 */
async function create(req, res) {
    try {
        const fileId = req.params.id;
        const ownerId = req.user.userId;
        const { maxDownloads, expiryMinutes } = req.body;

        // Validate inputs
        const maxDl = maxDownloads ? parseInt(maxDownloads) : null;
        if (maxDl !== null && (isNaN(maxDl) || maxDl < 1)) {
            return res.status(400).json({ error: 'maxDownloads must be a positive number' });
        }

        const expiry = parseInt(expiryMinutes) || 30;
        if (isNaN(expiry) || expiry < 1) {
            return res.status(400).json({ error: 'expiryMinutes must be a positive number' });
        }

        const share = await shareService.createShare(fileId, ownerId, maxDl, expiry);

        // Emit real-time event
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${ownerId}`).emit('file:shared', {
                share: {
                    code: share.share_code,
                    fileId: fileId,
                    expiresAt: share.expires_at
                }
            });
        }

        res.status(201).json({
            message: 'Share code created',
            share: {
                code: share.share_code,
                expiresAt: share.expires_at,
                maxDownloads: share.max_downloads,
                downloadsRemaining: share.max_downloads ? share.max_downloads : 'unlimited'
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

/**
 * POST /api/shares/redeem
 * Redeems a share code to see file info (public, rate-limited)
 */
async function redeem(req, res) {
    try {
        const { code } = req.body;

        // Validate format: exactly 6 digits
        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ error: 'Invalid share code format. Must be exactly 6 digits.' });
        }

        const share = await shareService.getShareByCode(code);

        if (!share) {
            return res.status(404).json({ error: 'Invalid, expired, or fully-used share code' });
        }


        // Notify the file owner that someone redeemed their code
        const io = req.app.get('io');
        if (io && share) {
            io.to(`user:${share.owner_id}`).emit('share:redeemed', {
                code: share.share_code,
                fileName: share.original_name
            });
        }

        res.json({
            file: {
                id: share.file_id,
                name: share.original_name,
                size: share.size,
                mimeType: share.mime_type
            },
            share: {
                code: share.share_code,
                expiresAt: share.expires_at,
                downloadsRemaining: share.max_downloads ? share.max_downloads - share.download_count : null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/shares/:code/download
 * Downloads a file via share code (public, rate-limited)
 */
async function download(req, res) {
    try {
        const { code } = req.params;

        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ error: 'Invalid share code' });
        }

        const share = await shareService.getShareByCode(code);

        if (!share) {
            return res.status(404).json({ error: 'Invalid, expired, or fully-used share code' });
        }

        // Increment download count BEFORE streaming
        await shareService.incrementDownloadCount(share.share_id);

        // Set download headers
        res.setHeader('Content-Disposition', `attachment; filename="${share.original_name}"`);
        res.setHeader('Content-Type', share.mime_type);

        // Stream from B2 directly to the browser
        await storageService.streamFromB2(share.storage_name, res);

        // Notify the file owner in real-time
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${share.owner_id}`).emit('share:redeemed', {
                code: share.share_code,
                fileName: share.original_name
            });
        }
    } catch (err) {
        console.error('Share download error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = { create, redeem, download };