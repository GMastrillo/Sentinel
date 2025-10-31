const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Database connection
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'gm',
    password: process.env.MYSQL_PASSWORD || 'gabriel2g',
    database: process.env.MYSQL_DATABASE || 'Sentinel',
    connectionLimit: 10
});

// API Routes
app.post('/api/auth/token', async (req, res) => {
    const { discordId, userToken, email } = req.body;

    try {
        const conn = await pool.getConnection();

        // Upsert user
        await conn.execute(
            `INSERT INTO users (discord_id, user_token, email)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE user_token = ?, email = ?`,
            [discordId, userToken, email, userToken, email]
        );

        // Activate token
        await conn.execute(
            'INSERT INTO active_tokens (discord_id, token_value) VALUES (?, ?)',
            [discordId, userToken]
        );

        conn.release();
        res.json({ success: true, message: 'Token registrado!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/voice/join', async (req, res) => {
    const { discordId, guildId, channelId } = req.body;

    try {
        const conn = await pool.getConnection();
        await conn.execute(
            'INSERT INTO voice_sessions (discord_id, guild_id, channel_id) VALUES (?, ?, ?)',
            [discordId, guildId, channelId]
        );
        conn.release();

        res.json({ success: true, message: 'Call 24/7 iniciada!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/user/:discordId', async (req, res) => {
    const discordId = req.params.discordId;

    try {
        const conn = await pool.getConnection();
        const [users] = await conn.execute('SELECT * FROM users WHERE discord_id = ?', [discordId]);
        const [tokens] = await conn.execute('SELECT * FROM active_tokens WHERE discord_id = ? AND is_active = true', [discordId]);
        const [calls] = await conn.execute('SELECT * FROM voice_sessions WHERE discord_id = ? AND is_active = true', [discordId]);
        conn.release();

        res.json({
            user: users[0],
            hasToken: tokens.length > 0,
            inCall: calls.length > 0
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3000, () => console.log('🚀 API Sentinel rodando na porta 3000'));