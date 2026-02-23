import { useState, useEffect } from "react";

const P = {
  bg:      "#fafaff",
  surface: "#eef0f2",
  border:  "#daddd8",
  muted:   "#9a9d9a",
  text:    "#1c1c1c",
  red:     "#ef233c",
};

function verdictColor(verdict) {
  if (!verdict) return P.muted;
  if (verdict === "VERY WEAK" || verdict === "WEAK") return P.red;
  if (verdict === "MODERATE") return "#b8860b";
  return P.text;
}

function borderColorFromEntropy(entropy) {
  if (!entropy) return P.border;
  if (entropy < 30) return P.red;
  if (entropy < 60) return "#ff8c00";
  if (entropy < 90) return "#ffd700";
  return "#22c55e";
}

function verdictLabel(verdict) {
  if (!verdict) return "";
  return verdict.charAt(0) + verdict.slice(1).toLowerCase().replace("_", " ");
}

function isFastCrack(time) {
  if (!time) return false;
  return time.includes("second") || time.includes("minute") || time.includes("hour") || time.startsWith("<");
}

function scoreFromEntropy(entropy) {
  return Math.min(100, Math.round((entropy / 128) * 100));
}

function Label({ children }) {
  return (
    <p style={{ fontSize: 11, color: P.muted, letterSpacing: "0.1em",
      textTransform: "uppercase", marginBottom: 14 }}>
      {children}
    </p>
  );
}

function ScoreBar({ entropy, verdict }) {
  const score = scoreFromEntropy(entropy);
  const color = verdictColor(verdict);
  const label = verdictLabel(verdict);
  return (
    <div style={{ border: `2px solid ${borderColorFromEntropy(entropy)}`, borderRadius: 12, padding: 16, transition: "border-color 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 12, gap: 8 }}>
        <span style={{ fontSize: 14, color: P.muted }}>Strength</span>
        <span style={{ fontSize: 16, fontWeight: 600, color,
          fontFamily: "'DM Mono',monospace" }}>{label}</span>
      </div>
      <div style={{ height: 3, background: P.border, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score}%`, background: color,
          borderRadius: 99, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor, sub }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${P.border}`,
      borderRadius: 12, padding: "20px 22px" }}>
      <p style={{ fontSize: 11, color: P.muted, letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, color: valueColor || P.text,
        fontFamily: "'DM Mono',monospace", lineHeight: 1.2 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: P.muted, marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

// Centered container — this is the single source of truth for width + centering
function Container({ children, style = {} }) {
  return (
    <div style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: "0 clamp(24px, 5vw, 60px)",
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function App() {
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [wide,     setWide]     = useState(window.innerWidth >= 760);

  useEffect(() => {
    const handle = () => setWide(window.innerWidth >= 760);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => {
    if (!password) { setResult(null); setError(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:5000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) throw new Error("Server error");
        setResult(await res.json());
      } catch {
        setError("Could not connect to Python backend. Is it running on port 5000?");
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [password]);

  const charLabels = { lower: "Lowercase", upper: "Uppercase", digit: "Numbers", symbol: "Symbols" };

  const charClasses = result
    ? {
        lower:  result.char_sets?.includes("lower"),
        upper:  result.char_sets?.includes("upper"),
        digit:  result.char_sets?.includes("digit"),
        symbol: result.char_sets?.includes("symbol"),
      }
    : null;

  return (
    <div style={{ minHeight: "100vh", background: P.bg,
      fontFamily: "'DM Sans',sans-serif", color: P.text }}>

      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; }
        input::placeholder { color: ${P.border}; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .appear { animation: fadeIn 0.38s ease forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid ${P.border};
          border-top-color: ${P.text};
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
      `}</style>

      {/* ── HERO ── */}
      <div style={{ borderBottom: `1px solid ${P.border}`,
        paddingTop: "clamp(40px, 8vw, 72px)",
        paddingBottom: "clamp(32px, 6vw, 60px)" }}>
        <Container>

          {/* Heading row */}
          <div style={{
            display: "flex",
            flexDirection: wide ? "row" : "column",
            alignItems: wide ? "flex-end" : "flex-start",
            justifyContent: "space-between",
            gap: 20, marginBottom: wide ? 48 : 32,
          }}>
            <div>
              <h1 style={{ fontSize: wide ? 44 : 28, fontWeight: 600,
                letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                Locksmith
              </h1>
              <p style={{ fontSize: 12, color: P.muted, letterSpacing: "0.12em",
                textTransform: "uppercase", marginBottom: 10 }}>
                Password Strength Analyzer
              </p>
              <p style={{ fontSize: 14, color: P.muted, maxWidth: 320, lineHeight: 1.6 }}>
                Analyze entropy, detect patterns, and check against known data breaches.
              </p>
            </div>
          </div>

          {/* Input */}
          <div style={{ position: "relative", maxWidth: wide ? 600 : "100%", margin: "0 auto" }}>
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Type your password…"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: "100%",
                background: "#fff",
                border: `1px solid ${borderColorFromEntropy(result?.entropy)}`,
                borderRadius: 12,
                padding: wide ? "18px 80px 18px 22px" : "15px 70px 15px 18px",
                fontSize: wide ? 18 : 15,
                color: P.text,
                fontFamily: "'DM Mono',monospace",
                letterSpacing: password ? "0.07em" : "normal",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = P.text}
              onBlur={e  => e.target.style.borderColor = borderColorFromEntropy(result?.entropy)}
            />
            <div style={{ position: "absolute", right: 18, top: "50%",
              transform: "translateY(-50%)", display: "flex",
              alignItems: "center", gap: 10 }}>
              {loading && <span className="spinner" />}
              <button
                onClick={() => setShow(s => !s)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: show ? P.text : P.muted, fontSize: 13,
                  fontFamily: "'DM Sans',sans-serif", transition: "color 0.15s",
                }}
              >{show ? "hide" : "show"}</button>
            </div>
          </div>

          {error && (
            <p style={{ marginTop: 12, fontSize: 13, color: P.red,
              maxWidth: wide ? 600 : "100%", lineHeight: 1.5 }}>
              {error}
            </p>
          )}

          {result && (
            <div className="appear" style={{ maxWidth: wide ? 600 : "100%", marginTop: 20 }}>
              <ScoreBar entropy={result.entropy} verdict={result.verdict} />
            </div>
          )}

        </Container>
      </div>

      {/* ── RESULTS ── */}
      {result && (
        <div className="appear">
          <Container style={{
            paddingTop: "clamp(32px, 5vw, 52px)",
            paddingBottom: "clamp(48px, 8vw, 80px)",
          }}>

            {/* Stat cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: wide ? "repeat(4, 1fr)" : "repeat(2, 1fr)",
              gap: wide ? 16 : 12,
              marginBottom: 40,
            }}>
              <StatCard label="Entropy"      value={`${result.entropy} bits`} />
              <StatCard label="Length"       value={`${result.length} chars`} />
              <StatCard
                label="Time to crack"
                value={result.crack_time}
                valueColor={isFastCrack(result.crack_time) ? P.red : P.text}
                sub="offline · 10B guesses/sec"
              />
              <StatCard
                label="Breach check"
                value={result.breached ? "Found" : "Clean"}
                valueColor={result.breached ? P.red : P.text}
                sub={result.breached ? "In known breach DB" : "Not in breach DB"}
              />
            </div>

            {/* Bottom 3-col grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: wide ? "1fr 1fr 1fr" : "1fr",
              gap: wide ? 40 : 0,
            }}>

              <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 24,
                marginBottom: wide ? 0 : 32 }}>
                <Label>Character types</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(charClasses).map(([k, active]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center",
                      justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, color: active ? P.text : P.muted }}>
                        {charLabels[k]}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace",
                        color: active ? P.text : P.border }}>
                        {active ? "✓" : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 24,
                marginBottom: wide ? 0 : 32 }}>
                <Label>Issues</Label>
                {(!result.penalties?.length && !result.has_leetspeak && !result.breached) ? (
                  <p style={{ fontSize: 14, color: P.muted }}>None detected.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.penalties?.map((p, i) => (
                      <p key={i} style={{ fontSize: 14, color: P.red, lineHeight: 1.5 }}>— {p}</p>
                    ))}
                    {result.has_leetspeak && (
                      <p style={{ fontSize: 14, color: P.red, lineHeight: 1.5 }}>— Predictable leetspeak</p>
                    )}
                    {result.breached && (
                      <p style={{ fontSize: 14, color: P.red, lineHeight: 1.5 }}>— Found in data breach</p>
                    )}
                  </div>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 24 }}>
                <Label>Suggestions</Label>
                {!result.recommendations?.length ? (
                  <p style={{ fontSize: 14, color: P.muted }}>No improvements needed.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.recommendations.map((r, i) => (
                      <p key={i} style={{ fontSize: 14, color: P.text, lineHeight: 1.5 }}>— {r}</p>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </Container>
        </div>
      )}

      {/* Empty state */}
      {!password && !loading && (
        <Container style={{ paddingTop: wide ? 80 : 52, paddingBottom: wide ? 80 : 52 }}>
          <p style={{ color: P.border, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>
            Waiting for input…
          </p>
        </Container>
      )}

      {/* Footer */}
      {result && (
        <div style={{ borderTop: `1px solid ${P.border}`,
          paddingTop: 20, paddingBottom: 20 }}>
          <Container>
            <p style={{ fontSize: 11, color: P.border, fontFamily: "'DM Mono',monospace" }}>
              Breach check via HaveIBeenPwned · k-anonymity · no password transmitted
            </p>
          </Container>
        </div>
      )}

    </div>
  );
}
