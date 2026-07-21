const { query, pool } = require('../db');

async function createFile(ownerId, originalName, storageName, size, mimeType) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query(
            'SELECT storage_used, storage_limit FROM users WHERE id = $1 FOR UPDATE',
            [ownerId]
        );

        if (userRes.rows.length === 0) {
            throw new Error('User not found');
        }

        const { storage_used, storage_limit } = userRes.rows[0];

        if (parseInt(storage_used) + size > parseInt(storage_limit)) {
            throw new Error('Storage quota exceeded');
        }

        await client.query(
            'INSERT INTO files (owner_id, original_name, storage_name, size, mime_type) VALUES ($1, $2, $3, $4, $5)',
            [ownerId, originalName, storageName, size, mimeType]
        );

        await client.query(
            'UPDATE users SET storage_used = storage_used + $1 WHERE id = $2',
            [size, ownerId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function getFiles(ownerId, page, limit, searchQuery = null) {
    const offset = (page - 1) * limit;
    
    if (searchQuery && searchQuery.trim() !== '') {
        const search = `%${searchQuery.trim()}%`;
        const filesResult = await query(
            'SELECT id, original_name, size, mime_type, uploaded_at FROM files WHERE owner_id = $1 AND original_name ILIKE $2 ORDER BY uploaded_at DESC LIMIT $3 OFFSET $4',
            [ownerId, search, limit, offset]
        );
        const countResult = await query(
            'SELECT COUNT(*) FROM files WHERE owner_id = $1 AND original_name ILIKE $2',
            [ownerId, search]
        );
        return {
            files: filesResult.rows,
            total: parseInt(countResult.rows[0].count)
        };
    }
    
    const filesResult = await query(
        'SELECT id, original_name, size, mime_type, uploaded_at FROM files WHERE owner_id = $1 ORDER BY uploaded_at DESC LIMIT $2 OFFSET $3',
        [ownerId, limit, offset]
    );
    
    const countResult = await query(
        'SELECT COUNT(*) FROM files WHERE owner_id = $1',
        [ownerId]
    );
    
    return {
        files: filesResult.rows,
        total: parseInt(countResult.rows[0].count)
    };
}

async function getFile(fileId, ownerId) {
    const result = await query(
        'SELECT * FROM files WHERE id = $1 AND owner_id = $2',
        [fileId, ownerId]
    );
    return result.rows[0] || null;
}

async function deleteFile(fileId, ownerId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const fileRes = await client.query(
            'SELECT storage_name, size FROM files WHERE id = $1 AND owner_id = $2',
            [fileId, ownerId]
        );

        if (fileRes.rows.length === 0) {
            throw new Error('File not found');
        }

        const { storage_name, size } = fileRes.rows[0];

        await client.query('DELETE FROM files WHERE id = $1', [fileId]);

        await client.query(
            'UPDATE users SET storage_used = storage_used - $1 WHERE id = $2',
            [size, ownerId]
        );

        await client.query('COMMIT');
        return storage_name;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    createFile,
    getFiles,
    getFile,
    deleteFile
};