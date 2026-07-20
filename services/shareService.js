const crypto = require('crypto');
const { query } = require('../db');

/**
 * Generates a cryptographically secure random 6-digit code
 */
function generateCode() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Creates a new share code for a file
 */
async function createShare(fileId, ownerId, maxDownloads = null, expiryMinutes = 30) {
    // Verify the file exists and belongs to the owner
    const fileCheck = await query(
        'SELECT id FROM files WHERE id = $1 AND owner_id = $2',
        [fileId, ownerId]
    );

    if (fileCheck.rows.length === 0) {
        throw new Error('File not found or access denied');
    }

    // Generate a unique code (check for collisions with active codes)
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        code = generateCode();

        // Check if this code is currently active (not expired)
        const existing = await query(
            'SELECT id FROM shares WHERE share_code = $1 AND expires_at > NOW()',
            [code]
        );

        if (existing.rows.length === 0) {
            break; // Code is available
        }
        attempts++;
    }

    if (attempts >= maxAttempts) {
        throw new Error('Could not generate unique share code, please try again');
    }

    // Calculate expiry time (cap at 60 minutes maximum)
    const cappedExpiry = Math.min(expiryMinutes, 60);
    const expiresAt = new Date(Date.now() + cappedExpiry * 60000);

    const result = await query(
        'INSERT INTO shares (file_id, share_code, expires_at, max_downloads) VALUES ($1, $2, $3, $4) RETURNING *',
        [fileId, code, expiresAt, maxDownloads]
    );

    return result.rows[0];
}

/**
 * Looks up a share code and returns share + file info if valid
 */
async function getShareByCode(code) {
    const result = await query(
        `SELECT 
    s.id as share_id,
    s.share_code,
    s.expires_at,
    s.max_downloads,
    s.download_count,
    f.id as file_id,
    f.original_name,
    f.storage_name,
    f.mime_type,
    f.size,
    f.owner_id
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.share_code = $1
       AND s.expires_at > NOW()
       AND (s.max_downloads IS NULL OR s.download_count < s.max_downloads)`,
        [code]
    );

    return result.rows[0] || null;
}

/**
 * Increments the download counter for a share
 */
async function incrementDownloadCount(shareId) {
    await query(
        'UPDATE shares SET download_count = download_count + 1 WHERE id = $1',
        [shareId]
    );
}

module.exports = {
    createShare,
    getShareByCode,
    incrementDownloadCount
};