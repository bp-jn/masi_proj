// backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');

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

app.post('/api/register', async (req, res) => {
    const { imieNazwisko, email, haslo, rola } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hasloHash = await bcrypt.hash(haslo, salt);
        const rolaUzytkownika = rola || 'Klient'; 

        db.run(`INSERT INTO Uzytkownik (imieNazwisko, email, hasloHash, rola) VALUES (?, ?, ?, ?)`, 
            [imieNazwisko, email, hasloHash, rolaUzytkownika], 
            function(err) {
                if (err) return res.status(400).json({ error: 'Konto z tym emailem już istnieje!' });
                res.json({ message: 'Konto zostało utworzone. Możesz się zalogować!' });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, haslo } = req.body;

    db.get(`SELECT * FROM Uzytkownik WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

        const isMatch = await bcrypt.compare(haslo, user.hasloHash);
        if (!isMatch) return res.status(401).json({ error: 'Nieprawidłowe hasło' });

        res.json({
            message: 'Zalogowano pomyślnie',
            user: { id: user.id, imieNazwisko: user.imieNazwisko, email: user.email, rola: user.rola }
        });
    });
});

app.get('/api/zgloszenia', (req, res) => {
    db.all(`SELECT * FROM Zgloszenie`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/zgloszenia', (req, res) => {
    const { temat, opis, priorytet } = req.body;
    db.run(`INSERT INTO Zgloszenie (temat, opis, statusZgloszenia, priorytet) VALUES (?, ?, ?, ?)`, 
        [temat, opis, 'Nowe', priorytet], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Dodano zgłoszenie' });
        }
    );
});

app.listen(port, () => {
    console.log(`Serwer API działa na porcie ${port}`);
});