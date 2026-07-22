const fs = require('fs');
const { s3Client } = require('../config/r2');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Uploads a file from local disk to B2 cloud storage
 * @param {string} localPath - Full path to the temporary local file
 * @param {string} key - The UUID filename (used as B2 object key)
 * @param {string} mimeType - The file's MIME type
 */
async function uploadToB2(localPath, key, mimeType) {
    const stream = fs.createReadStream(localPath);

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key,
        Body: stream,
        ContentType: mimeType
    }));
}

/**
 * Streams a file from B2 directly to the HTTP response
 * @param {string} key - The B2 object key (UUID from database)
 * @param {object} res - Express response object to pipe into
 */
async function streamFromB2(key, res) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key
    }));

    // Handle stream errors gracefully
    response.Body.on('error', (err) => {
        console.error('B2 stream error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file from cloud storage' });
        }
    });

    response.Body.pipe(res);
}

/**
 * Deletes a file from B2 cloud storage
 * @param {string} key - The B2 object key to delete
 */
async function deleteFromB2(key) {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key
    }));
}

module.exports = {
    uploadToB2,
    streamFromB2,
    deleteFromB2
};