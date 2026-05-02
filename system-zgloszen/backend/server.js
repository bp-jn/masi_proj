// backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3001;


app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./baza.sqlite', (err) => {
    if (err) console.error('Błąd połączenia z bazą:', err.message);
    else console.log('Połączono z bazą SQLite.');
});


db.serialize(() => {
    
    db.run(`CREATE TABLE IF NOT EXISTS Uzytkownik (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imieNazwisko TEXT,
        email TEXT UNIQUE,
        hasloHash TEXT,
        rola TEXT
    )`);

    
    db.run(`CREATE TABLE IF NOT EXISTS Zgloszenie (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temat TEXT,
        opis TEXT,
        statusZgloszenia TEXT,
        priorytet TEXT,
        dataUtworzenia DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});


app.get('/api/zgloszenia', (req, res) => {
    db.all(`SELECT * FROM Zgloszenie`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/zgloszenia', (req, res) => {
    const { temat, opis, priorytet } = req.body;
    const status = 'Nowe'; 
    
    db.run(`INSERT INTO Zgloszenie (temat, opis, statusZgloszenia, priorytet) VALUES (?, ?, ?, ?)`, 
        [temat, opis, status, priorytet], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Dodano zgłoszenie' });
        }
    );
});

app.listen(port, () => {
    console.log(`Serwer API działa na porcie ${port}`);
});