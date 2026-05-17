import { useState, useEffect } from 'react';

function App() {
    const [zalogowanyUzytkownik, setZalogowanyUzytkownik] = useState(null);
    const [widokRejestracji, setWidokRejestracji] = useState(false);


    const [email, setEmail] = useState('');
    const [haslo, setHaslo] = useState('');
    const [imieNazwisko, setImieNazwisko] = useState('');


    const [zgloszenia, setZgloszenia] = useState([]);
    const [form, setForm] = useState({ temat: '', opis: '', kategoria: 'Komputer', zalacznik: null });
    const [uzytkownicy, setUzytkownicy] = useState([]);
    const [notatki, setNotatki] = useState({});

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
            body: JSON.stringify({ imieNazwisko, email, haslo, rola: 'Klient' })
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


    const fetchUzytkownicy = () => {
        if (!zalogowanyUzytkownik || zalogowanyUzytkownik.rola !== 'Administrator') return;
        fetch('http://localhost:3001/api/uzytkownicy')
            .then(res => res.json())
            .then(data => setUzytkownicy(data.data));
    };

    useEffect(() => {
        if (zalogowanyUzytkownik) {
            fetchZgloszenia();
            if (zalogowanyUzytkownik.rola === 'Administrator') {
                fetchUzytkownicy();
            }
        }
    }, [zalogowanyUzytkownik]);

    const handleZmienRole = (idUzytkownika, nowaRola) => {
        fetch(`http://localhost:3001/api/uzytkownicy/${idUzytkownika}/rola`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rola: nowaRola })
        }).then(() => fetchUzytkownicy());
    };

    const handleUsunKonto = (idUzytkownika) => {
        if (window.confirm('Czy na pewno chcesz usunąć to konto?')) {
            fetch(`http://localhost:3001/api/uzytkownicy/${idUzytkownika}`, {
                method: 'DELETE'
            }).then(() => fetchUzytkownicy());
        }
    };

    const handleZgloszenieSubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('temat', form.temat);
        formData.append('opis', form.opis);
        formData.append('kategoria', form.kategoria);
        formData.append('klient_id', zalogowanyUzytkownik.id);
        
        if (form.zalacznik) {
            formData.append('zalacznik', form.zalacznik);
        }

        fetch('http://localhost:3001/api/zgloszenia', {
            method: 'POST',
            body: formData
        }).then(() => {
            setForm({ temat: '', opis: '', kategoria: 'Komputer', zalacznik: null });
            document.getElementById('plik-zalacznik').value = '';
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
    const handleZmienStatus = (idZgloszenia, nowyStatus, notatka = undefined) => {
        const body = { statusZgloszenia: nowyStatus };
        
        if (zalogowanyUzytkownik.rola !== 'Klient') {
            body.serwisant_id = zalogowanyUzytkownik.id;
        }
        
        if (notatka !== undefined) {
            body.notatkaSerwisanta = notatka;
        }

        fetch(`http://localhost:3001/api/zgloszenia/${idZgloszenia}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(() => {
            fetchZgloszenia();
            if (notatka !== undefined) {
                setNotatki(prev => ({ ...prev, [idZgloszenia]: '' }));
            }
        });
    };

    const handleZmienPriorytet = (idZgloszenia, nowyPriorytet) => {
        fetch(`http://localhost:3001/api/zgloszenia/${idZgloszenia}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priorytet: nowyPriorytet })
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

                {zalogowanyUzytkownik.rola === 'Klient' && (
                <div>
                    <article>
                        <header>
                            <h3 style={{ margin: 0 }}>Dodaj nowe zgłoszenie</h3>
                        </header>
                        <form onSubmit={handleZgloszenieSubmit} style={{ margin: 0 }}>
                            <input type="text" placeholder="Temat" required value={form.temat} onChange={(e) => setForm({ ...form, temat: e.target.value })} />
                            <textarea placeholder="Opis problemu" required value={form.opis} onChange={(e) => setForm({ ...form, opis: e.target.value })} />
                            
                            <select value={form.kategoria} onChange={(e) => setForm({ ...form, kategoria: e.target.value })} style={{ marginBottom: '20px' }}>
                                <option value="Komputer">Komputer</option>
                                <option value="Laptop">Laptop</option>
                                <option value="Telefon">Telefon</option>
                            </select>

                            <label htmlFor="plik-zalacznik">Załącznik (opcjonalnie):</label>
                            <input type="file" id="plik-zalacznik" onChange={(e) => setForm({ ...form, zalacznik: e.target.files[0] })} style={{ marginBottom: '20px' }} />
                            
                            <button type="submit" style={{ marginBottom: 0 }}>Zgłoś problem</button>
                        </form>
                    </article>
                </div>
            )}

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
                                        <strong>[ID: {z.id}] Temat: {z.temat}</strong>
                                    </header>
                                    <div style={{ padding: '10px 20px' }}>
                                        <p style={{ margin: '0 0 10px 0' }}>
                                            <strong>Opis problemu:</strong><br />
                                            {z.opis}
                                        </p>
                                        <p style={{ margin: '0 0 5px 0' }}>
                                            <strong>Kategoria:</strong> {z.kategoria || 'Brak'}
                                        </p>
                                        <p style={{ margin: 0 }}>
                                            <strong>Zgłaszający:</strong> {z.klient_imieNazwisko || 'Brak danych'}
                                        </p>
                                        {z.zalacznik && (
                                            <p style={{ margin: '10px 0 0 0' }}>
                                                <strong>Załącznik:</strong> <a href={`http://localhost:3001${z.zalacznik}`} target="_blank" rel="noopener noreferrer">Zobacz plik</a>
                                            </p>
                                        )}
                                    </div>
                                    <footer style={{ padding: '10px 20px' }}>
                                        <small style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span>Status: <strong>{z.statusZgloszenia}</strong></span>
                                            <span>|</span>
                                            <span>Priorytet:</span>
                                            {zalogowanyUzytkownik.rola === 'Klient' ? (
                                                <strong>{z.priorytet}</strong>
                                            ) : (
                                                <select
                                                    value={z.priorytet || 'Niski'}
                                                    onChange={(e) => handleZmienPriorytet(z.id, e.target.value)}
                                                    style={{ display: 'inline-block', width: 'auto', margin: 0, padding: '2px 5px', height: 'auto', fontSize: '0.85rem' }}
                                                >
                                                    <option value="Niski">Niski</option>
                                                    <option value="Średni">Średni</option>
                                                    <option value="Wysoki">Wysoki</option>
                                                </select>
                                            )}
                                        </small>
                                    </footer>

                                    {z.notatkaSerwisanta && (
                                        <div style={{ padding: '10px 20px', backgroundColor: 'var(--pico-muted-border-color)' }}>
                                            <strong style={{ color: 'var(--pico-primary)' }}>Wiadomość od serwisanta:</strong>
                                            <p style={{ margin: '5px 0 0 0' }}>{z.notatkaSerwisanta}</p>
                                        </div>
                                    )}

                                    {zalogowanyUzytkownik.rola === 'Klient' && z.statusZgloszenia === 'Oczekuje na klienta' && (
                                        <div style={{ padding: '20px', display: 'flex', gap: '10px' }}>
                                            <button onClick={() => handleZmienStatus(z.id, 'W toku')} style={{ margin: 0, backgroundColor: '#28a745', borderColor: '#28a745' }}>Akceptuj</button>
                                            <button onClick={() => handleZmienStatus(z.id, 'Zamknięte')} style={{ margin: 0, backgroundColor: '#dc3545', borderColor: '#dc3545' }}>Odrzuć (Zamknij zgłoszenie)</button>
                                        </div>
                                    )}

                                    {zalogowanyUzytkownik.rola !== 'Klient' && (
                                        <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
                                            
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {z.statusZgloszenia === 'Nowe' && (
                                                    <button 
                                                        onClick={() => handleZmienStatus(z.id, 'W toku')} 
                                                        style={{ margin: 0, backgroundColor: 'var(--pico-primary)', borderColor: 'var(--pico-primary)' }}
                                                    >
                                                        Podejmij zgłoszenie (W toku)
                                                    </button>
                                                )}

                                                {z.statusZgloszenia === 'W toku' && (
                                                    <button 
                                                        className="secondary outline" 
                                                        onClick={() => handleZmienStatus(z.id, 'Rozwiązane')} 
                                                        style={{ margin: 0 }}
                                                    >
                                                        Zakończ i oznacz jako Rozwiązane
                                                    </button>
                                                )}

                                                {z.statusZgloszenia === 'Oczekuje na klienta' && (
                                                    <p style={{ margin: 0, color: 'var(--pico-muted-color)', italic: 'true' }}>
                                                        Oczekiwanie na decyzję klienta (akceptację lub odrzucenie).
                                                    </p>
                                                )}

                                                {(z.statusZgloszenia === 'Rozwiązane' || z.statusZgloszenia === 'Zamknięte') && (
                                                    <p style={{ margin: 0, color: '#6c757d' }}>
                                                        Zgłoszenie zostało zamknięte. Brak dalszych akcji.
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {z.statusZgloszenia === 'W toku' && (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '20px' }}>
                                                    <textarea 
                                                        placeholder="Wpisz informacje dla klienta..."
                                                        value={notatki[z.id] || ''}
                                                        onChange={(e) => setNotatki({ ...notatki, [z.id]: e.target.value })}
                                                        style={{ flex: 1, margin: 0, minHeight: '60px' }}
                                                    />
                                                    <button 
                                                        onClick={() => handleZmienStatus(z.id, 'Oczekuje na klienta', notatki[z.id])}
                                                        disabled={!notatki[z.id]}
                                                        style={{ whiteSpace: 'nowrap', margin: 0, height: '100%', backgroundColor: '#e67e22', borderColor: '#e67e22' }}
                                                    >
                                                        Wyślij
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </article>
                            ))
                        )}
                    </article>
                </div>

            </div>
            {zalogowanyUzytkownik.rola === 'Administrator' && (
                <div style={{ marginTop: '40px' }}>
                    <article>
                        <header>
                            <h3 style={{ margin: 0 }}>Zarządzanie pracownikami i użytkownikami</h3>
                        </header>
                        <div className="overflow-auto">
                            <table className="striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Imię i Nazwisko</th>
                                        <th>Email</th>
                                        <th>Rola</th>
                                        <th>Akcje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uzytkownicy.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td>{u.imieNazwisko}</td>
                                            <td>{u.email}</td>
                                            <td>
                                                <select
                                                    value={u.rola}
                                                    onChange={(e) => handleZmienRole(u.id, e.target.value)}
                                                    style={{ marginBottom: 0, padding: '5px' }}
                                                >
                                                    <option value="Klient">Klient</option>
                                                    <option value="Serwisant">Serwisant</option>
                                                    <option value="Administrator">Administrator</option>
                                                </select>
                                            </td>
                                            <td>
                                                <button
                                                    className="secondary outline"
                                                    style={{ margin: 0, padding: '5px 10px' }}
                                                    onClick={() => handleUsunKonto(u.id)}
                                                    disabled={u.id === zalogowanyUzytkownik.id}
                                                >
                                                    Usuń
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
}

export default App;