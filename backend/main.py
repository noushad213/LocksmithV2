import string
import math
import hashlib
import urllib.request

from flask import Flask, request, jsonify
from flask_cors import CORS

SYMBOL_SET = "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~"
LEETSPEAK_SET = set("@4310$!")

OFFLINE_GUESSES_PER_SECOND = 10_000_000_000

DAY = 86400
YEAR = 31_536_000
CENTURY = YEAR * 100


# -------------------- ANALYSIS --------------------

def analyze_password(password):
    length = len(password)

    char_classes = {
        "lower": any(c.islower() for c in password),
        "upper": any(c.isupper() for c in password),
        "digit": any(c.isdigit() for c in password),
        "symbol": any(c in SYMBOL_SET for c in password),
    }

    charset_size = 0
    if char_classes["lower"]:
        charset_size += 26
    if char_classes["upper"]:
        charset_size += 26
    if char_classes["digit"]:
        charset_size += 10
    if char_classes["symbol"]:
        charset_size += len(SYMBOL_SET)

    counts = {}
    for c in password:
        counts[c] = counts.get(c, 0) + 1

    unique_char_count = len(counts)
    has_repetition = any(v > 1 for v in counts.values())
    has_sequences = detect_sequences(password)
    has_leetspeak = detect_leetspeak(password)

    base_entropy = length * math.log2(charset_size) if charset_size else 0
    adjusted_entropy, penalties = apply_entropy_penalties(
        base_entropy, length, unique_char_count, has_sequences
    )

    crack_time = estimate_crack_time(adjusted_entropy, OFFLINE_GUESSES_PER_SECOND)
    verdict = classify_verdict(adjusted_entropy)

    recommendations = generate_recommendations(
        verdict, length, has_sequences, has_leetspeak, adjusted_entropy
    )

    return {
        "length": length,
        "char_sets": [k for k, v in char_classes.items() if v],
        "unique_char_count": unique_char_count,
        "has_repetition": has_repetition,
        "has_sequences": has_sequences,
        "has_leetspeak": has_leetspeak,
        "entropy": round(adjusted_entropy, 2),
        "crack_time": crack_time,
        "verdict": verdict,
        "penalties": penalties,
        "recommendations": recommendations,
        "breached": check_breach(password),
    }


# -------------------- SEQUENCES --------------------

def detect_sequences(password):
    pw = password.lower()
    for i in range(len(pw) - 2):
        a, b, c = pw[i:i+3]

        if a.isalpha() and b.isalpha() and c.isalpha():
            if ord(b) == ord(a) + 1 and ord(c) == ord(b) + 1:
                return True
            if ord(b) == ord(a) - 1 and ord(c) == ord(b) - 1:
                return True

        if a.isdigit() and b.isdigit() and c.isdigit():
            if ord(b) == ord(a) + 1 and ord(c) == ord(b) + 1:
                return True
            if ord(b) == ord(a) - 1 and ord(c) == ord(b) - 1:
                return True

    return False


def detect_leetspeak(password):
    return any(c in LEETSPEAK_SET for c in password)


# -------------------- ENTROPY PENALTIES --------------------

def apply_entropy_penalties(base_entropy, length, unique_count, has_sequences):
    entropy = base_entropy
    penalties = []

    if length > 0:
        ratio = unique_count / length
        if ratio < 0.7:
            entropy -= base_entropy * 0.25
            penalties.append("Low character uniqueness")

    if has_sequences:
        entropy -= base_entropy * 0.30
        penalties.append("Sequential patterns detected")

    return max(entropy, 0), penalties


# -------------------- CRACK TIME --------------------

def estimate_crack_time(entropy_bits, guesses_per_second):
    guesses = (2 ** entropy_bits) / 2
    seconds = guesses / guesses_per_second if guesses_per_second else 0
    return format_time(seconds)


def format_time(seconds):
    if seconds < 1:
        return "< 1 second"
    if seconds < 60:
        return f"{int(seconds)} seconds"
    if seconds < 3600:
        return f"{int(seconds // 60)} minutes"
    if seconds < DAY:
        return f"{int(seconds // 3600)} hours"
    if seconds < YEAR:
        return f"{int(seconds // DAY)} days"
    if seconds < CENTURY:
        return f"{int(seconds // YEAR)} years"
    return "> centuries"


# -------------------- BREACH CHECK --------------------

def check_breach(password):
    sha1 = hashlib.sha1(password.encode()).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]

    try:
        req = urllib.request.Request(
            f"https://api.pwnedpasswords.com/range/{prefix}",
            headers={"User-Agent": "Locksmith"}
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            for line in res.read().decode().splitlines():
                s, count = line.split(":")
                if s == suffix:
                    return True
    except Exception:
        pass

    return False


# -------------------- VERDICT --------------------

def classify_verdict(entropy):
    if entropy < 40:
        return "VERY WEAK"
    if entropy < 60:
        return "WEAK"
    if entropy < 80:
        return "MODERATE"
    if entropy < 100:
        return "STRONG"
    return "VERY STRONG"


# -------------------- RECOMMENDATIONS --------------------

def generate_recommendations(verdict, length, has_sequences, has_leetspeak, entropy):
    if verdict in ("STRONG", "VERY STRONG"):
        return []

    recs = []

    if length < 14:
        recs.append("Use at least 14 characters")

    if has_sequences:
        recs.append("Avoid predictable sequences like abc or 123")

    if has_leetspeak:
        recs.append("Avoid leetspeak substitutions")

    if entropy < 60:
        recs.append("Add more variety to character placement")

    return recs[:3]


# -------------------- FLASK API --------------------

app = Flask(__name__)
CORS(app)

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    password = data.get("password", "")
    if not password:
        return jsonify({"error": "No password provided"}), 400
    result = analyze_password(password)
    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
