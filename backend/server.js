require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db"); // You already have this!
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
connectDB(); // connect to MongoDB Atlas

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Configuration ---
// Make sure your .env file has your MONGO_URI
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_123"; // Use environment variable!

// --- Mongoose Models (Schemas) ---
// We need schemas for Users, Jobs, and Workers
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Schema for Jobs posted by Employers
const JobSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to the user who posted
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String },
    salary: { type: String },
    contact: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Job = mongoose.model('Job', JobSchema);

// Schema for Workers looking for jobs
const WorkerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to the user who posted
    name: { type: String, required: true },
    skill: { type: String, required: true },
    experience: { type: String },
    location: { type: String },
    contact: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Worker = mongoose.model('Worker', WorkerSchema);


// ===================================
// --- AUTHENTICATION MIDDLEWARE ---
// ===================================
// This is the "security guard" for your protected routes
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ msg: 'No token, authorization denied.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user; // Add user payload to request
        next(); // Move on to the route
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid.' });
    }
};


// ===================================
// --- API ROUTES ---
// ===================================

// --- Auth Routes (Public) ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'Please enter all fields.' });
        }
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'User with this email already exists.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        // Send 201 Created status
        res.status(201).json({ msg: 'Registration successful! Please log in.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error during registration.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
     try {
        const { email, password } = req.body;
        if (!email || !password) {
             return res.status(400).json({ msg: 'Please enter all fields.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials.' });
        }
        const payload = { user: { id: user.id, name: user.name } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(200).json({ token });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error during login.' });
    }
});

// --- Profile Route (Protected) ---
app.get('/api/auth/profile/me', authMiddleware, async (req, res) => {
    try {
        // req.user was added by the authMiddleware
        const userId = req.user.id;
        
        // Find user in DB (but not their password)
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        // Find jobs posted BY this user
        const jobs = await Job.find({ user: userId }).sort({ date: -1 });
        
        // Find worker profiles created BY this user
        const workers = await Worker.find({ user: userId }).sort({ date: -1 });

        res.json({ user, jobs, workers });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- Job Routes (Protected) ---
// GET all jobs
app.get('/api/jobs', authMiddleware, async (req, res) => {
    try {
        const jobs = await Job.find().sort({ date: -1 }); // Get newest first
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new job
app.post('/api/jobs', authMiddleware, async (req, res) => {
    try {
        const { title, description, location, salary, contact } = req.body;
        
        const newJob = new Job({
            title,
            description,
            location,
            salary,
            contact,
            user: req.user.id // Link the job to the logged-in user
        });

        const job = await newJob.save();
        res.status(201).json(job);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- Worker Routes (Protected) ---
// GET all workers
app.get('/api/workers', authMiddleware, async (req, res) => {
    try {
        const workers = await Worker.find().sort({ date: -1 });
        res.json(workers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new worker profile
app.post('/api/workers', authMiddleware, async (req, res) => {
    try {
        const { name, skill, experience, location, contact } = req.body;
        
        const newWorker = new Worker({
            name,
            skill,
            experience,
            location,
            contact,
            user: req.user.id // Link the profile to the logged-in user
        });

        const worker = await newWorker.save();
        res.status(201).json(worker);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Contact Route (Public) ---
// This is the new route for your contact form
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;

    console.log('--- New Contact Form Submission ---');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Message: ${message}`);
    console.log('-----------------------------------');

    // Here you would add code to send an email (e.g., using Nodemailer)
    // For now, we just log it and send a success response.
    
    res.status(200).json({ msg: "Message received successfully!" });
});


// --- Start Server ---
// Your frontend app.js is looking for port 5500
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

