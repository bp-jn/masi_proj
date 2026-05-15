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
            <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
                <h1>{widokRejestracji ? 'Rejestracja' : 'Logowanie'}</h1>

                <form onSubmit={widokRejestracji ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {widokRejestracji && (
                        <input type="text" placeholder="Imię i Nazwisko" required value={imieNazwisko} onChange={e => setImieNazwisko(e.target.value)} />
                    )}
                    <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Hasło" required value={haslo} onChange={e => setHaslo(e.target.value)} />
                    <button type="submit">{widokRejestracji ? 'Zarejestruj się' : 'Zaloguj się'}</button>
                </form>

                <p style={{ marginTop: '20px', cursor: 'pointer', color: 'blue' }} onClick={() => setWidokRejestracji(!widokRejestracji)}>
                    {widokRejestracji ? 'Masz już konto? Zaloguj się.' : 'Nie masz konta? Zarejestruj się.'}
                </p>
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
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Panel: {zalogowanyUzytkownik.imieNazwisko} ({zalogowanyUzytkownik.rola})</h1>
                <button onClick={handleLogout}>Wyloguj</button>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
                <h2>Dodaj nowe zgłoszenie</h2>
                <form onSubmit={handleZgloszenieSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                    <input
                        type="text" placeholder="Temat" required value={form.temat} onChange={(e) => setForm({ ...form, temat: e.target.value })}
                    />
                    <textarea
                        placeholder="Opis problemu" required value={form.opis} onChange={(e) => setForm({ ...form, opis: e.target.value })}
                    />
                    <select value={form.priorytet} onChange={(e) => setForm({ ...form, priorytet: e.target.value })}>
                        <option value="Niski">Niski</option>
                        <option value="Średni">Średni</option>
                        <option value="Wysoki">Wysoki</option>
                    </select>
                    <button type="submit">Zgłoś problem</button>
                </form>
            </div>

            <h2>Historia zgłoszeń</h2>
            <ul>
                {zgloszenia.map(z => (
                    <li key={z.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee' }}>
                        <strong>[ID: {z.id}] {z.temat}</strong> - Status: <span style={{ color: 'red' }}>{z.statusZgloszenia}</span> (Priorytet: {z.priorytet})
                        <p>{z.opis}</p>

                        {zalogowanyUzytkownik.rola !== 'Klient' && (
                            <div style={{ marginTop: '10px', gap: '5px', display: 'flex' }}>
                                <button onClick={() => handleZmienStatus(z.id, 'W toku')}>Podejmij (W toku)</button>
                                <button onClick={() => handleZmienStatus(z.id, 'Rozwiązane')}>Oznacz jako Rozwiązane</button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;