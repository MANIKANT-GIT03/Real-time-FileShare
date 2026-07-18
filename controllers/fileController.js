const fs = require('fs');
const path = require('path');
const fileService = require('../services/fileService');

async function validateMagicBytes(filePath, originalName) {
    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(filePath);

    if (detected) {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowed.includes(detected.mime)) {
            throw new Error(`File type "${detected.mime}" is not allowed`);
        }
        return detected.mime;
    }

    const ext = path.extname(originalName).toLowerCase();
    if (['.txt', '.csv', '.md', '.json', '.log'].includes(ext)) {
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
    console.log('UPLOAD FUNCTION RUNNING');
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempPath = req.file.path;
    const originalName = req.file.originalname;

    console.log('File:', originalName);

    try {
        const realMimeType = await validateMagicBytes(tempPath, originalName);
        console.log('Mime type:', realMimeType);

        await fileService.createFile(
            req.user.userId,
            originalName,
            req.file.filename,
            req.file.size,
            realMimeType
        );

        res.status(201).json({ message: 'File uploaded successfully' });
    } catch (err) {
        console.log('Upload error:', err.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(400).json({ error: err.message });
    }
}

async function list(req, res) {
    try {
        const result = await fileService.getFiles(req.user.userId, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20);
        res.json({ files: result.files, pagination: { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 20, total: result.total } });
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
        const storageName = await fileService.deleteFile(req.params.id, req.user.userId);
        const filePath = path.join(__dirname, '..', 'uploads', storageName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        if (err.message === 'File not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: err.message });
    }
}

module.exports = { upload, list, download, remove };