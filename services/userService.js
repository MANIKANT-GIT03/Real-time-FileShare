const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const SALT_ROUNDS = 10;
async function createUser(username, email, password) {
const hash = await bcrypt.hash(password, SALT_ROUNDS);
const result = await query(
'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
[username, email, hash]
);
return result.rows[0];
}
async function findUserByEmail(email) {
const result = await query('SELECT * FROM users WHERE email = $1', [email]);
return result.rows[0] || null;
}
async function validatePassword(plainPassword, hash) {
return bcrypt.compare(plainPassword, hash);
}
function generateToken(user) {
return jwt.sign(
{ userId: user.id, username: user.username },
process.env.JWT_SECRET,
{ expiresIn: '7d' }
);
}
async function getUserById(userId) {
const result = await query(
'SELECT id, username, email, storage_used, storage_limit FROM users WHERE id = $1',
[userId]
);
return result.rows[0] || null;
}
module.exports = {
createUser,
findUserByEmail,
validatePassword,
generateToken,
getUserById
};