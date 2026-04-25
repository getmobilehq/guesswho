# AGENT.md
> **Read this first. Then read SKILLS.md. Then follow LOOP.md.**

---

## 1. Mission

Build **Guess Who** — an intimate storytelling party game for a small fellowship/family/team setting. Players submit anonymous answers to 3 questions before the event. The host reveals one answer at a time on a big screen. Everyone guesses *whose* answer it is on their phone. Stories follow each reveal.

The validated reference prototype lives at `/reference/prototype.jsx`. It works end-to-end on `claude.ai` artifacts using `window.storage` polling. **Your job is to ship the production version**: a real Next.js + Supabase app deployed to Vercel, with true WebSocket real-time, QR-code joining, and resilience under flaky in-room WiFi.

Do not re-invent the product. The flows, the screens, the copy, the colour story — all decided. Replicate them faithfully and improve only the substrate.

---

## 2. Who you are building for

A non-technical host running a small gathering (8–30 people) on a Friday evening. The host owns one screen (TV via HDMI laptop, or projector). Every player has their own phone. WiFi may be patchy. The host is not going to debug anything mid-game. Players will not install apps.

**This is the load-bearing constraint.** Every decision — stack, real-time strategy, error handling, copy — must protect the host's evening. If something can fail, it must fail gracefully and visibly with a recovery path the host can execute in under 10 seconds.

---

## 3. Tech stack (locked — do not deviate without asking)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15+ (App Router)** | Server Components for fast first paint on phones, Server Actions for mutations, native Vercel deploy |
| Language | **TypeScript (strict)** | Domain has enough state (status, card index, reveal flag, scoring) that runtime bugs would be costly |
| Styling | **Tailwind CSS v4** | Brand tokens map cleanly to CSS vars; rapid iteration |
| Database | **Supabase (Postgres)** | Free tier covers this; Row Level Security simple; no custom backend |
| Realtime | **Supabase Realtime (Postgres Changes)** | True WebSocket sync; no polling needed; ~150ms p50 |
| Auth | **None** (anonymous sessions) | Players identified by name within a session; host identified by browser localStorage token |
| QR codes | **`qrcode.react`** | Static SVG, zero runtime cost |
| Deploy | **Vercel** | Zero-config Next.js, free tier covers it |
| Package manager | **pnpm** | Faster, deterministic |
| Node | **22.x LTS** | Matches Vercel default |

**Forbidden:** Redux, MobX, tRPC, GraphQL, Prisma (use Supabase client directly), Sass, CSS-in-JS libraries, `@supabase/auth-helpers` (unnecessary — no real auth). If you find yourself reaching for any of these, stop and re-read this section.

---

## 4. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                           VERCEL                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Next.js App (App Router)                     │   │
│  │                                                         │   │
│  │  /              landing                                 │   │
│  │  /host/new      host setup                              │   │
│  │  /host/[code]/lobby  | /live | /final                   │   │
│  │  /play/[code]   join → submit → wait → game → final     │   │
│  │                                                         │   │
│  │  Server Actions: createSession, joinSession,            │   │
│  │                  submitAnswers, startGame, revealCard,  │   │
│  │                  nextCard, submitGuess, endSession      │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬─────────────────────────────────┘
                               │
                               │ Postgres + Realtime WebSocket
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                          SUPABASE                              │
│  Tables: sessions, players, answers, cards, guesses            │
│  Realtime: subscribe to row changes filtered by session code   │
└────────────────────────────────────────────────────────────────┘
```

**Data flow rules:**
1. **Mutations** always go through Server Actions (never direct Supabase calls from client). This keeps the service-role key server-side and gives one place to add validation.
2. **Reads + subscriptions** happen client-side using the anon key. Row Level Security on the database enforces that clients can only read rows for sessions they know the code of.
3. **Real-time** is Postgres Changes via `supabase-js`. Each client subscribes to row changes for their session code only — never global subscriptions.
4. **Optimistic UI** for guesses (the most latency-sensitive interaction). Everything else can wait for the round-trip.

---

## 5. Domain model

### Database schema (`/db/schema.sql`)

```sql
-- All tables enforce RLS; the anon role can SELECT any row but only
-- via Server Actions for INSERT/UPDATE/DELETE.

create type session_status as enum ('lobby', 'live', 'final');

create table sessions (
  code            text primary key check (length(code) between 3 and 12),
  host_token      text not null,                  -- random; stored in host's localStorage
  host_name       text not null default 'Host',
  questions       jsonb not null,                 -- ["q1", "q2", "q3"]
  status          session_status not null default 'lobby',
  current_card_index int not null default 0,
  card_revealed   boolean not null default false,
  created_at      timestamptz not null default now(),
  ended_at        timestamptz
);

create table players (
  id              uuid primary key default gen_random_uuid(),
  session_code    text not null references sessions(code) on delete cascade,
  name            text not null check (length(trim(name)) between 1 and 30),
  player_token    text not null,                  -- random; stored in player's localStorage
  joined_at       timestamptz not null default now(),
  unique (session_code, lower(name))
);

create table answers (
  player_id       uuid not null references players(id) on delete cascade,
  q_index         int not null check (q_index between 0 and 2),
  text            text not null check (length(trim(text)) between 1 and 500),
  primary key (player_id, q_index)
);

create table cards (
  id              uuid primary key default gen_random_uuid(),
  session_code    text not null references sessions(code) on delete cascade,
  player_id       uuid not null references players(id) on delete cascade,
  q_index         int not null,
  position        int not null,                   -- shuffled order in the deck
  unique (session_code, position)
);
create index cards_session_position_idx on cards(session_code, position);

create table guesses (
  card_id         uuid not null references cards(id) on delete cascade,
  guesser_id      uuid not null references players(id) on delete cascade,
  guessed_player_id uuid not null references players(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (card_id, guesser_id)
);

-- Enable realtime for the tables clients subscribe to
alter publication supabase_realtime add table sessions, players, answers, guesses;
```

### Session state machine

```
   ┌────────┐  startGame    ┌──────┐  (last card)   ┌───────┐
   │ lobby  │ ────────────▶ │ live │ ─────────────▶ │ final │
   └────────┘               └──────┘                └───────┘
        ▲                       │
        │                       │ within live, per card:
        │                       │   cardRevealed: false ─▶ true ─▶ next card (false)
   newSession                   │
```

`status` transitions are one-way. Going backwards is not a feature. `current_card_index` only increments. `card_revealed` flips false→true within a card, then resets to false on `nextCard`.

### Identity model

- **Host token**: generated at session creation, stored in `localStorage` under `gw:host:<code>`. Server Actions verify the host token matches `sessions.host_token` before allowing host-only mutations (start, reveal, next, end).
- **Player token**: generated at join, stored under `gw:player:<code>`. Verified for `submitAnswers` and `submitGuess`.
- **No accounts.** Lose the device, lose access. This is intentional — game lasts ~45 minutes.

---

## 6. Critical user flows

Read each as a sequence of state transitions. The reference prototype implements all of these — copy the UX, not the implementation.

### 6.1 Host setup → lobby
1. Host visits `/host/new` → fills form (code, name, 3 questions; defaults provided)
2. Server Action `createSession` → inserts session, returns `{ code, hostToken }`
3. Client stores `hostToken`, redirects to `/host/[code]/lobby`
4. Lobby subscribes to `players` and `answers` rows for this code
5. Lobby renders QR code + big readable code, live roster, submission counts
6. **Start button enabled when ≥3 players have submitted all 3 answers** (raised from 2 — at 2 players the guess set is forced to a single candidate so the round is degenerate)

### 6.2 Player join → submit → wait
1. Player visits `/play/[code]` (via QR scan or manual entry)
2. Form: name only (code prefilled). Submit → `joinSession` → returns `playerToken`
3. Redirect to `/play/[code]/submit` — 3 questions, 3 textareas, character counter
4. Submit → `submitAnswers` writes 3 rows to `answers` table → redirect to `/wait`
5. Wait screen subscribes to `sessions.status`. When it flips to `live`, redirect to `/game`

### 6.3 Live round
1. Host taps Start → `startGame` builds deck (shuffles all cards), sets `status='live'`, `current_card_index=0`, `card_revealed=false`
2. Host screen `/host/[code]/live` shows current card, question, live guess count
3. Player screen `/play/[code]/game` shows the answer + buttons for every other player's name
4. Player taps a name → `submitGuess` (upsert into `guesses`)
5. Player can change guess until `card_revealed = true`
6. **If the current card belongs to the player, they see a "this is yours" screen instead of guess buttons**
7. Host taps Reveal → `revealCard` sets `card_revealed = true`
8. All clients see the reveal: owner's name, correct guessers list, "share the story" prompt to the owner
9. Host taps Next → `nextCard` increments `current_card_index`, sets `card_revealed = false`. If past last card, sets `status = 'final'`

### 6.4 Final
1. All clients redirect to their final screen (host: `/host/[code]/final`, player: `/play/[code]/final`)
2. Host: full leaderboard with podium for top 3
3. Player: their rank in giant gold + full leaderboard with their row highlighted
4. Host can tap **End session** → `endSession` sets `ended_at` (data retained 30 days for nostalgia, then nightly cron deletes)

---

## 7. Brand system (non-negotiable)

Palette: **Midnight Gold**. Premium, intimate, game-show energy that reads from across a room.

```css
:root {
  /* Colour */
  --bg:        #0D0D2B;  /* Midnight (page bg) */
  --surface:   #161642;  /* Card bg */
  --elevated:  #1F1F55;  /* Hover, raised */
  --gold:      #F4C753;  /* Primary accent, all CTAs */
  --gold-deep: #C9A227;  /* Hover state for gold */
  --ivory:     #FDFAF0;  /* Body text */
  --muted:     #9D9BB8;  /* Secondary text, hints */
  --border:    #2A2A5E;  /* All borders */
  --green:     #7DD181;  /* Correct guess */
  --red:       #E07A8B;  /* Wrong guess, danger */

  /* Type */
  --font-head: 'Lora', Georgia, serif;        /* Storytelling moments, large display */
  --font-ui:   'Didact Gothic', system-ui;    /* All chrome, buttons, labels */

  /* Space (8pt grid — never use arbitrary px) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px;
  --s-6: 24px; --s-8: 32px; --s-12: 48px; --s-16: 64px;

  /* Radius — pick ONE per project. We use 4px (sharp). */
  --r: 4px;
}
```

Google Fonts import (always via CDN in `<head>`, never @font-face):
```
https://fonts.googleapis.com/css2?family=Didact+Gothic&family=Lora:wght@400;500;600;700&display=swap
```

**Design rules — these are tested in the self-review checklist in LOOP.md:**

1. **One accent only**: gold. Green and red are *semantic* (correct/wrong), not decorative.
2. **Lora is for moments, not chrome.** Use Lora for: the answer card, question text, big headings, the "It was [name]" reveal. Use Didact Gothic for: buttons, labels, hints, stats.
3. **Buttons**: primary = gold bg + midnight text + uppercase + 0.1em letter-spacing. Secondary = elevated bg + ivory text + sentence case.
4. **Borders over shadows.** Shadow only on the active card during reveal (`0 0 60px var(--gold)/20%`).
5. **Generous whitespace.** Page padding minimum 20px. Section gaps minimum 32px. Trust the negative space.
6. **Mobile-first.** Every screen must work in a 360px-wide viewport. Test at that width religiously.
7. **The host screen should be readable from 5 metres.** Minimum question font size on host live view: 24px (better: 28–32px responsive).
8. **No emoji decoration in chrome.** Emoji are reserved for the reveal moments (✓ ✗ 🎤 🥇🥈🥉) and the Logo (`·`).

If a design choice isn't covered above, default to "what would the prototype do?" then check `/reference/prototype.jsx`.

---

## 8. Folder structure

```
guess-who/
├── app/
│   ├── layout.tsx                  # Root layout, Google Fonts, global CSS
│   ├── globals.css                 # Tailwind directives + CSS vars
│   ├── page.tsx                    # Landing
│   ├── host/
│   │   ├── new/page.tsx            # Setup form
│   │   └── [code]/
│   │       ├── layout.tsx          # Verifies host token, provides session context
│   │       ├── lobby/page.tsx
│   │       ├── live/page.tsx
│   │       └── final/page.tsx
│   └── play/
│       └── [code]/
│           ├── layout.tsx          # Verifies player token (or shows join)
│           ├── page.tsx            # Join form
│           ├── submit/page.tsx
│           ├── wait/page.tsx
│           ├── game/page.tsx
│           └── final/page.tsx
├── components/
│   ├── ui/                         # Generic primitives (Button, Input, Card)
│   ├── game/                       # Domain components (BigAnswerCard, Podium, GuessButtons)
│   └── brand/                      # Logo, Loading, Page wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client (anon key)
│   │   ├── server.ts               # Server client (service role) — NEVER imported in client code
│   │   └── types.ts                # Generated DB types
│   ├── actions/                    # All Server Actions, one file per domain verb
│   │   ├── createSession.ts
│   │   ├── joinSession.ts
│   │   ├── submitAnswers.ts
│   │   ├── startGame.ts
│   │   ├── revealCard.ts
│   │   ├── nextCard.ts
│   │   ├── submitGuess.ts
│   │   └── endSession.ts
│   ├── hooks/
│   │   ├── useSession.ts           # Realtime subscription to sessions row
│   │   ├── usePlayers.ts           # Realtime subscription to players + their answer counts
│   │   ├── useGuesses.ts           # Realtime subscription to guesses for current card
│   │   └── useLocalToken.ts        # Read host/player token from localStorage
│   ├── game/
│   │   ├── deck.ts                 # buildDeck(players, answers) → shuffled cards
│   │   ├── scoring.ts              # tallyScores(cards, guesses) → leaderboard
│   │   └── validation.ts           # zod schemas for every Server Action input
│   └── tokens.ts                   # Brand token re-exports for use in TS (rare)
├── db/
│   ├── schema.sql                  # The schema in section 5
│   ├── policies.sql                # RLS policies
│   └── seed.sql                    # Local dev seed (optional)
├── reference/
│   └── prototype.jsx               # The validated artifact — READ THIS BEFORE BUILDING ANY SCREEN
├── public/
│   └── (favicon, og image)
├── AGENT.md                        # This file
├── SKILLS.md                       # Reusable patterns
├── LOOP.md                         # Build workflow
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Naming conventions:**
- Components: `PascalCase.tsx`, one component per file, default export
- Hooks: `useThing.ts`, named export
- Actions: `verbObject.ts`, named export, always `'use server'` at top
- Tests (when added): `Thing.test.ts(x)` colocated

---

## 9. Environment variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # Safe to expose; RLS protects data
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # SERVER ONLY. Never import into client.
NEXT_PUBLIC_APP_URL=http://localhost:3000   # For QR code generation
```

The service role key bypasses RLS. It must only be imported from `lib/supabase/server.ts` and that file must only be imported from Server Actions or Server Components. Add an ESLint rule to catch violations.

---

## 10. Definition of Done (per feature)

A feature is not done until **every** box is ticked:

- [ ] Implements the flow as described in section 6 and visualised in `/reference/prototype.jsx`
- [ ] Works at 360px viewport width without horizontal scroll
- [ ] All Server Action inputs validated with zod (see SKILLS.md §5)
- [ ] All async UI has explicit loading + error + empty states
- [ ] Real-time subscription cleanly unsubscribes on unmount (no memory leaks)
- [ ] Brand tokens used; no hex codes hardcoded outside `globals.css` and `tailwind.config.ts`
- [ ] No `console.log` left in code (use `console.error` for genuine errors only)
- [ ] No `any` types; no `@ts-ignore`; no `eslint-disable` without an inline comment justifying
- [ ] Tested manually with two browser windows (host + player) for cross-device sync
- [ ] Tested with WiFi throttled to "Slow 3G" in DevTools — no broken screens, only slow ones

---

## 11. What you do NOT need to do

To stay focused, here is the explicit scope cut:

- ❌ User accounts / auth providers
- ❌ Multiple concurrent games per user
- ❌ Game history / replay
- ❌ Avatars or profile pictures
- ❌ In-game chat
- ❌ Sound effects (v2)
- ❌ Internationalisation
- ❌ Dark/light mode toggle (it's always dark — that's the brand)
- ❌ Native mobile apps
- ❌ Admin dashboard
- ❌ Analytics beyond Vercel's built-in

If you find yourself building any of the above, stop and re-read this section.

---

## 12. When to ask the human

You are empowered to make implementation choices freely. Ask only when:

- A requirement in this document genuinely conflicts with another requirement in this document
- You discover a Supabase or Next.js limitation that forces a stack deviation
- You hit a real-time edge case the prototype doesn't cover (e.g. host disconnects mid-reveal)
- The brand system doesn't specify how to render a new component pattern

Do **not** ask for permission to:
- Refactor for clarity
- Add a missing loading state
- Tighten copy
- Improve a microinteraction
- Add a sensible default

Use your taste. Joseph hired a rockstar dev — be one.
