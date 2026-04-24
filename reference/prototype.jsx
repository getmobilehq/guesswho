import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GUESS WHO — A Storytelling Party Game
// Single-file React artifact. Host on a big screen, players on phones.
// ============================================================================

// Load Google Fonts (Midnight Gold palette)
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Didact+Gothic&family=Lora:wght@400;500;600;700&display=swap';
if (typeof document !== 'undefined' && !document.getElementById('gw-fonts')) {
  const link = document.createElement('link');
  link.id = 'gw-fonts';
  link.rel = 'stylesheet';
  link.href = FONTS_HREF;
  document.head.appendChild(link);
}

// Brand tokens — Midnight Gold
const C = {
  bg: '#0D0D2B',
  surface: '#161642',
  elevated: '#1f1f55',
  gold: '#F4C753',
  goldDeep: '#C9A227',
  ivory: '#FDFAF0',
  muted: '#9d9bb8',
  border: '#2a2a5e',
  green: '#7DD181',
  red: '#E07A8B',
};

const FONT_HEAD = "'Lora', Georgia, serif";
const FONT_UI = "'Didact Gothic', system-ui, sans-serif";

// ============================================================================
// STORAGE LAYER (shared: true for cross-device sync, namespaced by session code)
// ============================================================================
const S = {
  async get(key, shared = true) {
    try {
      const r = await window.storage.get(key, shared);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async set(key, value, shared = true) {
    try {
      await window.storage.set(key, JSON.stringify(value), shared);
      return true;
    } catch { return false; }
  },
  async list(prefix, shared = true) {
    try {
      const r = await window.storage.list(prefix, shared);
      return r?.keys || [];
    } catch { return []; }
  },
  async del(key, shared = true) {
    try { await window.storage.delete(key, shared); } catch {}
  }
};

const k = {
  meta: (code) => `gw:${code}:meta`,
  players: (code) => `gw:${code}:players`,
  answers: (code, pid) => `gw:${code}:ans:${pid}`,
  cards: (code) => `gw:${code}:cards`,
  guess: (code, cardId, gid) => `gw:${code}:g:${cardId}:${gid}`,
  guessPrefix: (code, cardId) => `gw:${code}:g:${cardId}:`,
  sessionPrefix: (code) => `gw:${code}:`,
};

const genId = () => Math.random().toString(36).slice(2, 10);
const genCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({length: 4}, () => letters[Math.floor(Math.random()*letters.length)]).join('');
};

const DEFAULT_QUESTIONS = [
  "What's the most embarrassing thing that happened to you growing up?",
  "Share a moment from this past year where you felt deeply grateful.",
  "Tell us something most people in this room don't know about you."
];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Polling hook
function usePoll(fn, ms, deps) {
  useEffect(() => {
    let cancelled = false;
    const tick = async () => { if (!cancelled) await fn(); };
    tick();
    const id = setInterval(tick, ms);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line
  }, deps);
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [route, setRoute] = useState('loading'); // loading | landing | host-* | player-*
  const [code, setCode] = useState('');
  const [pid, setPid] = useState(null);

  // Restore previous session (personal storage)
  useEffect(() => {
    (async () => {
      const last = await S.get('gw:me', false);
      if (last && last.code) {
        const meta = await S.get(k.meta(last.code));
        if (meta) {
          setCode(last.code);
          if (last.role === 'host') {
            if (meta.status === 'lobby') setRoute('host-lobby');
            else if (meta.status === 'live') setRoute('host-live');
            else if (meta.status === 'final') setRoute('host-final');
            return;
          }
          if (last.pid) {
            setPid(last.pid);
            if (meta.status === 'lobby') {
              const ans = await S.get(k.answers(last.code, last.pid));
              setRoute(ans ? 'player-wait' : 'player-submit');
            } else if (meta.status === 'live') {
              setRoute('player-play');
            } else if (meta.status === 'final') {
              setRoute('player-final');
            }
            return;
          }
        }
      }
      setRoute('landing');
    })();
  }, []);

  const remember = async (data) => { await S.set('gw:me', data, false); };
  const forget = async () => { await S.del('gw:me', false); };

  const exit = async () => {
    await forget();
    setCode(''); setPid(null); setRoute('landing');
  };

  // ===== ROUTING =====
  let screen;
  if (route === 'loading') {
    screen = <Loading />;
  } else if (route === 'landing') {
    screen = <Landing
      onHost={() => setRoute('host-setup')}
      onJoin={() => setRoute('player-join')}
    />;
  } else if (route === 'host-setup') {
    screen = <HostSetup
      onCreated={async (newCode) => {
        setCode(newCode);
        await remember({ code: newCode, role: 'host' });
        setRoute('host-lobby');
      }}
      onBack={() => setRoute('landing')}
    />;
  } else if (route === 'host-lobby') {
    screen = <HostLobby
      code={code}
      onStart={() => setRoute('host-live')}
      onExit={exit}
    />;
  } else if (route === 'host-live') {
    screen = <HostLive
      code={code}
      onFinish={() => setRoute('host-final')}
    />;
  } else if (route === 'host-final') {
    screen = <HostFinal code={code} onExit={exit} />;
  } else if (route === 'player-join') {
    screen = <PlayerJoin
      onJoined={async (joinedCode, joinedPid) => {
        setCode(joinedCode); setPid(joinedPid);
        await remember({ code: joinedCode, role: 'player', pid: joinedPid });
        // determine next screen
        const meta = await S.get(k.meta(joinedCode));
        if (meta?.status === 'live') setRoute('player-play');
        else if (meta?.status === 'final') setRoute('player-final');
        else setRoute('player-submit');
      }}
      onBack={() => setRoute('landing')}
    />;
  } else if (route === 'player-submit') {
    screen = <PlayerSubmit
      code={code} pid={pid}
      onSubmitted={() => setRoute('player-wait')}
    />;
  } else if (route === 'player-wait') {
    screen = <PlayerWait code={code} pid={pid}
      onLive={() => setRoute('player-play')}
      onExit={exit}
    />;
  } else if (route === 'player-play') {
    screen = <PlayerPlay code={code} pid={pid}
      onFinish={() => setRoute('player-final')}
    />;
  } else if (route === 'player-final') {
    screen = <PlayerFinal code={code} pid={pid} onExit={exit} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.ivory,
      fontFamily: FONT_UI,
      backgroundImage: `radial-gradient(ellipse at top, ${C.elevated}55 0%, transparent 50%), radial-gradient(ellipse at bottom right, ${C.goldDeep}22 0%, transparent 60%)`,
    }}>
      {screen}
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================
function Btn({ children, onClick, primary, disabled, full, small, danger, style }) {
  const bg = disabled
    ? C.elevated
    : primary
      ? C.gold
      : danger
        ? 'transparent'
        : C.elevated;
  const color = disabled
    ? C.muted
    : primary
      ? C.bg
      : danger
        ? C.red
        : C.ivory;
  const border = primary
    ? `1.5px solid ${C.gold}`
    : danger
      ? `1.5px solid ${C.red}`
      : `1.5px solid ${C.border}`;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '10px 18px' : '16px 28px',
        background: bg,
        color,
        border,
        borderRadius: 4,
        fontSize: small ? 14 : 16,
        fontFamily: FONT_UI,
        fontWeight: primary ? 700 : 500,
        letterSpacing: primary ? '0.1em' : '0.04em',
        textTransform: primary ? 'uppercase' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        width: full ? '100%' : 'auto',
        boxShadow: primary && !disabled ? `0 4px 20px ${C.gold}33` : 'none',
        ...style,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, multiline, maxLength, autoFocus }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      rows={multiline ? 4 : undefined}
      style={{
        width: '100%',
        padding: '14px 16px',
        background: C.surface,
        border: `1.5px solid ${C.border}`,
        borderRadius: 4,
        color: C.ivory,
        fontFamily: multiline ? FONT_HEAD : FONT_UI,
        fontSize: multiline ? 17 : 16,
        outline: 'none',
        resize: multiline ? 'vertical' : 'none',
        lineHeight: 1.6,
        boxSizing: 'border-box',
      }}
      onFocus={(e) => e.target.style.borderColor = C.gold}
      onBlur={(e) => e.target.style.borderColor = C.border}
    />
  );
}

function Page({ children, narrow, max }) {
  return (
    <div style={{
      maxWidth: max || (narrow ? 480 : 880),
      margin: '0 auto',
      padding: '32px 20px 64px',
      minHeight: '100vh',
      boxSizing: 'border-box',
    }}>
      {children}
    </div>
  );
}

function Logo({ small }) {
  return (
    <div style={{
      fontFamily: FONT_HEAD,
      fontWeight: 700,
      fontSize: small ? 18 : 22,
      letterSpacing: '0.02em',
      color: C.ivory,
    }}>
      <span style={{ color: C.gold }}>·</span> Guess Who <span style={{ color: C.gold }}>·</span>
    </div>
  );
}

function Loading() {
  return (
    <Page narrow>
      <div style={{textAlign:'center', paddingTop: 120, color: C.muted}}>
        <div style={{
          width: 40, height: 40, margin: '0 auto 24px',
          border: `2px solid ${C.border}`,
          borderTopColor: C.gold,
          borderRadius: '50%',
          animation: 'gw-spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes gw-spin { to { transform: rotate(360deg); } }`}</style>
        Restoring session...
      </div>
    </Page>
  );
}

// ============================================================================
// LANDING
// ============================================================================
function Landing({ onHost, onJoin }) {
  return (
    <Page narrow>
      <div style={{paddingTop: 60, textAlign: 'center'}}>
        <div style={{
          fontFamily: FONT_UI, fontSize: 11, letterSpacing: '0.3em',
          color: C.gold, marginBottom: 12, textTransform: 'uppercase',
        }}>
          A Storytelling Party Game
        </div>
        <h1 style={{
          fontFamily: FONT_HEAD, fontWeight: 700,
          fontSize: 'clamp(48px, 12vw, 84px)', lineHeight: 0.95,
          letterSpacing: '-0.03em', margin: '0 0 16px',
          color: C.ivory,
        }}>
          Guess<br/><span style={{color: C.gold}}>Who.</span>
        </h1>
        <p style={{
          fontFamily: FONT_HEAD, fontSize: 18, fontStyle: 'italic',
          color: C.muted, maxWidth: 380, margin: '0 auto 56px', lineHeight: 1.6,
        }}>
          Anonymous answers. Live guessing. The stories behind each one.
        </p>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <Btn primary full onClick={onHost}>I'm hosting</Btn>
          <Btn full onClick={onJoin}>I'm joining</Btn>
        </div>

        <div style={{marginTop: 64, fontSize: 13, color: C.muted, lineHeight: 1.7}}>
          <strong style={{color: C.ivory}}>How it works:</strong> Players submit anonymous answers to 3 questions before the event. The host reveals one answer at a time on a big screen. Everyone guesses who said it. Stories follow.
        </div>
      </div>
    </Page>
  );
}

// ============================================================================
// HOST: SETUP
// ============================================================================
function HostSetup({ onCreated, onBack }) {
  const [code, setCode] = useState(genCode());
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [hostName, setHostName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const updateQ = (i, val) => {
    const next = [...questions];
    next[i] = val;
    setQuestions(next);
  };

  const create = async () => {
    if (!code.trim() || code.length < 3) { setError('Pick a session code (3+ letters)'); return; }
    if (questions.some(q => !q.trim())) { setError('All 3 questions need text'); return; }
    setCreating(true);
    const upper = code.trim().toUpperCase();
    // check for collision
    const existing = await S.get(k.meta(upper));
    if (existing && existing.status !== 'final') {
      setError(`Code "${upper}" is in use. Try another.`);
      setCreating(false);
      return;
    }
    await S.set(k.meta(upper), {
      code: upper,
      questions,
      hostName: hostName.trim() || 'Host',
      status: 'lobby',
      currentCardIndex: 0,
      cardRevealed: false,
      createdAt: Date.now(),
    });
    await S.set(k.players(upper), []);
    onCreated(upper);
  };

  return (
    <Page narrow>
      <BackBar onBack={onBack} />
      <h2 style={H2_STYLE}>Set up your game</h2>

      <Section label="Session code">
        <Input value={code} onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} maxLength={8} />
        <Hint>Players enter this code to join. Make it specific (e.g. <code>FELLOW1</code>).</Hint>
      </Section>

      <Section label="Your name (optional)">
        <Input value={hostName} onChange={setHostName} placeholder="Host" maxLength={30} />
      </Section>

      <Section label="The 3 questions">
        <Hint>Edit freely — questions that prompt stories work best.</Hint>
        {questions.map((q, i) => (
          <div key={i} style={{marginBottom: 12}}>
            <div style={{
              fontSize: 11, color: C.gold, letterSpacing: '0.2em',
              marginBottom: 6, fontWeight: 600,
            }}>
              QUESTION {i + 1}
            </div>
            <Input value={q} onChange={(v) => updateQ(i, v)} multiline maxLength={300} />
          </div>
        ))}
      </Section>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Btn primary full onClick={create} disabled={creating}>
        {creating ? 'Creating...' : 'Open the lobby'}
      </Btn>
    </Page>
  );
}

const H2_STYLE = {
  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 36,
  letterSpacing: '-0.02em', margin: '8px 0 32px', color: C.ivory,
};

function Section({ label, children }) {
  return (
    <div style={{marginBottom: 28}}>
      <div style={{
        fontSize: 11, letterSpacing: '0.25em', color: C.muted,
        marginBottom: 10, textTransform: 'uppercase', fontWeight: 600,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Hint({ children }) {
  return <div style={{fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5}}>{children}</div>;
}

function ErrorMsg({ children }) {
  return (
    <div style={{
      padding: '12px 16px', background: `${C.red}22`,
      border: `1px solid ${C.red}55`, color: C.red,
      borderRadius: 4, marginBottom: 16, fontSize: 14,
    }}>{children}</div>
  );
}

function BackBar({ onBack, right }) {
  return (
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32}}>
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', color: C.muted,
        fontFamily: FONT_UI, fontSize: 14, cursor: 'pointer', padding: 0,
      }}>← back</button>
      <Logo small />
      <div style={{minWidth: 40, textAlign: 'right'}}>{right}</div>
    </div>
  );
}

// ============================================================================
// HOST: LOBBY
// ============================================================================
function HostLobby({ code, onStart, onExit }) {
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  usePoll(async () => {
    const m = await S.get(k.meta(code));
    if (m) setMeta(m);
    const p = await S.get(k.players(code)) || [];
    setPlayers(p);
    // count submissions
    let count = 0;
    for (const pl of p) {
      const a = await S.get(k.answers(code, pl.id));
      if (a) count++;
    }
    setSubmittedCount(count);
  }, 2000, [code]);

  const copyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const start = async () => {
    setStarting(true);
    // Build the deck — only include players with submitted answers
    const submitted = [];
    for (const p of players) {
      const a = await S.get(k.answers(code, p.id));
      if (a && a.length === 3) submitted.push({ player: p, answers: a });
    }
    const cards = [];
    submitted.forEach(({ player, answers }) => {
      answers.forEach((ans, qi) => {
        if (ans && ans.trim()) {
          cards.push({ id: `${player.id}-${qi}`, playerId: player.id, qIndex: qi, answer: ans });
        }
      });
    });
    const shuffled = shuffle(cards);
    await S.set(k.cards(code), shuffled);
    await S.set(k.meta(code), { ...meta, status: 'live', currentCardIndex: 0, cardRevealed: false });
    onStart();
  };

  if (!meta) return <Loading />;

  const canStart = submittedCount >= 2;

  return (
    <Page>
      <BackBar onBack={() => setConfirmExit(true)} right={<Logo small />} />

      <div style={{textAlign: 'center', marginBottom: 48}}>
        <div style={{fontSize: 11, color: C.muted, letterSpacing: '0.3em', marginBottom: 12}}>
          SHARE THIS CODE TO JOIN
        </div>
        <button onClick={copyCode} style={{
          background: 'transparent', border: `2px dashed ${C.gold}`,
          padding: '24px 48px', borderRadius: 8, cursor: 'pointer',
          color: C.gold, fontFamily: FONT_HEAD, fontSize: 64, fontWeight: 700,
          letterSpacing: '0.15em', display: 'inline-block',
        }}>
          {code}
        </button>
        <div style={{fontSize: 13, color: C.muted, marginTop: 12, height: 18}}>
          {copied ? '✓ Copied to clipboard' : 'Tap to copy · Players join from this same app'}
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32}}>
        <StatCard label="Players joined" value={players.length} />
        <StatCard label="Answers submitted" value={`${submittedCount}/${players.length}`} highlight={submittedCount === players.length && players.length >= 2} />
        <StatCard label="Cards in deck" value={submittedCount * 3} />
      </div>

      <Section label="Roster">
        {players.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center', color: C.muted,
            border: `1px dashed ${C.border}`, borderRadius: 4, fontSize: 14,
          }}>
            Waiting for players to join...
          </div>
        ) : (
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
            {players.map(p => (
              <PlayerChip key={p.id} player={p} done={p._submitted} code={code} />
            ))}
          </div>
        )}
      </Section>

      <div style={{position: 'sticky', bottom: 0, paddingTop: 24, paddingBottom: 8, background: `linear-gradient(to top, ${C.bg} 60%, transparent)`}}>
        <Btn primary full onClick={start} disabled={!canStart || starting}>
          {starting ? 'Building deck...' : canStart ? `Start game · ${submittedCount * 3} cards` : 'Waiting for at least 2 submissions'}
        </Btn>
      </div>

      {confirmExit && (
        <Modal>
          <h3 style={{fontFamily: FONT_HEAD, fontSize: 24, margin: '0 0 12px'}}>End this session?</h3>
          <p style={{color: C.muted, fontSize: 14, marginBottom: 24}}>Players will lose progress. The session code becomes free.</p>
          <div style={{display: 'flex', gap: 12}}>
            <Btn full onClick={() => setConfirmExit(false)}>Keep going</Btn>
            <Btn full danger onClick={onExit}>End session</Btn>
          </div>
        </Modal>
      )}
    </Page>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div style={{
      padding: 20, background: highlight ? `${C.gold}11` : C.surface,
      border: `1px solid ${highlight ? C.gold + '66' : C.border}`,
      borderRadius: 4,
    }}>
      <div style={{fontSize: 11, color: C.muted, letterSpacing: '0.2em', marginBottom: 8}}>
        {label.toUpperCase()}
      </div>
      <div style={{fontFamily: FONT_HEAD, fontSize: 32, fontWeight: 700, color: highlight ? C.gold : C.ivory}}>
        {value}
      </div>
    </div>
  );
}

function PlayerChip({ player, code }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const a = await S.get(k.answers(code, player.id));
      if (alive) setDone(!!a);
    })();
    return () => { alive = false; };
  }, [player.id, code]);
  return (
    <div style={{
      padding: '8px 14px',
      background: done ? `${C.gold}22` : C.surface,
      border: `1px solid ${done ? C.gold + '88' : C.border}`,
      borderRadius: 999, fontSize: 14,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{color: done ? C.gold : C.muted}}>{done ? '●' : '○'}</span>
      {player.name}
    </div>
  );
}

function Modal({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0008', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: 28, maxWidth: 420, width: '100%',
      }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// HOST: LIVE
// ============================================================================
function HostLive({ code, onFinish }) {
  const [meta, setMeta] = useState(null);
  const [cards, setCards] = useState([]);
  const [players, setPlayers] = useState([]);
  const [guesses, setGuesses] = useState({}); // { [guesserId]: guessedPlayerId } for current card
  const [advancing, setAdvancing] = useState(false);

  usePoll(async () => {
    const m = await S.get(k.meta(code));
    if (m) setMeta(m);
    const c = await S.get(k.cards(code)) || [];
    setCards(c);
    const p = await S.get(k.players(code)) || [];
    setPlayers(p);
    // load guesses for current card
    if (m && c[m.currentCardIndex]) {
      const cardId = c[m.currentCardIndex].id;
      const keys = await S.list(k.guessPrefix(code, cardId));
      const result = {};
      for (const key of keys) {
        const guesserId = key.split(':').pop();
        const g = await S.get(key);
        if (g) result[guesserId] = g;
      }
      setGuesses(result);
    }
  }, 1500, [code]);

  if (!meta || cards.length === 0) return <Loading />;

  const card = cards[meta.currentCardIndex];
  const owner = players.find(p => p.id === card.playerId);
  const question = meta.questions[card.qIndex];
  const eligibleGuessers = players.filter(p => p.id !== card.playerId);
  const guessCount = Object.keys(guesses).length;
  const totalEligible = eligibleGuessers.length;
  const correctGuessers = Object.entries(guesses)
    .filter(([_, gpid]) => gpid === card.playerId)
    .map(([gid]) => players.find(p => p.id === gid))
    .filter(Boolean);

  const reveal = async () => {
    await S.set(k.meta(code), { ...meta, cardRevealed: true });
  };

  const next = async () => {
    setAdvancing(true);
    if (meta.currentCardIndex + 1 >= cards.length) {
      await S.set(k.meta(code), { ...meta, status: 'final' });
      onFinish();
    } else {
      await S.set(k.meta(code), { ...meta, currentCardIndex: meta.currentCardIndex + 1, cardRevealed: false });
      setAdvancing(false);
    }
  };

  return (
    <Page max={1100}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <div style={{fontFamily: FONT_UI, color: C.muted, fontSize: 13, letterSpacing: '0.2em'}}>
          CARD <span style={{color: C.gold, fontWeight: 700}}>{meta.currentCardIndex + 1}</span> OF {cards.length}
        </div>
        <Logo small />
        <div style={{fontFamily: FONT_UI, color: C.muted, fontSize: 13, letterSpacing: '0.2em'}}>
          CODE <span style={{color: C.gold}}>{code}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height: 2, background: C.border, marginBottom: 40, borderRadius: 2, overflow: 'hidden'}}>
        <div style={{
          height: '100%', width: `${((meta.currentCardIndex + (meta.cardRevealed ? 1 : 0.5)) / cards.length) * 100}%`,
          background: C.gold, transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Question */}
      <div style={{textAlign: 'center', marginBottom: 32}}>
        <div style={{fontSize: 11, letterSpacing: '0.3em', color: C.muted, marginBottom: 12}}>THE QUESTION</div>
        <div style={{
          fontFamily: FONT_HEAD, fontSize: 'clamp(22px, 3vw, 30px)',
          color: C.ivory, fontStyle: 'italic', maxWidth: 800, margin: '0 auto', lineHeight: 1.4,
        }}>
          "{question}"
        </div>
      </div>

      {/* The big card */}
      <BigAnswerCard
        answer={card.answer}
        revealed={meta.cardRevealed}
        ownerName={owner?.name}
      />

      {/* Status / actions */}
      <div style={{marginTop: 40, textAlign: 'center'}}>
        {!meta.cardRevealed ? (
          <>
            <div style={{fontFamily: FONT_HEAD, fontSize: 28, color: C.ivory, marginBottom: 8}}>
              {guessCount} / {totalEligible} guessed
            </div>
            <div style={{color: C.muted, fontSize: 14, marginBottom: 32}}>
              Players are tapping their guess on their phones
            </div>
            <Btn primary onClick={reveal} disabled={guessCount === 0} style={{minWidth: 240}}>
              Reveal answer
            </Btn>
          </>
        ) : (
          <RevealPanel
            owner={owner}
            correctGuessers={correctGuessers}
            totalEligible={totalEligible}
            onNext={next}
            advancing={advancing}
            isLast={meta.currentCardIndex + 1 >= cards.length}
            allGuesses={guesses}
            players={players}
          />
        )}
      </div>
    </Page>
  );
}

function BigAnswerCard({ answer, revealed, ownerName }) {
  return (
    <div style={{
      background: C.surface,
      border: `2px solid ${revealed ? C.gold : C.border}`,
      borderRadius: 8, padding: '48px 40px',
      maxWidth: 800, margin: '0 auto',
      position: 'relative',
      boxShadow: revealed ? `0 0 60px ${C.gold}33` : `0 8px 32px ${C.bg}`,
      transition: 'all 0.4s ease',
      minHeight: 200,
    }}>
      {revealed && ownerName && (
        <div style={{
          position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
          background: C.gold, color: C.bg, padding: '6px 18px', borderRadius: 999,
          fontSize: 12, fontWeight: 700, letterSpacing: '0.2em',
          animation: 'gw-pop 0.4s ease',
        }}>
          {ownerName.toUpperCase()}
        </div>
      )}
      <div style={{
        fontFamily: FONT_HEAD, fontSize: 'clamp(20px, 2.6vw, 28px)',
        lineHeight: 1.6, color: C.ivory, fontWeight: 400,
        textAlign: 'center',
      }}>
        "{answer}"
      </div>
      <style>{`@keyframes gw-pop { 0%{transform: translateX(-50%) scale(0.5); opacity:0} 100%{transform: translateX(-50%) scale(1); opacity:1} }`}</style>
    </div>
  );
}

function RevealPanel({ owner, correctGuessers, totalEligible, onNext, advancing, isLast, allGuesses, players }) {
  const [showAll, setShowAll] = useState(false);
  return (
    <div style={{maxWidth: 700, margin: '0 auto'}}>
      <div style={{
        fontFamily: FONT_HEAD, fontSize: 'clamp(28px, 4vw, 42px)',
        color: C.gold, fontWeight: 700, marginBottom: 8,
      }}>
        It was {owner?.name}.
      </div>
      <div style={{color: C.ivory, fontSize: 16, marginBottom: 24}}>
        {correctGuessers.length} of {totalEligible} guessed correctly.
      </div>

      {correctGuessers.length > 0 && (
        <div style={{marginBottom: 24}}>
          <div style={{fontSize: 11, color: C.muted, letterSpacing: '0.2em', marginBottom: 10}}>
            ✦ CORRECT GUESSES
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center'}}>
            {correctGuessers.map(p => (
              <span key={p.id} style={{
                padding: '6px 14px', background: `${C.green}22`,
                border: `1px solid ${C.green}66`, borderRadius: 999,
                fontSize: 14, color: C.green,
              }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{
        padding: '20px 24px', background: `${C.gold}11`,
        border: `1px solid ${C.gold}44`, borderRadius: 4,
        margin: '24px auto', maxWidth: 540,
        fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: 16, color: C.ivory,
      }}>
        🎤 <strong style={{color: C.gold}}>{owner?.name}</strong> — share the story behind this if you like.
      </div>

      <div style={{display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32}}>
        <Btn small onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Hide' : 'Show'} all guesses
        </Btn>
        <Btn primary onClick={onNext} disabled={advancing}>
          {advancing ? 'Loading...' : isLast ? 'See final scores →' : 'Next card →'}
        </Btn>
      </div>

      {showAll && (
        <div style={{marginTop: 24, textAlign: 'left', maxWidth: 480, margin: '24px auto 0'}}>
          {Object.entries(allGuesses).map(([gid, gpid]) => {
            const guesser = players.find(p => p.id === gid);
            const guessed = players.find(p => p.id === gpid);
            const correct = gpid === owner?.id;
            return (
              <div key={gid} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                fontSize: 14,
              }}>
                <span style={{color: C.muted}}>{guesser?.name}</span>
                <span style={{color: correct ? C.green : C.red}}>
                  {correct ? '✓' : '✗'} {guessed?.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HOST: FINAL
// ============================================================================
function HostFinal({ code, onExit }) {
  const [scores, setScores] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const players = await S.get(k.players(code)) || [];
      const cards = await S.get(k.cards(code)) || [];
      const tally = {};
      players.forEach(p => { tally[p.id] = { player: p, score: 0, attempts: 0, revealed: 0 }; });
      for (const card of cards) {
        const keys = await S.list(k.guessPrefix(code, card.id));
        for (const kk of keys) {
          const guesserId = kk.split(':').pop();
          const guess = await S.get(kk);
          if (tally[guesserId]) {
            tally[guesserId].attempts++;
            if (guess === card.playerId) tally[guesserId].score++;
          }
        }
        if (tally[card.playerId]) tally[card.playerId].revealed++;
      }
      const sorted = Object.values(tally).sort((a, b) => b.score - a.score || b.attempts - a.attempts);
      setScores(sorted);
      setLoaded(true);
    })();
  }, [code]);

  if (!loaded) return <Loading />;

  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);

  return (
    <Page>
      <div style={{textAlign: 'center', marginBottom: 48, paddingTop: 24}}>
        <div style={{fontSize: 11, letterSpacing: '0.3em', color: C.gold, marginBottom: 12}}>
          ✦ FINAL RESULTS ✦
        </div>
        <h1 style={{
          fontFamily: FONT_HEAD, fontSize: 'clamp(40px, 8vw, 72px)',
          color: C.ivory, margin: 0, letterSpacing: '-0.02em',
        }}>
          Leaderboard
        </h1>
      </div>

      {top3.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16,
          alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap',
        }}>
          {top3[1] && <Podium rank={2} entry={top3[1]} height={140} medal="🥈" />}
          {top3[0] && <Podium rank={1} entry={top3[0]} height={180} medal="🥇" gold />}
          {top3[2] && <Podium rank={3} entry={top3[2]} height={110} medal="🥉" />}
        </div>
      )}

      {rest.length > 0 && (
        <div style={{maxWidth: 600, margin: '0 auto'}}>
          <div style={{fontSize: 11, color: C.muted, letterSpacing: '0.2em', marginBottom: 12, textAlign: 'center'}}>
            EVERYONE ELSE
          </div>
          {rest.map((entry, i) => (
            <div key={entry.player.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 20px', background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 8,
            }}>
              <div style={{fontFamily: FONT_HEAD, fontSize: 20, color: C.muted, minWidth: 32}}>
                {i + 4}
              </div>
              <div style={{flex: 1, fontSize: 16, color: C.ivory}}>{entry.player.name}</div>
              <div style={{fontFamily: FONT_HEAD, fontSize: 22, color: C.gold, fontWeight: 700}}>
                {entry.score}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{textAlign: 'center', marginTop: 48}}>
        <Btn onClick={onExit}>End session</Btn>
      </div>
    </Page>
  );
}

function Podium({ rank, entry, height, medal, gold }) {
  return (
    <div style={{textAlign: 'center', minWidth: 130}}>
      <div style={{fontSize: 36, marginBottom: 8}}>{medal}</div>
      <div style={{
        fontFamily: FONT_HEAD, fontSize: 18, color: C.ivory,
        marginBottom: 12, fontWeight: 600,
      }}>
        {entry.player.name}
      </div>
      <div style={{
        height, width: '100%',
        background: gold ? `linear-gradient(180deg, ${C.gold}, ${C.goldDeep})` : C.elevated,
        border: `1px solid ${gold ? C.gold : C.border}`,
        borderRadius: '4px 4px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', padding: 12, position: 'relative',
      }}>
        <div style={{fontFamily: FONT_HEAD, fontSize: 48, fontWeight: 700, color: gold ? C.bg : C.gold, lineHeight: 1}}>
          {entry.score}
        </div>
        <div style={{fontSize: 11, color: gold ? C.bg : C.muted, letterSpacing: '0.15em', marginTop: 4}}>
          CORRECT
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PLAYER: JOIN
// ============================================================================
function PlayerJoin({ onJoined, onBack }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const join = async () => {
    setError('');
    if (!code.trim() || code.length < 3) { setError('Enter the session code from the host'); return; }
    if (!name.trim()) { setError('Add your name so others can guess you'); return; }
    setJoining(true);
    const upper = code.trim().toUpperCase();
    const meta = await S.get(k.meta(upper));
    if (!meta) {
      setError(`No session found for "${upper}". Check the code.`);
      setJoining(false);
      return;
    }
    if (meta.status === 'final') {
      setError('That game has already ended.');
      setJoining(false);
      return;
    }
    const players = await S.get(k.players(upper)) || [];
    // Reuse existing player if same name (allows refresh-to-restore by name)
    let myId;
    const existing = players.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      myId = existing.id;
    } else {
      myId = genId();
      players.push({ id: myId, name: name.trim(), joinedAt: Date.now() });
      await S.set(k.players(upper), players);
    }
    onJoined(upper, myId);
  };

  return (
    <Page narrow>
      <BackBar onBack={onBack} />
      <h2 style={H2_STYLE}>Join the game</h2>

      <Section label="Session code">
        <Input value={code} onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="ABCD" autoFocus maxLength={8} />
      </Section>

      <Section label="Your name">
        <Input value={name} onChange={setName} placeholder="How others know you" maxLength={30} />
        <Hint>Use the name your fellow players will recognise.</Hint>
      </Section>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Btn primary full onClick={join} disabled={joining}>
        {joining ? 'Joining...' : 'Enter the lobby'}
      </Btn>
    </Page>
  );
}

// ============================================================================
// PLAYER: SUBMIT
// ============================================================================
function PlayerSubmit({ code, pid, onSubmitted }) {
  const [meta, setMeta] = useState(null);
  const [answers, setAnswers] = useState(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const m = await S.get(k.meta(code));
      setMeta(m);
    })();
  }, [code]);

  // Watch for game starting while submitting
  usePoll(async () => {
    const m = await S.get(k.meta(code));
    if (m && m.status !== 'lobby') {
      // Game started without us — submit what we have or move on
      onSubmitted();
    }
  }, 3000, [code]);

  if (!meta) return <Loading />;

  const update = (i, v) => {
    const next = [...answers];
    next[i] = v;
    setAnswers(next);
  };

  const submit = async () => {
    if (answers.some(a => !a.trim())) {
      setError('Please answer all 3 questions.');
      return;
    }
    setSubmitting(true);
    await S.set(k.answers(code, pid), answers.map(a => a.trim()));
    onSubmitted();
  };

  return (
    <Page narrow>
      <BackBar onBack={() => {}} right={<Logo small />} />
      <div style={{textAlign: 'center', marginBottom: 32}}>
        <div style={{fontSize: 11, color: C.gold, letterSpacing: '0.3em'}}>SESSION {code}</div>
        <h2 style={{...H2_STYLE, marginTop: 12, marginBottom: 8}}>Your three answers</h2>
        <p style={{color: C.muted, fontSize: 14, lineHeight: 1.6}}>
          Be honest. Be specific. The more vivid, the better the storytelling moment when it gets revealed.
        </p>
      </div>

      {meta.questions.map((q, i) => (
        <Section key={i} label={`Question ${i + 1}`}>
          <div style={{
            fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: 17,
            color: C.ivory, marginBottom: 12, lineHeight: 1.5,
          }}>
            "{q}"
          </div>
          <Input value={answers[i]} onChange={(v) => update(i, v)} multiline maxLength={500} placeholder="Your answer..." />
          <Hint>{500 - answers[i].length} characters left</Hint>
        </Section>
      ))}

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Btn primary full onClick={submit} disabled={submitting}>
        {submitting ? 'Submitting...' : 'Lock in my answers'}
      </Btn>
      <Hint>Once submitted, your answers can't be changed.</Hint>
    </Page>
  );
}

// ============================================================================
// PLAYER: WAIT (lobby, post-submit)
// ============================================================================
function PlayerWait({ code, pid, onLive, onExit }) {
  const [meta, setMeta] = useState(null);
  const [count, setCount] = useState(0);
  const [me, setMe] = useState(null);

  usePoll(async () => {
    const m = await S.get(k.meta(code));
    if (m) {
      setMeta(m);
      if (m.status === 'live') { onLive(); return; }
    }
    const players = await S.get(k.players(code)) || [];
    setCount(players.length);
    setMe(players.find(p => p.id === pid));
  }, 2000, [code]);

  return (
    <Page narrow>
      <BackBar onBack={onExit} right={<Logo small />} />
      <div style={{textAlign: 'center', paddingTop: 60}}>
        <div style={{
          fontSize: 64, marginBottom: 16,
          animation: 'gw-pulse 2s ease-in-out infinite',
        }}>✓</div>
        <style>{`@keyframes gw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        <h2 style={{fontFamily: FONT_HEAD, fontSize: 28, margin: '0 0 12px', color: C.gold}}>
          You're in, {me?.name?.split(' ')[0] || 'friend'}
        </h2>
        <p style={{color: C.muted, fontSize: 15, lineHeight: 1.6, maxWidth: 320, margin: '0 auto 32px'}}>
          Your answers are locked in. Waiting for the host to start the game.
        </p>
        <div style={{
          padding: 20, background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 4, fontSize: 14, color: C.muted,
        }}>
          <div style={{fontSize: 11, letterSpacing: '0.2em', color: C.muted, marginBottom: 6}}>SESSION</div>
          <div style={{fontFamily: FONT_HEAD, fontSize: 28, color: C.ivory, fontWeight: 700, letterSpacing: '0.1em'}}>
            {code}
          </div>
          <div style={{marginTop: 16, fontSize: 13}}>
            {count} {count === 1 ? 'player' : 'players'} in the room
          </div>
        </div>
      </div>
    </Page>
  );
}

// ============================================================================
// PLAYER: PLAY (live guessing)
// ============================================================================
function PlayerPlay({ code, pid, onFinish }) {
  const [meta, setMeta] = useState(null);
  const [cards, setCards] = useState([]);
  const [players, setPlayers] = useState([]);
  const [myGuess, setMyGuess] = useState(null);

  usePoll(async () => {
    const m = await S.get(k.meta(code));
    if (m) {
      setMeta(m);
      if (m.status === 'final') { onFinish(); return; }
    }
    const c = await S.get(k.cards(code)) || [];
    setCards(c);
    const p = await S.get(k.players(code)) || [];
    setPlayers(p);
    // load my guess for current card
    if (m && c[m.currentCardIndex]) {
      const cardId = c[m.currentCardIndex].id;
      const g = await S.get(k.guess(code, cardId, pid));
      setMyGuess(g);
    }
  }, 1500, [code, pid]);

  if (!meta || cards.length === 0) return <Loading />;

  const card = cards[meta.currentCardIndex];
  const isMine = card.playerId === pid;
  const owner = players.find(p => p.id === card.playerId);
  const eligible = players.filter(p => p.id !== card.playerId);

  const submitGuess = async (guessedPid) => {
    setMyGuess(guessedPid);
    await S.set(k.guess(code, card.id, pid), guessedPid);
  };

  // === VIEW: It's my own card ===
  if (isMine && !meta.cardRevealed) {
    return (
      <Page narrow>
        <PlayerHeader code={code} index={meta.currentCardIndex} total={cards.length} />
        <div style={{textAlign: 'center', paddingTop: 40}}>
          <div style={{fontSize: 48, marginBottom: 16}}>👀</div>
          <h2 style={{fontFamily: FONT_HEAD, fontSize: 28, margin: '0 0 12px', color: C.gold}}>
            This one's about you.
          </h2>
          <p style={{color: C.muted, fontSize: 15, lineHeight: 1.6, marginBottom: 32}}>
            Sit tight while the room guesses. When the host reveals, you can share more if you'd like.
          </p>
          <div style={{
            padding: 20, background: C.surface, border: `1px dashed ${C.gold}66`,
            borderRadius: 4, fontFamily: FONT_HEAD, fontStyle: 'italic',
            fontSize: 16, color: C.ivory, lineHeight: 1.5,
          }}>
            "{card.answer}"
          </div>
        </div>
      </Page>
    );
  }

  // === VIEW: Reveal moment ===
  if (meta.cardRevealed) {
    const correct = myGuess === card.playerId;
    const guessed = players.find(p => p.id === myGuess);
    return (
      <Page narrow>
        <PlayerHeader code={code} index={meta.currentCardIndex} total={cards.length} />
        <div style={{textAlign: 'center', paddingTop: 40}}>
          {isMine ? (
            <>
              <h2 style={{fontFamily: FONT_HEAD, fontSize: 32, margin: '0 0 12px', color: C.gold}}>
                The room knows now.
              </h2>
              <p style={{color: C.muted, fontSize: 15, marginBottom: 32}}>
                Want to share the story? The mic is yours.
              </p>
            </>
          ) : (
            <>
              <div style={{fontSize: 64, marginBottom: 8}}>{correct ? '✓' : '✗'}</div>
              <div style={{
                fontSize: 13, letterSpacing: '0.3em', color: correct ? C.green : C.red,
                marginBottom: 16,
              }}>
                {myGuess ? (correct ? 'CORRECT' : 'NOT QUITE') : 'NO GUESS'}
              </div>
              <h2 style={{fontFamily: FONT_HEAD, fontSize: 28, margin: '0 0 8px'}}>
                It was <span style={{color: C.gold}}>{owner?.name}</span>
              </h2>
              {myGuess && !correct && guessed && (
                <p style={{color: C.muted, fontSize: 14, marginBottom: 32}}>
                  You guessed {guessed.name}.
                </p>
              )}
            </>
          )}
          <div style={{marginTop: 32, color: C.muted, fontSize: 14}}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: C.gold, marginRight: 8,
              animation: 'gw-pulse 1.5s ease-in-out infinite',
            }} />
            Waiting for next card...
          </div>
        </div>
      </Page>
    );
  }

  // === VIEW: Guess UI ===
  return (
    <Page narrow>
      <PlayerHeader code={code} index={meta.currentCardIndex} total={cards.length} />

      <div style={{
        padding: '24px 20px', background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 24,
      }}>
        <div style={{fontSize: 11, color: C.muted, letterSpacing: '0.25em', marginBottom: 8}}>
          THE QUESTION
        </div>
        <div style={{fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: 15, color: C.ivory, marginBottom: 16}}>
          "{meta.questions[card.qIndex]}"
        </div>
        <div style={{fontSize: 11, color: C.muted, letterSpacing: '0.25em', marginBottom: 8}}>
          THE ANSWER
        </div>
        <div style={{
          fontFamily: FONT_HEAD, fontSize: 18, color: C.ivory,
          lineHeight: 1.6, fontWeight: 500,
        }}>
          "{card.answer}"
        </div>
      </div>

      <div style={{
        fontSize: 13, letterSpacing: '0.2em', color: C.gold,
        marginBottom: 12, textAlign: 'center', fontWeight: 600,
      }}>
        {myGuess ? '✓ LOCKED IN — CHANGE BELOW IF YOU LIKE' : 'WHO SAID THIS?'}
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 80}}>
        {eligible.map(p => (
          <button
            key={p.id}
            onClick={() => submitGuess(p.id)}
            style={{
              padding: '16px 20px',
              background: myGuess === p.id ? `${C.gold}22` : C.surface,
              border: `1.5px solid ${myGuess === p.id ? C.gold : C.border}`,
              borderRadius: 4, color: C.ivory,
              fontFamily: FONT_UI, fontSize: 16,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s ease',
              fontWeight: myGuess === p.id ? 600 : 400,
            }}
          >
            {myGuess === p.id && <span style={{color: C.gold, marginRight: 10}}>●</span>}
            {p.name}
          </button>
        ))}
      </div>
    </Page>
  );
}

function PlayerHeader({ code, index, total }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{fontSize: 12, color: C.muted, letterSpacing: '0.2em'}}>
        CARD <span style={{color: C.gold, fontWeight: 700}}>{index + 1}</span> / {total}
      </div>
      <Logo small />
      <div style={{fontSize: 12, color: C.muted, letterSpacing: '0.2em'}}>{code}</div>
    </div>
  );
}

// ============================================================================
// PLAYER: FINAL
// ============================================================================
function PlayerFinal({ code, pid, onExit }) {
  const [scores, setScores] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const players = await S.get(k.players(code)) || [];
      const cards = await S.get(k.cards(code)) || [];
      const tally = {};
      players.forEach(p => { tally[p.id] = { player: p, score: 0 }; });
      for (const card of cards) {
        const keys = await S.list(k.guessPrefix(code, card.id));
        for (const kk of keys) {
          const guesserId = kk.split(':').pop();
          const guess = await S.get(kk);
          if (tally[guesserId] && guess === card.playerId) {
            tally[guesserId].score++;
          }
        }
      }
      const sorted = Object.values(tally).sort((a, b) => b.score - a.score);
      setScores(sorted);
      setLoaded(true);
    })();
  }, [code]);

  if (!loaded) return <Loading />;

  const myRank = scores.findIndex(s => s.player.id === pid) + 1;
  const myScore = scores.find(s => s.player.id === pid)?.score || 0;

  return (
    <Page narrow>
      <BackBar onBack={onExit} right={<Logo small />} />
      <div style={{textAlign: 'center', paddingTop: 24, marginBottom: 40}}>
        <div style={{fontSize: 11, letterSpacing: '0.3em', color: C.gold}}>YOUR FINAL POSITION</div>
        <div style={{fontFamily: FONT_HEAD, fontSize: 96, fontWeight: 700, color: C.gold, lineHeight: 1, margin: '8px 0'}}>
          #{myRank}
        </div>
        <div style={{color: C.muted, fontSize: 15}}>
          {myScore} correct {myScore === 1 ? 'guess' : 'guesses'}
        </div>
      </div>

      <Section label="Full leaderboard">
        {scores.map((s, i) => {
          const isMe = s.player.id === pid;
          return (
            <div key={s.player.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '12px 16px',
              background: isMe ? `${C.gold}22` : C.surface,
              border: `1px solid ${isMe ? C.gold + '88' : C.border}`,
              borderRadius: 4, marginBottom: 6,
            }}>
              <div style={{fontFamily: FONT_HEAD, fontSize: 18, color: i < 3 ? C.gold : C.muted, minWidth: 28, fontWeight: 700}}>
                {i + 1}
              </div>
              <div style={{flex: 1, fontSize: 15, color: C.ivory}}>
                {s.player.name} {isMe && <span style={{fontSize: 11, color: C.gold, letterSpacing: '0.15em'}}>· YOU</span>}
              </div>
              <div style={{fontFamily: FONT_HEAD, fontSize: 20, color: C.gold, fontWeight: 700}}>
                {s.score}
              </div>
            </div>
          );
        })}
      </Section>

      <div style={{textAlign: 'center', marginTop: 32}}>
        <Btn onClick={onExit}>Leave game</Btn>
      </div>
    </Page>
  );
}
