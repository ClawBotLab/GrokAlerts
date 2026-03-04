"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── GDELT fetch (client-side proxy via public GDELT API) ───────────────────
async function fetchGDELT() {
  try {
    const res = await fetch('/api/gdelt');
    const data = await res.json();
    return (data.articles || []).slice(0, 25);
  } catch {
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function scoreTone(tone) {
  // GDELT tone: negative = bad sentiment, positive = good
  if (!tone) return 0;
  const t = parseFloat(tone);
  if (t < -2) return -1;
  if (t > 2) return 1;
  return 0;
}

function inferScope(article) {
  const text = (article.title || "") + " " + (article.domain || "");
  if (/local|city|county|district|borough/i.test(text)) return "local";
  if (/national|federal|congress|senate|president/i.test(text)) return "national";
  return "global";
}

function inferDepth(article) {
  const wordCount = (article.title || "").split(" ").length;
  if (wordCount < 8) return "shallow";
  if (wordCount < 14) return "medium";
  return "deep";
}

function filterArticles(articles, dials) {
  return articles.filter((a) => {
    const tone = scoreTone(a.tone);
    const scope = inferScope(a);
    const depth = inferDepth(a);

    const sentimentMatch =
      dials.sentiment === 0 ? tone === -1 :
      dials.sentiment === 1 ? tone === 0 :
      tone === 1;

    const scopeMatch =
      dials.scope === 0 ? scope === "local" :
      dials.scope === 1 ? scope === "national" :
      scope === "global";

    const depthMatch =
      dials.depth === 0 ? depth === "shallow" :
      dials.depth === 1 ? depth === "medium" :
      depth === "deep";

    return sentimentMatch && scopeMatch && depthMatch;
  });
}

function missionLabel(dials) {
  const s = ["⚡ Breaking Tension", "😐 Neutral Scan", "✨ Positive Pulse"][dials.sentiment];
  const sc = ["📍 Neighborhood", "🏛 National", "🌍 Worldbeat"][dials.scope];
  const d = ["⚡ Snap", "📰 Brief", "🔬 Deep Dive"][dials.depth];
  return `${sc} ${d} — ${s}`;
}

// ─── Wordle-reveal component ─────────────────────────────────────────────────
function WordleReveal({ text, active }) {
  const words = text.split(" ").slice(0, 12);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: 8 }}>
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            background: active ? "rgba(0,255,200,0.12)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${active ? "rgba(0,255,200,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 4,
            padding: "3px 7px",
            fontSize: 13,
            color: active ? "#b0fff0" : "#888",
            transition: `all 0.3s ease ${i * 40}ms`,
            transform: active ? "translateY(0)" : "translateY(4px)",
            opacity: active ? 1 : 0.4,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────
function AlertCard({ article, index, revealed, onReveal }) {
  const scope = inferScope(article);
  const depth = inferDepth(article);
  const tone = scoreTone(article.tone);
  const toneColor = tone < 0 ? "#ff4d6d" : tone > 0 ? "#00ffc8" : "#f0c040";

  return (
    <div
      onClick={() => onReveal(index)}
      style={{
        background: revealed
          ? "linear-gradient(135deg, rgba(0,255,200,0.07), rgba(0,40,60,0.9))"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${revealed ? "rgba(0,255,200,0.25)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow pulse on reveal */}
      {revealed && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at top left, rgba(0,255,200,0.08), transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: toneColor, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>
          {tone < 0 ? "CRITICAL" : tone > 0 ? "POSITIVE" : "NEUTRAL"} · {scope.toUpperCase()} · {depth.toUpperCase()}
        </span>
        <span style={{ fontSize: 11, color: "#555", fontFamily: "'IBM Plex Mono', monospace" }}>
          {article.domain}
        </span>
      </div>

      <WordleReveal text={article.title || "Untitled"} active={revealed} />

      {revealed && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: "inline-block",
            marginTop: 12,
            fontSize: 11,
            color: "#00ffc8",
            textDecoration: "none",
            fontFamily: "'IBM Plex Mono', monospace",
            borderBottom: "1px solid rgba(0,255,200,0.3)",
            paddingBottom: 1,
          }}
        >
          READ SOURCE ↗
        </a>
      )}
    </div>
  );
}

// ─── Dial component ───────────────────────────────────────────────────────────
function Dial({ label, options, value, onChange, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
      <span style={{
        fontSize: 10,
        letterSpacing: 2,
        color: "#555",
        fontFamily: "'IBM Plex Mono', monospace",
        textTransform: "uppercase",
      }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            style={{
              flex: 1,
              padding: "8px 4px",
              background: value === i ? color : "rgba(255,255,255,0.04)",
              border: `1px solid ${value === i ? color : "rgba(255,255,255,0.1)"}`,
              borderRadius: 6,
              color: value === i ? "#000" : "#666",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
              transition: "all 0.2s",
              fontWeight: value === i ? 700 : 400,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Black hole canvas ────────────────────────────────────────────────────────
function BlackHole() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let raf;

    function draw() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Accretion disk rings
      for (let r = 180; r > 30; r -= 12) {
        const alpha = (180 - r) / 180 * 0.18;
        const hue = 180 + Math.sin(frame * 0.01 + r * 0.05) * 30;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.28, -0.3, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      // Core
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.6, "rgba(0,20,30,0.95)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Particles
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2 + frame * 0.008;
        const dist = 90 + Math.sin(frame * 0.02 + i) * 30;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist * 0.3;
        const alpha = 0.4 + Math.sin(frame * 0.05 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,200,${alpha})`;
        ctx.fill();
      }

      frame++;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: 220,
        display: "block",
        opacity: 0.8,
      }}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GrokAlertsPage() {
  const [dials, setDials] = useState({ sentiment: 1, scope: 2, depth: 1 });
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState({});
  const [score, setScore] = useState(0);
  const [lastFetched, setLastFetched] = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const data = await fetchGDELT();
    setArticles(data);
    setLastFetched(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [loadFeed]);

  const setDial = (key) => (val) => {
    setDials((d) => ({ ...d, [key]: val }));
    setRevealed({});
  };

  const filtered = filterArticles(articles, dials);

  const handleReveal = (i) => {
    if (!revealed[i]) {
      setRevealed((r) => ({ ...r, [i]: true }));
      setScore((s) => s + 10);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030910",
      color: "#e0e0e0",
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {/* Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,200,0.2); }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(0,255,200,0.1)",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "radial-gradient(circle, #000 40%, rgba(0,255,200,0.6) 100%)",
            border: "1px solid rgba(0,255,200,0.4)",
          }} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, color: "#fff" }}>
            GROK ALERTS
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#00ffc8" }}>
            SCORE: {score}
          </span>
          <span style={{ fontSize: 10, color: "#444" }}>
            GDELT · {lastFetched || "–"}
          </span>
        </div>
      </div>

      {/* Black hole */}
      <BlackHole />

      {/* Mission label */}
      <div style={{ textAlign: "center", marginTop: -16, marginBottom: 24, padding: "0 24px" }}>
        <div style={{
          display: "inline-block",
          background: "rgba(0,255,200,0.07)",
          border: "1px solid rgba(0,255,200,0.2)",
          borderRadius: 20,
          padding: "6px 18px",
          fontSize: 12,
          color: "#00ffc8",
          letterSpacing: 1,
        }}>
          MISSION: {missionLabel(dials)}
        </div>
      </div>

      {/* Dials */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        padding: "0 24px 24px",
        justifyContent: "center",
      }}>
        <Dial
          label="Sentiment"
          options={["Critical", "Neutral", "Positive"]}
          value={dials.sentiment}
          onChange={setDial("sentiment")}
          color="#ff4d6d"
        />
        <Dial
          label="Scope"
          options={["Local", "National", "Global"]}
          value={dials.scope}
          onChange={setDial("scope")}
          color="#f0c040"
        />
        <Dial
          label="Depth"
          options={["Snap", "Brief", "Deep"]}
          value={dials.depth}
          onChange={setDial("depth")}
          color="#00ffc8"
        />
      </div>

      {/* Feed */}
      <div style={{ padding: "0 24px 48px", maxWidth: 800, margin: "0 auto" }}>
        {/* Status bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          fontSize: 11,
          color: "#444",
        }}>
          <span>{loading ? "⟳ FETCHING SIGNALS..." : `${filtered.length} SIGNALS MATCHED`}</span>
          <button
            onClick={loadFeed}
            style={{
              background: "none",
              border: "1px solid rgba(0,255,200,0.2)",
              color: "#00ffc8",
              padding: "3px 10px",
              borderRadius: 4,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            REFRESH ↺
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#333" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
            <div style={{ fontSize: 11, letterSpacing: 2 }}>INGESTING FEED...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: 60,
            color: "#333",
            border: "1px dashed rgba(255,255,255,0.07)",
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2 }}>NO SIGNALS MATCH THIS MISSION</div>
            <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 8 }}>
              Adjust dials or refresh feed
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.slice(0, 10).map((article, i) => (
              <AlertCard
                key={i}
                article={article}
                index={i}
                revealed={!!revealed[i]}
                onReveal={handleReveal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: "#333",
      }}>
        <span>DATA: GDELT PROJECT · 15-MIN BATCHES · PUBLIC DOMAIN</span>
        <span>grokalerts.com</span>
      </div>
    </div>
  );
}
