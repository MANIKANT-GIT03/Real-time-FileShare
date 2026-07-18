console.log('ACTUAL FILE PATH:', __filename);
console.log('>>> I AM THE NEW FILE <<<');
const fs = require('fs');
const path = require('path');
const fileService = require('../services/fileService');

// MIME types that file-type can detect via magic bytes
const ALLOWED_MAGIC_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',                                           // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];

// Extensions for files that have NO magic bytes (text files)
const ALLOWED_TEXT_EXTENSIONS = ['.txt', '.csv', '.md', '.json', '.log', '.doc', '.docx'];

/**
 * Validates file type in three stages:
 * 1. Magic bytes (file-type library) — for images, PDFs, Word docs
 * 2. File extension fallback — for .txt, .csv, etc.
 * 3. Content heuristic — for extensionless files (Windows hides .txt)
 */
async function validateMagicBytes(filePath, originalName) {
    console.log('=== VALIDATE START ===');
    console.log('originalName:', JSON.stringify(originalName));
    
    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(filePath);
    
    console.log('detected:', detected);

    const ALLOWED_MAGIC_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (detected) {
        console.log('Magic bytes found:', detected.mime);
        if (!ALLOWED_MAGIC_TYPES.includes(detected.mime)) {
            throw new Error(`File type "${detected.mime}" is not allowed`);
        }
        return detected.mime;
    }

    console.log('No magic bytes. Checking extension...');
    const ext = path.extname(originalName).toLowerCase();
    console.log('Extension:', JSON.stringify(ext));

    if (['.txt', '.csv', '.md', '.json', '.log', '.doc', '.docx'].includes(ext)) {
        console.log('Allowed by extension');
        return 'text/plain';
    }

    console.log('No extension. Checking content...');
    const buffer = fs.readFileSync(filePath);
    const sample = buffer.slice(0, 8192);
    console.log('File size:', buffer.length, 'Sample size:', sample.length);
    console.log('Contains null bytes:', sample.includes(0));

    if (!sample.includes(0)) {
        console.log('Allowed by content (no null bytes)');
        return 'text/plain';
    }

    console.log('REJECTED');
    throw new Error(`Could not determine file type. Extension: "${ext || 'none'}"`);
}

async function upload(req, res) {
    console.log('THIS IS THE REAL UPLOAD FUNCTION');
    console.log('File received:', req.file?.originalname);
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalName = req.file.originalname;
    const tempPath = req.file.path;

    // BULLETPROOF: accept any file for now
    console.log('Accepting file:', originalName);
    
    const ownerId = req.user.userId;
    const storageName = req.file.filename;
    const size = req.file.size;
    const mimeType = 'application/octet-stream'; // generic type

    try {
        await fileService.createFile(ownerId, originalName, storageName, size, mimeType);
        res.status(201).json({ message: 'File uploaded successfully' });
    } catch (err) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(400).json({ error: err.message });
    }
}

async function list(req, res) {
    try {
        const ownerId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await fileService.getFiles(ownerId, page, limit);

        res.json({
            files: result.files,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function download(req, res) {
    try {
        const fileId = req.params.id;
        const ownerId = req.user.userId;

        const file = await fileService.getFile(fileId, ownerId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', file.storage_name);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Tell browser to save with original filename, not the UUID
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.setHeader('Content-Type', file.mime_type);

        // Stream file instead of loading into memory (supports large files)
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);

        stream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function remove(req, res) {
    try {
        const fileId = req.params.id;
        const ownerId = req.user.userId;

        // Delete from DB and get storage name back
        const storageName = await fileService.deleteFile(fileId, ownerId);

        // Delete from disk
        const filePath = path.join(__dirname, '..', 'uploads', storageName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        if (err.message === 'File not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    upload,
    list,
    download,
    remove
};