const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');
const BACKUP_FILE = path.join(__dirname, 'data.backup.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static frontend assets
app.use(express.static(__dirname));

// Healthcheck
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get current database
app.get('/api/data', (req, res) => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return res.status(404).json({ error: 'Database file not found' });
        }
        let raw = fs.readFileSync(DATA_FILE, 'utf8');
        // Strip BOM if present
        if (raw.charCodeAt(0) === 0xFEFF) {
            raw = raw.slice(1);
        }
        const data = JSON.parse(raw);
        res.json(data);
    } catch (err) {
        console.error('Error reading data:', err);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Save database
app.post('/api/save', (req, res) => {
    try {
        const body = req.body;
        if (!body || !body.employees || !body.projects) {
            return res.status(400).json({ error: 'Invalid database payload' });
        }

        // Backup existing data
        if (fs.existsSync(DATA_FILE)) {
            fs.copyFileSync(DATA_FILE, BACKUP_FILE);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2), 'utf8');
        console.log(`[${new Date().toISOString()}] Database saved successfully.`);
        res.json({ status: 'ok', message: 'Saved successfully' });
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Forgot Admin Password - Sends/Dispatches directly to petermounir461@gmail.com
app.post('/api/forgot-password', (req, res) => {
    try {
        let pin = 'IXL2026';
        if (fs.existsSync(DATA_FILE)) {
            let raw = fs.readFileSync(DATA_FILE, 'utf8');
            if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
            const data = JSON.parse(raw);
            if (data.adminPin) pin = data.adminPin;
        }

        // Direct background web mail dispatch
        try {
            const https = require('https');
            const payload = JSON.stringify({
                _subject: "IXL Tracker - Admin Password Recovery",
                name: "IXL Admin Security",
                email: "petermounir461@gmail.com",
                message: `Hello Peter,\n\nYour Admin Password for IXL Team Hours Tracker is: ${pin}\n\nAuthorized Admin: Peter MOUNIR\nSystem: IXL Team Hours Tracker\nTimestamp: ${new Date().toISOString()}`
            });
            const opt = {
                hostname: 'formsubmit.co',
                path: '/ajax/petermounir461@gmail.com',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    'Accept': 'application/json'
                }
            };
            const postReq = https.request(opt, () => {});
            postReq.on('error', () => {});
            postReq.write(payload);
            postReq.end();
        } catch (netErr) {}

        console.log(`[${new Date().toISOString()}] Password recovery directly dispatched to petermounir461@gmail.com (PIN: ${pin})`);
        res.json({ status: 'ok', message: 'Admin password sent directly to petermounir461@gmail.com', email: 'petermounir461@gmail.com' });
    } catch (err) {
        console.error('Error in forgot-password:', err);
        res.status(500).json({ error: 'Failed to process password recovery' });
    }
});

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`IXL Team Hours Tracker server running on port ${PORT}`);
});

