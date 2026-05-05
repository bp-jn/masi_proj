# System Zgłoszeń Serwisowych 

Aby uruchomić projekt na swoim komputerze, musisz posiadać zainstalowane środowisko **Node.js**.

## Uruchomienie lokalne

Aplikacja składa się z dwóch niezależnych modułów: serwera (backend) oraz interfejsu (frontend). Należy uruchomić je równolegle w dwóch osobnych oknach terminala.

### 1. Uruchomienie serwera (Backend)
1. Przejdź do katalogu backendu:
   ```bash
   cd backend
  
2. Zainstaluj wymagane pakiety:
   ```bash
   npm install
   ```
3. Uruchom serwer aplikacji:
   ```bash
   node server.js
   ```
   *Serwer uruchomi się domyślnie na porcie 3001. Plik bazy danych (\`baza.sqlite\`) wygeneruje się automatycznie.*

### 2. Uruchomienie aplikacji webowej (Frontend)
1. Otwórz nowe okno terminala i przejdź do katalogu frontendu:
   ```bash
   cd frontend
   ```
2. Zainstaluj wymagane pakiety:
   ```bash
   npm install
   ```
3. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```
4. Otwórz w przeglądarce adres podany w terminalu (domyślnie `http://localhost:5173`).


---
