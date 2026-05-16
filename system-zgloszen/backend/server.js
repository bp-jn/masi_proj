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
        dataUtworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        klient_id INTEGER,
        serwisant_id INTEGER
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
            function (err) {
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
    const { userId, rola } = req.query;

    if (rola === 'Klient') {
        db.all(`SELECT * FROM Zgloszenie WHERE klient_id = ?`, [userId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ data: rows });
        });
    } else {
        db.all(`SELECT * FROM Zgloszenie`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ data: rows });
        });
    }
});

app.post('/api/zgloszenia', (req, res) => {
    const { temat, opis, priorytet, klient_id } = req.body;
    db.run(`INSERT INTO Zgloszenie (temat, opis, statusZgloszenia, priorytet, klient_id) VALUES (?, ?, ?, ?, ?)`,
        [temat, opis, 'Nowe', priorytet, klient_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Dodano zgłoszenie' });
        }
    );
});
app.put('/api/zgloszenia/:id', (req, res) => {
    const { statusZgloszenia, serwisant_id } = req.body;
    const zgloszenieId = req.params.id;

    db.run(`UPDATE Zgloszenie SET statusZgloszenia = ?, serwisant_id = ? WHERE id = ?`,
        [statusZgloszenia, serwisant_id, zgloszenieId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Zaktualizowano status zgłoszenia' });
        }
    );
});

app.get('/api/uzytkownicy', (req, res) => {
    db.all(`SELECT id, imieNazwisko, email, rola FROM Uzytkownik`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.put('/api/uzytkownicy/:id/rola', (req, res) => {
    const { rola } = req.body;
    db.run(`UPDATE Uzytkownik SET rola = ? WHERE id = ?`, [rola, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Zaktualizowano rolę' });
    });
});

app.delete('/api/uzytkownicy/:id', (req, res) => {
    db.run(`DELETE FROM Uzytkownik WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usunięto konto' });
    });
});
app.listen(port, () => {
    console.log(`Serwer API działa na porcie ${port}`);
});