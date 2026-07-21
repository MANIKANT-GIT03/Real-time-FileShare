const fs = require('fs');
const path = require('path');
const fileService = require('../services/fileService');

async function validateMagicBytes(filePath, originalName) {
    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(filePath);

    if (detected) {
        const allowed = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!allowed.includes(detected.mime)) {
            throw new Error(`File type "${detected.mime}" is not allowed`);
        }
        return detected.mime;
    }

    const ext = path.extname(originalName).toLowerCase();
    if (['.txt', '.csv', '.md', '.json', '.log', '.doc', '.docx'].includes(ext)) {
        return 'text/plain';
    }

    if (ext === '') {
        const buffer = fs.readFileSync(filePath);
        if (!buffer.slice(0, 8192).includes(0)) {
            return 'text/plain';
        }
    }

    throw new Error(`Could not determine file type. Extension: "${ext || 'none'}"`);
}

async function upload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const tempPath = req.file.path;
        const originalName = req.file.originalname;
        const ownerId = req.user.userId;  // <-- DEFINED HERE

        console.log('Uploading:', originalName);

        try {
            const realMimeType = await validateMagicBytes(tempPath, originalName);
            const storageName = req.file.filename;
            const size = req.file.size;

            await fileService.createFile(ownerId, originalName, storageName, size, realMimeType);

            // Emit real-time event to all of this user's connected tabs
            const io = req.app.get('io');
            if (io) {
                io.to(`user:${ownerId}`).emit('file:uploaded', {
                    file: {
                        originalName,
                        size,
                        mimeType: realMimeType
                    }
                });
            }

            res.status(201).json({
                message: 'File uploaded successfully',
                file: { originalName, size, mimeType: realMimeType }
            });
        } catch (err) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            throw err;
        }
    } catch (err) {
        console.error('Upload error:', err.message);
        res.status(400).json({ error: err.message });
    }
}

async function list(req, res) {
    try {
        const ownerId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.q || null;
        
        const result = await fileService.getFiles(ownerId, page, limit, search);
        
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
        const file = await fileService.getFile(req.params.id, req.user.userId);
        if (!file) return res.status(404).json({ error: 'File not found' });

        const filePath = path.join(__dirname, '..', 'uploads', file.storage_name);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.setHeader('Content-Type', file.mime_type);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function remove(req, res) {
    try {
        const fileId = req.params.id;
        const ownerId = req.user.userId;  // <-- DEFINED HERE

        const storageName = await fileService.deleteFile(fileId, ownerId);

        // Delete from disk
        const filePath = path.join(__dirname, '..', 'uploads', storageName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Emit real-time event to all of this user's tabs
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${ownerId}`).emit('file:deleted', { fileId });
        }

        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        if (err.message === 'File not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
}

module.exports = { upload, list, download, remove };