# 🔐 Locksmith v2

> A web-based UI for [Locksmith](https://github.com/noushad213/Locksmith), the terminal password strength analyzer — now with a live React frontend and a Python backend API.

---

## What is Locksmith?

Locksmith started as a terminal tool for analyzing password strength. You'd run it, type your password, and get a breakdown of entropy, crack time, detected patterns, and breach status — all in the terminal.

**Locksmith v2** keeps the exact same Python analysis engine but wraps it in a clean, minimal web interface. The logic hasn't changed — the same entropy calculations, the same penalty system, the same HaveIBeenPwned breach check. It just runs in your browser now.

---

## Features

- **Entropy analysis** — calculates base and adjusted entropy in bits based on character set size and password length
- **Penalty system** — reduces entropy score for low character uniqueness and sequential patterns
- **Crack time estimation** — estimates time to crack under an offline brute-force attack at 10 billion guesses/second
- **Breach detection** — checks against the HaveIBeenPwned database using k-anonymity (your password is never transmitted)
- **Pattern detection** — detects sequential patterns (`abc`, `123`), repeated characters, and leetspeak substitutions
- **Recommendations** — actionable suggestions for weak or moderate passwords
- **Live analysis** — results update as you type, with a 400ms debounce to avoid hammering the backend

---

## How it works

### Architecture

```
┌─────────────────────┐        HTTP (localhost)       ┌──────────────────────┐
│   React Frontend    │  ──── POST /analyze ────>     │   Python Backend     │
│   (Vite + JSX)      │  <─── JSON response ────      │   (Flask API)        │
│   localhost:5173    │                                │   localhost:5000     │
└─────────────────────┘                                └──────────────────────┘
```

### Entropy calculation

Entropy is calculated as:

```
entropy = length × log₂(charset_size)
```

Where `charset_size` is the total pool of characters used:

| Character type | Pool size |
|----------------|-----------|
| Lowercase a–z  | 26        |
| Uppercase A–Z  | 26        |
| Digits 0–9     | 10        |
| Symbols        | 32        |

Penalties are then applied to the base entropy:

| Condition                          | Penalty          |
|------------------------------------|------------------|
| Unique chars / length < 70%        | −25% of entropy  |
| Sequential patterns detected       | −30% of entropy  |

### Verdict thresholds

| Entropy (bits) | Verdict     |
|----------------|-------------|
| < 40           | Very Weak   |
| 40 – 59        | Weak        |
| 60 – 79        | Moderate    |
| 80 – 99        | Strong      |
| 100+           | Very Strong |

### Breach check

Locksmith uses the [HaveIBeenPwned Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords) with **k-anonymity**:

1. SHA-1 hash the password locally
2. Send only the **first 5 characters** of the hash to the API
3. The API returns all hashes that start with those 5 characters
4. Check if the full hash appears in the result — entirely on your machine

**Your password is never sent over the network.**

---

## Project structure

```
locksmith-v2/
├── backend/
│   └── main.py          # Python analysis engine + Flask API
├── src/
│   ├── App.jsx          # React UI
│   ├── main.jsx         # React entry point
│   └── index.css        # Global reset styles
├── index.html
├── package.json
└── vite.config.js
```

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- Python 3.8 or higher
- pip

---

## Installation

### 1. Clone or download the project

```bash
git clone https://github.com/yourname/locksmith-v2.git
cd locksmith-v2
```

### 2. Install Python dependencies

```bash
pip install flask flask-cors
```

### 3. Install Node dependencies

```bash
npm install
```

---

## Running the app

You need **two terminals** running simultaneously.

### Terminal 1 — Start the Python backend

```bash
cd backend
python main.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### Terminal 2 — Start the React frontend

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
```

### Open in browser

Go to **[http://localhost:5173](http://localhost:5173)**

---

## Configuration

### Changing the backend port

In `backend/main.py`, find the last line and change the port:

```python
app.run(port=5000, debug=True)  # change 5000 to anything you like
```

Then update the fetch URL in `src/App.jsx`:

```js
const res = await fetch("http://localhost:5000/analyze", {  // match the port here
```

### Disabling debug mode for production

In `backend/main.py`:

```python
app.run(port=5000, debug=False)
```

---

## API reference

The backend exposes a single endpoint.

### `POST /analyze`

**Request body:**
```json
{
  "password": "your_password_here"
}
```

**Response:**
```json
{
  "length": 12,
  "char_sets": ["lower", "upper", "digit"],
  "unique_char_count": 10,
  "has_repetition": true,
  "has_sequences": false,
  "has_leetspeak": false,
  "entropy": 71.45,
  "crack_time": "3 years",
  "verdict": "MODERATE",
  "penalties": [],
  "recommendations": ["Use at least 14 characters"],
  "breached": false
}
```

| Field              | Type     | Description                                      |
|--------------------|----------|--------------------------------------------------|
| `length`           | int      | Number of characters                             |
| `char_sets`        | string[] | Active character types used                      |
| `unique_char_count`| int      | Count of distinct characters                     |
| `has_repetition`   | bool     | Any character appears more than once             |
| `has_sequences`    | bool     | Sequential patterns detected                     |
| `has_leetspeak`    | bool     | Leetspeak substitutions detected                 |
| `entropy`          | float    | Adjusted entropy in bits                         |
| `crack_time`       | string   | Human-readable offline crack time estimate       |
| `verdict`          | string   | `VERY WEAK` / `WEAK` / `MODERATE` / `STRONG` / `VERY STRONG` |
| `penalties`        | string[] | List of applied penalty reasons                  |
| `recommendations`  | string[] | Improvement suggestions (empty if strong)        |
| `breached`         | bool     | Found in HaveIBeenPwned database                 |

---

## Troubleshooting

**"Could not connect to Python backend"**
The React app can't reach Flask. Make sure `python main.py` is running in a separate terminal and is on port 5000.

**App is stuck to the left side of the screen**
Add this to `src/index.css`:
```css
html, body, #root {
  width: 100%;
  min-height: 100vh;
}
```

**Breach check always returns false / times out**
You may be offline or the HaveIBeenPwned API is temporarily unavailable. The app will still show all other results — breach status will silently default to `false`.

**CORS error in the browser console**
Make sure `flask-cors` is installed and `CORS(app)` is present in `main.py`. Both are included in the provided file.

---

## Differences from Locksmith v1 (terminal)

| Feature              | v1 Terminal       | v2 Web              |
|----------------------|-------------------|---------------------|
| Interface            | Terminal / CLI    | Browser             |
| Input method         | `getpass` (hidden)| Password input field|
| Analysis engine      | Python            | Python (unchanged)  |
| Results display      | Printed text      | Live UI with cards  |
| Online attack time   | Shown             | Removed (confusing) |
| Breach check         | Yes               | Yes                 |
| Real-time feedback   | No                | Yes (400ms debounce)|

---

## License

MIT — do whatever you want with it.

---

*Built on top of Locksmith v1 · Python backend · React + Vite frontend*