const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



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
        kategoria TEXT,
        zalacznik TEXT,
        notatkaSerwisanta TEXT, 
        dataUtworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        klient_id INTEGER,
        serwisant_id INTEGER
    )`);

    db.get(`SELECT COUNT(*) AS count FROM Uzytkownik WHERE rola = 'Administrator'`, [], async (err, row) => {
        if (err) {
            console.error('Błąd podczas sprawdzania tabeli administratorów:', err.message);
            return;
        }

        if (row.count === 0) {
            try {
                const domyslnyEmail = 'admin@admin.pl';
                const domyslneHaslo = 'admin';
                
                const salt = await bcrypt.genSalt(10);
                const hasloHash = await bcrypt.hash(domyslneHaslo, salt);

                db.run(`INSERT INTO Uzytkownik (imieNazwisko, email, hasloHash, rola) VALUES (?, ?, ?, ?)`,
                    ['Główny Administrator', domyslnyEmail, hasloHash, 'Administrator'],
                    (insertErr) => {
                        if (insertErr) {
                            console.error('Nie udało się utworzyć konta administratora:', insertErr.message);
                        } else {
                            console.log(' BRAK ADMINISTRATORA W BAZIE! UTWORZONO KONTO:');
                            console.log(` Email: ${domyslnyEmail}`);
                            console.log(` Hasło: ${domyslneHaslo}`);
                        }
                    }
                );
            } catch (bcryptError) {
                console.error('Błąd podczas hashowania hasła dla admina:', bcryptError);
            }
        }
    });
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
        db.all(`
            SELECT Zgloszenie.*, Uzytkownik.imieNazwisko AS klient_imieNazwisko 
            FROM Zgloszenie
            LEFT JOIN Uzytkownik ON Zgloszenie.klient_id = Uzytkownik.id
            WHERE Zgloszenie.klient_id = ?
        `, [userId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ data: rows });
        });
    } else {
        db.all(`
            SELECT Zgloszenie.*, Uzytkownik.imieNazwisko AS klient_imieNazwisko 
            FROM Zgloszenie
            LEFT JOIN Uzytkownik ON Zgloszenie.klient_id = Uzytkownik.id
        `, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ data: rows });
        });
    }
});

app.post('/api/zgloszenia', upload.single('zalacznik'), (req, res) => {
    const { temat, opis, klient_id, kategoria } = req.body;
    
    const zalacznikUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(`INSERT INTO Zgloszenie (temat, opis, statusZgloszenia, priorytet, klient_id, kategoria, zalacznik) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [temat, opis, 'Nowe', 'Niski', klient_id, kategoria, zalacznikUrl],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Dodano zgłoszenie' });
        }
    );
});
app.put('/api/zgloszenia/:id', (req, res) => {
    const { statusZgloszenia, serwisant_id, priorytet, notatkaSerwisanta } = req.body;
    const zgloszenieId = req.params.id;

    const updates = [];
    const params = [];

    if (priorytet) { updates.push('priorytet = ?'); params.push(priorytet); }
    if (statusZgloszenia) { updates.push('statusZgloszenia = ?'); params.push(statusZgloszenia); }
    if (serwisant_id !== undefined) { updates.push('serwisant_id = ?'); params.push(serwisant_id); }
    if (notatkaSerwisanta !== undefined) { updates.push('notatkaSerwisanta = ?'); params.push(notatkaSerwisanta); }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'Brak danych do aktualizacji' });
    }

    const query = `UPDATE Zgloszenie SET ${updates.join(', ')} WHERE id = ?`;
    params.push(zgloszenieId);

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Zaktualizowano zgłoszenie' });
    });
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
app.get('/api/raporty/zgloszenia', (req, res) => {
    const { miesiac, rok } = req.query;

    const queryStatusy = `
        SELECT statusZgloszenia, COUNT(*) as ilosc 
        FROM Zgloszenie 
        WHERE strftime('%m', dataUtworzenia) = ? AND strftime('%Y', dataUtworzenia) = ?
        GROUP BY statusZgloszenia
    `;

    const querySerwisanci = `
        SELECT IFNULL(U.imieNazwisko, 'Brak (nieprzypisane)') as serwisant, COUNT(Z.id) as ilosc
        FROM Zgloszenie Z
        LEFT JOIN Uzytkownik U ON Z.serwisant_id = U.id
        WHERE strftime('%m', Z.dataUtworzenia) = ? AND strftime('%Y', Z.dataUtworzenia) = ?
        GROUP BY Z.serwisant_id
    `;

    db.all(queryStatusy, [miesiac, rok], (err, rowStatusy) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(querySerwisanci, [miesiac, rok], (err, rowSerwisanci) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const total = rowStatusy.reduce((sum, row) => sum + row.ilosc, 0);
            
            res.json({ data: { total, szczegoly: rowStatusy, serwisanci: rowSerwisanci } });
        });
    });
});
app.listen(port, () => {
    console.log(`Serwer API działa na porcie ${port}`);
});