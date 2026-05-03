import { useState, useEffect } from 'react';

function App() {
    const [zgloszenia, setZgloszenia] = useState([]);
    const [form, setForm] = useState({ temat: '', opis: '', priorytet: 'Niski' });

    
    const fetchZgloszenia = () => {
        fetch('http://localhost:3001/api/zgloszenia')
            .then(res => res.json())
            .then(data => setZgloszenia(data.data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchZgloszenia();
    }, []);

    
    const handleSubmit = (e) => {
        e.preventDefault();
        fetch('http://localhost:3001/api/zgloszenia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        }).then(() => {
            setForm({ temat: '', opis: '', priorytet: 'Niski' }); 
            fetchZgloszenia(); 
        });
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>System zgłoszeń serwisowych</h1>

            <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
                <h2>Dodaj nowe zgłoszenie</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                    <input
                        type="text" placeholder="Temat" required
                        value={form.temat} onChange={(e) => setForm({ ...form, temat: e.target.value })}
                    />
                    <textarea
                        placeholder="Opis problemu" required
                        value={form.opis} onChange={(e) => setForm({ ...form, opis: e.target.value })}
                    />
                    <select value={form.priorytet} onChange={(e) => setForm({ ...form, priorytet: e.target.value })}>
                        <option value="Niski">Niski</option>
                        <option value="Średni">Średni</option>
                        <option value="Wysoki">Wysoki</option>
                    </select>
                    <button type="submit">Zgłoś problem</button>
                </form>
            </div>

            <h2>Lista zgłoszeń</h2>
            <ul>
                {zgloszenia.map(z => (
                    <li key={z.id} style={{ marginBottom: '10px' }}>
                        <strong>[ID: {z.id}] {z.temat}</strong> - Status: <em>{z.statusZgloszenia}</em> (Priorytet: {z.priorytet})
                        <p>{z.opis}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;