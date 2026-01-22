const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'studybeats_secret_key_2024';

app.use(express.json());
app.use(cors());

// MongoDB Connection
const uri = "mongodb+srv://ishalatey1_db_user:Blackpink%4027_db_user@cluster0.lxww2ui.mongodb.net/?appName=Cluster0";

mongoose.connect(uri)
    .then(() => console.log("🚀 MongoDB Atlas Connected Successfully!"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- User Model ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    streak: { type: Number, default: 0 },
    lastStudyDate: { type: String, default: "" },
    totalMinutes: { type: Number, default: 0 }, // ADD THIS LINE
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// --- ROUTES ---

app.post('/api/register', async (req, res) => {
    try {
        let { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });
        
        username = username.trim();
        email = email.trim().toLowerCase();

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(409).json({ success: false, message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ success: true, token, username: newUser.username, email: newUser.email });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const identifier = username.trim();

        const user = await User.findOne({
            $or: [
                { username: { $regex: `^${identifier}$`, $options: 'i' } },
                { email: { $regex: `^${identifier}$`, $options: 'i' } }
            ]
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ success: true, token, username: user.username, email: user.email });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/profile/data', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
});

app.post('/api/update-streak', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const today = new Date().toISOString().split('T')[0];
        const lastDate = user.lastStudyDate;

        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                user.streak += 1;
            } else {
                user.streak = 1;
            }
            user.lastStudyDate = today;
            await user.save();
        }
        res.json({ success: true, streak: user.streak });
    } catch (error) {
        res.status(500).json({ success: false, message: "Streak update failed" });
    }
});

app.post('/api/update-focus-time', authenticateToken, async (req, res) => {
    try {
        const { minutes } = req.body; // e.g., 25
        const user = await User.findById(req.user.id);
        
        user.totalMinutes += parseInt(minutes);
        await user.save();

        res.json({ success: true, totalMinutes: user.totalMinutes });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update focus time" });
    }
});

app.listen(PORT, () => console.log(`✅ Server on http://localhost:${PORT}`));