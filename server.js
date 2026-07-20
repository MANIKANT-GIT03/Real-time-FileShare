require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { createSocketServer } = require('./socket');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/shares');
const { query } = require('./db');

const app = express();
const server = http.createServer(app);

// Attach Socket.io to the same HTTP server
const io = createSocketServer(server);
app.set('io', io); // Make io accessible to controllers via req.app.get('io')

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Routes
app.use('/api', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});