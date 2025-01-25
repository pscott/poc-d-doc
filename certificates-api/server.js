import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Database connection
let db;

async function initializeDb() {
    try {
        db = await open({
            filename: './certificates.db',
            driver: sqlite3.Database
        });
        console.log('Successfully connected to database');
    } catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
}

// Initialize database connection
initializeDb();

// API Routes

// Get all providers
app.get('/api/providers', async (req, res) => {
    try {
        const providers = await db.all('SELECT * FROM providers');
        res.json(providers);
    } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get certificates by provider
app.get('/api/certificates/provider/:name', async (req, res) => {
    try {
        const certificates = await db.all(`
            SELECT c.*, p.name as provider_name, p.trade_name
            FROM certificates c
            JOIN providers p ON c.provider_id = p.id
            WHERE p.name = ?
        `, req.params.name);
        res.json(certificates);
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get certificate by serial number
app.get('/api/certificates/serial/:serialNumber', async (req, res) => {
    try {
        const certificate = await db.get(`
            SELECT c.*, p.name as provider_name, p.trade_name
            FROM certificates c
            JOIN providers p ON c.provider_id = p.id
            WHERE c.serial_number = ?
        `, req.params.serialNumber);
        
        if (!certificate) {
            res.status(404).json({ error: 'Certificate not found' });
            return;
        }
        
        res.json(certificate);
    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get valid certificates
app.get('/api/certificates/valid', async (req, res) => {
    try {
        const now = new Date().toISOString();
        const certificates = await db.all(`
            SELECT c.*, p.name as provider_name, p.trade_name
            FROM certificates c
            JOIN providers p ON c.provider_id = p.id
            WHERE c.not_valid_before <= ?
            AND c.not_valid_after >= ?
        `, now, now);
        res.json(certificates);
    } catch (error) {
        console.error('Error fetching valid certificates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get certificate for verification (by CA ID and Cert ID)
app.get('/api/certificates/verification', async (req, res) => {
    const { caId, certId } = req.query;
    
    if (!caId || !certId) {
        res.status(400).json({ error: 'Missing caId or certId parameter' });
        return;
    }

    try {
        const certificate = await db.get(`
            SELECT c.*, p.name as provider_name, p.trade_name
            FROM certificates c
            JOIN providers p ON c.provider_id = p.id
            WHERE p.name LIKE ? OR c.subject_name LIKE ?
        `, `%${caId}%`, `%${certId}%`);
        
        if (!certificate) {
            res.status(404).json({ error: 'Certificate not found' });
            return;
        }
        
        res.json(certificate);
    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Certificates API server running at http://localhost:${port}`);
}); 