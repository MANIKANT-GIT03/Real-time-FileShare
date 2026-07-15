require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { query } = require('./db');
const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', async (req, res) => {
try {
const result = await query('SELECT NOW()');
res.json({ status: 'ok', time: result.rows[0].now });
} catch (err) {
res.status(500).json({ status: 'error', message: err.message });
}
});
app.use('/api', authRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});