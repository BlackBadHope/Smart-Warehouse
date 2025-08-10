const express = require('express');
const WebSocket = require('ws');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// SQLite Database
const dbPath = path.join(__dirname, 'inventory.db');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    warehouseId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id)
  );
  
  CREATE TABLE IF NOT EXISTS shelves (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    roomId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roomId) REFERENCES rooms (id)
  );
  
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    price REAL,
    purchaseDate TEXT,
    expiryDate TEXT,
    priority TEXT DEFAULT 'Normal',
    description TEXT,
    labels TEXT,
    barcode TEXT,
    shelfId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shelfId) REFERENCES shelves (id)
  );
  
  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// WebSocket Server for real-time sync
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected. Total clients:', clients.size);
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Total clients:', clients.size);
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // Broadcast to all other clients
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
});

// Prepared statements for better performance
const getWarehouses = db.prepare('SELECT * FROM warehouses ORDER BY createdAt');
const insertWarehouse = db.prepare('INSERT INTO warehouses (id, name) VALUES (?, ?)');
const insertSyncLog = db.prepare('INSERT INTO sync_log (entityType, entityId, action, data) VALUES (?, ?, ?, ?)');

// API Routes
app.get('/api/warehouses', (req, res) => {
  try {
    const rows = getWarehouses.all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/warehouses', (req, res) => {
  const { id, name } = req.body;
  try {
    const result = insertWarehouse.run(id, name);
    
    // Log sync action
    insertSyncLog.run('warehouse', id, 'create', JSON.stringify(req.body));
    
    // Broadcast to all clients
    const syncData = { type: 'warehouse_created', data: req.body };
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(syncData));
      }
    });
    
    res.json({ id: result.lastInsertRowid, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Similar routes for rooms, shelves, items...

// Auto-discovery service (simplified for Windows compatibility)
// For production, use proper mDNS library or service discovery

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.6.0',
    type: 'home-server',
    clients: clients.size,
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏠 Inventory OS Home Server running on port ${PORT}`);
  console.log(`🔄 WebSocket server running on port 8080`);
  console.log(`📡 Server accessible on local network at http://[your-ip]:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close();
  process.exit(0);
});