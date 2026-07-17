const userService = require('../services/userService');

async function signup(req, res) 
{
    try 
    {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const existingUser = await userService.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const user = await userService.createUser(username, email, password);
        res.status(201).json({ message: 'User created', user });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


async function login(req, res) 
{
    try 
    {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await userService.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await userService.validatePassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = userService.generateToken(user);
        res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username, email: user.email } });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


async function me(req, res) 
{
    try 
    {
        const user = await userService.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


module.exports = {
    signup,
    login,
    me
};