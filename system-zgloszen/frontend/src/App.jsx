import { useState, useEffect } from 'react';

function App() {
    const [zalogowanyUzytkownik, setZalogowanyUzytkownik] = useState(null);
    const [widokRejestracji, setWidokRejestracji] = useState(false);


    const [email, setEmail] = useState('');
    const [haslo, setHaslo] = useState('');
    const [imieNazwisko, setImieNazwisko] = useState('');


    const [zgloszenia, setZgloszenia] = useState([]);
    const [form, setForm] = useState({ temat: '', opis: '', priorytet: 'Niski' });


    const handleLogin = (e) => {
        e.preventDefault();
        fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, haslo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setZalogowanyUzytkownik(data.user);
                    setEmail(''); setHaslo('');
                } else {
                    alert(data.error);
                }
            });
    };


    const handleRegister = (e) => {
        e.preventDefault();
        fetch('http://localhost:3001/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imieNazwisko, email, haslo, rola: 'Serwisant' })
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message || data.error);
                if (data.message) setWidokRejestracji(false);
            });
    };

    const handleLogout = () => {
        setZalogowanyUzytkownik(null);
    };


    const fetchZgloszenia = () => {
        if (!zalogowanyUzytkownik) return;
        fetch(`http://localhost:3001/api/zgloszenia?userId=${zalogowanyUzytkownik.id}&rola=${zalogowanyUzytkownik.rola}`)
            .then(res => res.json())
            .then(data => setZgloszenia(data.data));
    };

    useEffect(() => {
        if (zalogowanyUzytkownik) fetchZgloszenia();
    }, [zalogowanyUzytkownik]);

    const handleZgloszenieSubmit = (e) => {
        e.preventDefault();
        fetch('http://localhost:3001/api/zgloszenia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, klient_id: zalogowanyUzytkownik.id })
        }).then(() => {
            setForm({ temat: '', opis: '', priorytet: 'Niski' });
            fetchZgloszenia();
        });
    };


    if (!zalogowanyUzytkownik) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <article style={{ width: '100%', maxWidth: '400px', margin: '0 20px' }}>
                    <header>
                        <h2 style={{ textAlign: 'center', margin: 0 }}>{widokRejestracji ? 'Rejestracja' : 'Logowanie'}</h2>
                    </header>
                    
                    <form onSubmit={widokRejestracji ? handleRegister : handleLogin} style={{ margin: '20px 0' }}>
                        {widokRejestracji && (
                            <input type="text" placeholder="Imię i Nazwisko" required value={imieNazwisko} onChange={e => setImieNazwisko(e.target.value)} />
                        )}
                        <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
                        <input type="password" placeholder="Hasło" required value={haslo} onChange={e => setHaslo(e.target.value)} />
                        <button type="submit" style={{ width: '100%', marginBottom: 0 }}>{widokRejestracji ? 'Zarejestruj się' : 'Zaloguj się'}</button>
                    </form>

                    <footer style={{ textAlign: 'center' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); setWidokRejestracji(!widokRejestracji); }} className="secondary">
                            {widokRejestracji ? 'Masz już konto? Zaloguj się.' : 'Nie masz konta? Zarejestruj się.'}
                        </a>
                    </footer>
                </article>
            </div>
        );
    }
    const handleZmienStatus = (idZgloszenia, nowyStatus) => {
        fetch(`http://localhost:3001/api/zgloszenia/${idZgloszenia}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                statusZgloszenia: nowyStatus,
                serwisant_id: zalogowanyUzytkownik.id
            })
        }).then(() => fetchZgloszenia());
    };


    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <nav style={{ marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <ul>
                    <li><h2 style={{ margin: 0 }}>Panel: {zalogowanyUzytkownik.imieNazwisko} ({zalogowanyUzytkownik.rola})</h2></li>
                </ul>
                <ul>
                    <li><button className="secondary outline" style={{ margin: 0 }} onClick={handleLogout}>Wyloguj</button></li>
                </ul>
            </nav>

            <div className="grid">
                
                <div>
                    <article>
                        <header>
                            <h3 style={{ margin: 0 }}>Dodaj nowe zgłoszenie</h3>
                        </header>
                        <form onSubmit={handleZgloszenieSubmit} style={{ margin: 0 }}>
                            <input type="text" placeholder="Temat" required value={form.temat} onChange={(e) => setForm({ ...form, temat: e.target.value })} />
                            <textarea placeholder="Opis problemu" required value={form.opis} onChange={(e) => setForm({ ...form, opis: e.target.value })} />
                            <select value={form.priorytet} onChange={(e) => setForm({ ...form, priorytet: e.target.value })}>
                                <option value="Niski">Niski</option>
                                <option value="Średni">Średni</option>
                                <option value="Wysoki">Wysoki</option>
                            </select>
                            <button type="submit" style={{ marginBottom: 0 }}>Zgłoś problem</button>
                        </form>
                    </article>
                </div>

                <div>
                    <article>
                        <header>
                            <h3 style={{ margin: 0 }}>Historia zgłoszeń</h3>
                        </header>
                        
                        {zgloszenia.length === 0 ? (
                            <p>Brak zgłoszeń w systemie.</p>
                        ) : (
                            zgloszenia.map(z => (
                                <article key={z.id} style={{ marginBottom: '20px' }}>
                                    <header style={{ padding: '10px 20px' }}>
                                        <strong>[ID: {z.id}] {z.temat}</strong>
                                    </header>
                                    <div style={{ padding: '10px 20px' }}>
                                        <p style={{ margin: 0 }}>{z.opis}</p>
                                    </div>
                                    <footer style={{ padding: '10px 20px' }}>
                                        <small>
                                            Status: <strong>{z.statusZgloszenia}</strong> | Priorytet: {z.priorytet}
                                        </small>
                                    </footer>

                                    {zalogowanyUzytkownik.rola !== 'Klient' && (
                                        <div className="grid" style={{ marginTop: '10px', padding: '0 20px 20px 20px' }}>
                                            <button onClick={() => handleZmienStatus(z.id, 'W toku')}>Podejmij</button>
                                            <button className="secondary outline" onClick={() => handleZmienStatus(z.id, 'Rozwiązane')}>Zakończ</button>
                                        </div>
                                    )}
                                </article>
                            ))
                        )}
                    </article>
                </div>

            </div>
        </div>
    );
}

export default App;