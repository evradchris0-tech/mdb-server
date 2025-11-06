// ============================================
// MDB - SERVEUR BACKEND (Node.js + Express)
// ============================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============== MIDDLEWARES ==============

// CORS - Autorise les requêtes depuis n'importe quel domaine
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
    credentials: true
}));

// Parser JSON
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// ============== STOCKAGE DONNÉES ==============

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'mdb_data.json');

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('✓ Dossier /data créé');
}

// Charger les données existantes
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(rawData);
        }
        return [];
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        return [];
    }
}

// Sauvegarder les données
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        return false;
    }
}

// ============== ROUTES API ==============

// Route test
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        server: 'MDB Receiver',
        timestamp: new Date().toISOString()
    });
});

// Route pour recevoir les données
app.post('/api/mdb/receive', (req, res) => {
    try {
        const receivedData = req.body;
        
        // Valider les données
        if (!receivedData.timestamp) {
            return res.status(400).json({ 
                error: 'Données invalides: timestamp manquant' 
            });
        }
        
        console.log('\n📩 NOUVELLES DONNÉES REÇUES');
        console.log('═══════════════════════════════');
        console.log('Timestamp:', receivedData.timestamp);
        console.log('IP Client:', req.ip);
        console.log('Device:', receivedData.deviceInfo?.platform);
        
        // Ajouter les données à la liste
        let allData = loadData();
        allData.push(receivedData);
        
        // Sauvegarder
        const saved = saveData(allData);
        
        if (saved) {
            console.log('✓ Données sauvegardées');
            console.log('Total entrées:', allData.length);
            console.log('═══════════════════════════════\n');
            
            res.status(200).json({ 
                success: true,
                message: 'Données reçues et sauvegardées',
                dataCount: allData.length,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({ 
                error: 'Erreur lors de la sauvegarde' 
            });
        }
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur serveur: ' + error.message 
        });
    }
});

// Route pour récupérer les données
app.get('/api/mdb/data', (req, res) => {
    try {
        const allData = loadData();
        res.json({
            count: allData.length,
            data: allData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pour récupérer les dernières données
app.get('/api/mdb/data/latest', (req, res) => {
    try {
        const allData = loadData();
        const latest = allData.slice(-10).reverse();
        res.json({
            count: latest.length,
            data: latest
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pour exporter les données en JSON
app.get('/api/mdb/export', (req, res) => {
    try {
        const allData = loadData();
        res.setHeader('Content-Disposition', 'attachment; filename="mdb_export.json"');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(allData, null, 2));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pour supprimer les données
app.delete('/api/mdb/data', (req, res) => {
    try {
        saveData([]);
        res.json({ 
            success: true,
            message: 'Toutes les données ont été supprimées'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.use(express.static(path.join(__dirname, 'public')));

// ============== DÉMARRAGE SERVEUR ==============

app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════╗');
    console.log('║   🔐 MDB RECEIVER - SERVEUR ACTIF   ║');
    console.log('╚════════════════════════════════════╝');
    console.log(`\n📡 Serveur en écoute sur: http://localhost:${PORT}`);
    console.log(`\n📊 API Endpoints:`);
    console.log(`   GET  /api/health              - État du serveur`);
    console.log(`   POST /api/mdb/receive          - Recevoir les données`);
    console.log(`   GET  /api/mdb/data             - Toutes les données`);
    console.log(`   GET  /api/mdb/data/latest      - 10 dernières entrées`);
    console.log(`   GET  /api/mdb/export           - Exporter en JSON`);
    console.log(`   DELETE /api/mdb/data           - Supprimer toutes les données`);
    console.log(`\n📂 Données sauvegardées dans: ${DATA_FILE}`);
    console.log(`\n⏳ En attente de données...\n`);
});

module.exports = app;