import { useState, useEffect } from 'react';

function App() {
    const [zalogowanyUzytkownik, setZalogowanyUzytkownik] = useState(() => {
    const zapisanyUzytkownik = localStorage.getItem('zalogowanyUzytkownik');
    return zapisanyUzytkownik ? JSON.parse(zapisanyUzytkownik) : null;
    });    
    const [widokRejestracji, setWidokRejestracji] = useState(false);


    const [email, setEmail] = useState('');
    const [haslo, setHaslo] = useState('');
    const [imieNazwisko, setImieNazwisko] = useState('');


    const [zgloszenia, setZgloszenia] = useState([]);
    const [form, setForm] = useState({ temat: '', opis: '', kategoria: 'Komputer', zalacznik: null });
    const [uzytkownicy, setUzytkownicy] = useState([]);
    const [notatki, setNotatki] = useState({});

    const [powiadomienia, setPowiadomienia] = useState([]);
    const [pokazPowiadomienia, setPokazPowiadomienia] = useState(false);

    const [filtrId, setFiltrId] = useState('');
    const [filtrKategoria, setFiltrKategoria] = useState('');

    const [raportMiesiac, setRaportMiesiac] = useState(new Date().getMonth() + 1); 
    const [raportRok, setRaportRok] = useState(new Date().getFullYear()); 
    const [raportDane, setRaportDane] = useState(null);

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
                    localStorage.setItem('zalogowanyUzytkownik', JSON.stringify(data.user)); 
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
        setPokazPowiadomienia(false);
        localStorage.removeItem('zalogowanyUzytkownik'); 
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
            
            if (zalogowanyUzytkownik.rola === 'Klient') {
                const savedNotifs = JSON.parse(localStorage.getItem(`notifs_${zalogowanyUzytkownik.id}`)) || [];
                setPowiadomienia(savedNotifs);
            }
        }
    }, [zalogowanyUzytkownik]);

    useEffect(() => {
        if (zalogowanyUzytkownik && zalogowanyUzytkownik.rola === 'Klient' && zgloszenia.length > 0) {
            const cacheKey = `statusy_${zalogowanyUzytkownik.id}`;
            const poprzednieStatusy = JSON.parse(localStorage.getItem(cacheKey)) || {};
            const aktualneStatusy = {};
            let nowePowiadomienia = [];

            zgloszenia.forEach(z => {
                aktualneStatusy[z.id] = z.statusZgloszenia;
                
                if (poprzednieStatusy[z.id] && poprzednieStatusy[z.id] !== z.statusZgloszenia) {
                    nowePowiadomienia.push({
                        id: Date.now() + Math.random(),
                        zgloszenieId: z.id,
                        temat: z.temat,
                        staryStatus: poprzednieStatusy[z.id],
                        nowyStatus: z.statusZgloszenia,
                        przeczytane: false,
                        data: new Date().toLocaleString()
                    });
                }
            });

            localStorage.setItem(cacheKey, JSON.stringify(aktualneStatusy));

            if (nowePowiadomienia.length > 0) {
                setPowiadomienia(prev => {
                    const zaktualizowane = [...nowePowiadomienia, ...prev];
                    localStorage.setItem(`notifs_${zalogowanyUzytkownik.id}`, JSON.stringify(zaktualizowane));
                    return zaktualizowane;
                });
            }
        }
    }, [zgloszenia, zalogowanyUzytkownik]);

    const oznaczJakoPrzeczytane = () => {
        const zaktualizowane = powiadomienia.map(p => ({ ...p, przeczytane: true }));
        setPowiadomienia(zaktualizowane);
        localStorage.setItem(`notifs_${zalogowanyUzytkownik.id}`, JSON.stringify(zaktualizowane));
    };

    const wyczyscPowiadomienia = () => {
        setPowiadomienia([]);
        localStorage.setItem(`notifs_${zalogowanyUzytkownik.id}`, JSON.stringify([]));
        setPokazPowiadomienia(false);
    };

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


    const generujRaport = () => {
        const miesiacFormat = raportMiesiac.toString().padStart(2, '0');
        fetch(`http://localhost:3001/api/raporty/zgloszenia?miesiac=${miesiacFormat}&rok=${raportRok}`)
            .then(res => res.json())
            .then(data => setRaportDane(data.data))
            .catch(err => console.error("Błąd podczas pobierania raportu", err));
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



    const pofiltrowaneZgloszenia = zgloszenia.filter(z => {
        const pasujeId = filtrId ? z.id.toString().includes(filtrId) : true;
        const pasujeKategoria = filtrKategoria ? z.kategoria === filtrKategoria : true;
        return pasujeId && pasujeKategoria;
    });
    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
            <nav style={{ marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <ul>
                    <li><h2 style={{ margin: 0 }}>Zalogowano: {zalogowanyUzytkownik.imieNazwisko} ({zalogowanyUzytkownik.rola})</h2></li>
                </ul>
                <ul>
                    {zalogowanyUzytkownik.rola === 'Klient' && (
                        <li style={{ position: 'relative' }}>
                            <button 
                                className="outline" 
                                style={{ margin: 0, padding: '5px 10px', position: 'relative', border: 'none' }}
                                onClick={() => {
                                    setPokazPowiadomienia(!pokazPowiadomienia);
                                    if (!pokazPowiadomienia) oznaczJakoPrzeczytane();
                                }}
                            >
                                <img src="public/bell.svg" alt="Powiadomienia" style={{width: '25px', height: '25px',filter: "invert(100%)" }} />
                                {powiadomienia.filter(p => !p.przeczytane).length > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-2px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        borderRadius: '50%',
                                        padding: '2px 6px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        lineHeight: '1'
                                    }}>
                                        {powiadomienia.filter(p => !p.przeczytane).length}
                                    </span>
                                )}
                            </button>
                            
                            
                            {pokazPowiadomienia && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        width: '500px',
                                        backgroundColor: 'var(--pico-background-color, #11191f)',
                                        border: '1px solid var(--pico-muted-border-color, #333)',
                                        borderRadius: '5px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                                        zIndex: 1000,
                                        padding: '10px',
                                        marginTop: '10px'
                                    }}>
                                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--pico-muted-border-color, #333)', paddingBottom: '5px' }}>
                                        Powiadomienia
                                    </h4>
                                    
                                    {powiadomienia.length === 0 ? (
                                        <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--pico-muted-color)' }}>Brak nowych powiadomień.</p>
                                    ) : (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '300px', overflowY: 'auto' }}>
                                            {powiadomienia.map(p => (
                                                <li key={p.id} style={{ fontSize: '0.85rem', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--pico-muted-border-color, #333)' }}>
                                                    <strong style={{ color: 'var(--pico-primary)' }}>{p.temat}</strong><br/>
                                                    Status: {p.staryStatus} - <strong>{p.nowyStatus}</strong><br/>
                                                    <small style={{ color: 'var(--pico-muted-color)' }}>{p.data}</small>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {powiadomienia.length > 0 && (
                                        <button className="secondary outline" style={{ width: '100%', margin: '10px 0 0 0', padding: '5px' }} onClick={wyczyscPowiadomienia}>
                                            Wyczyść historię
                                        </button>
                                    )}
                                </div>
                            )}
                        </li>
                    )}
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
                        
                        
                    <div style={{ display: 'flex', gap: '15px', padding: '15px 20px', borderBottom: '1px solid var(--pico-muted-border-color)' }}>
                            <input 
                                type="text" 
                                placeholder="Wyszukaj po ID..." 
                                value={filtrId} 
                                onChange={(e) => setFiltrId(e.target.value)} 
                                style={{ margin: 0, flex: 1 }}
                            />
                            <select 
                                value={filtrKategoria} 
                                onChange={(e) => setFiltrKategoria(e.target.value)} 
                                style={{ margin: 0, flex: 1 }}
                            >
                                <option value="">Wszystkie kategorie</option>
                                <option value="Komputer">Komputer</option>
                                <option value="Laptop">Laptop</option>
                                <option value="Telefon">Telefon</option>
                            </select>
                        </div>

                        {pofiltrowaneZgloszenia.length === 0 ? (
                            <p style={{ padding: '20px' }}>Brak zgłoszeń spełniających kryteria.</p>
                        ) : (
                            pofiltrowaneZgloszenia.map(z => (
                                <article key={z.id} style={{ marginBottom: '20px', marginTop: '20px', marginLeft: '20px', marginRight: '20px' }}>
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
                                        
                                        {z.notatkaSerwisanta && (
                                            <div style={{ padding: '10px 15px', marginTop: '15px', backgroundColor: 'var(--pico-muted-border-color)', borderRadius: '5px' }}>
                                                <strong style={{ color: 'var(--pico-primary)' }}>Wiadomość od serwisanta:</strong>
                                                <p style={{ margin: '5px 0 0 0' }}>{z.notatkaSerwisanta}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div style={{ padding: '15px 20px', borderTop: '1px solid var(--pico-muted-border-color)' }}>
                                        <small style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span>Status: <strong>{z.statusZgloszenia}</strong></span>
                                            {zalogowanyUzytkownik.rola !== 'Klient' && (
                                                <>
                                            <span>|</span>
                                            <span>Priorytet:</span>
                                                <select
                                                    value={z.priorytet || 'Niski'}
                                                    onChange={(e) => handleZmienPriorytet(z.id, e.target.value)}
                                                    style={{ display: 'inline-block', width: 'auto', margin: 0, padding: '2px 5px', height: 'auto', fontSize: '0.85rem' }}
                                                >
                                                    <option value="Niski">Niski</option>
                                                    <option value="Średni">Średni</option>
                                                    <option value="Wysoki">Wysoki</option>
                                                </select>
                                                </>
                                            )}
                                        </small>
                                    </div>

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
                <>                     
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

                    <div style={{ marginTop: '40px' }}>
                        <article>
                            <header>
                                <h3 style={{ margin: 0 }}>Miesięczny raport zgłoszeń</h3>
                            </header>
                            <div style={{ padding: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ fontSize: '0.85rem' }}>Miesiąc:</label>
                                    <select value={raportMiesiac} onChange={(e) => setRaportMiesiac(e.target.value)} style={{ margin: 0 }}>
                                        <option value="1">Styczeń</option>
                                        <option value="2">Luty</option>
                                        <option value="3">Marzec</option>
                                        <option value="4">Kwiecień</option>
                                        <option value="5">Maj</option>
                                        <option value="6">Czerwiec</option>
                                        <option value="7">Lipiec</option>
                                        <option value="8">Sierpień</option>
                                        <option value="9">Wrzesień</option>
                                        <option value="10">Październik</option>
                                        <option value="11">Listopad</option>
                                        <option value="12">Grudzień</option>
                                    </select>
                                </div>
                                
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ fontSize: '0.85rem' }}>Rok:</label>
                                    <input 
                                        type="number" 
                                        value={raportRok} 
                                        onChange={(e) => setRaportRok(e.target.value)} 
                                        style={{ margin: 0 }} 
                                    />
                                </div>
                                
                                <button onClick={generujRaport} style={{ margin: 0, marginTop: '24px' }}>Generuj Raport</button>
                            </div>

                            {raportDane && (
                                <div style={{ padding: '20px', borderTop: '1px solid var(--pico-muted-border-color)' }}>
                                    <h4 style={{ color: 'var(--pico-primary)' }}>
                                        Wyniki dla: {raportMiesiac.toString().padStart(2, '0')}/{raportRok}
                                    </h4>
                                    <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                                        <strong>Całkowita liczba zgłoszeń:</strong> {raportDane.total}
                                    </p>
                                    
                                    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                        {raportDane.szczegoly.length > 0 ? (
                                            <div>
                                                <p style={{ margin: '0 0 10px 0' }}><strong>Podział na statusy:</strong></p>
                                                <ul style={{ listStyleType: 'circle', paddingLeft: '20px' }}>
                                                    {raportDane.szczegoly.map(s => (
                                                        <li key={s.statusZgloszenia}>
                                                            {s.statusZgloszenia}: <strong>{s.ilosc}</strong>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p style={{ color: 'var(--pico-muted-color)' }}>Brak zgłoszeń w wybranym miesiącu.</p>
                                        )}

                                        {raportDane.serwisanci && raportDane.serwisanci.length > 0 && (
                                            <div>
                                                <p style={{ margin: '0 0 10px 0' }}><strong>Przypisania do serwisantów:</strong></p>
                                                <ul style={{ listStyleType: 'square', paddingLeft: '20px' }}>
                                                    {raportDane.serwisanci.map((s, index) => (
                                                        <li key={index}>
                                                            {s.serwisant}: <strong>{s.ilosc}</strong>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </article>
                    </div>
                </> 
            )}
        </div>
    );
}

export default App;