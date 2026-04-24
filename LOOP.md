# LOOP.md
> **The workflow.** Six phases. Each phase has tasks, exit criteria, and a self-review you must pass before moving on. Resist the urge to skip ahead — every phase de-risks the next.

---

## Working principles (apply throughout)

1. **Plan in writing before each phase.** Open a scratch note. List the files you'll create or modify, and the order. If you can't list it, you don't understand it yet.
2. **Build vertically, not horizontally.** Ship one screen end-to-end (UI + action + DB + realtime) before starting the next. A working ugly thing beats a beautiful broken thing.
3. **Commit small.** Every working state is a commit. Conventional Commits format: `feat:`, `fix:`, `chore:`, `refactor:`. Commit messages describe *why*, not *what* (the diff already shows what).
4. **Test with two browser windows.** Every realtime feature gets verified with one Chrome window as host and one Firefox window (or incognito) as player. Throttled network in both. This catches 80% of sync bugs.
5. **Re-read AGENT.md and SKILLS.md at the start of each phase.** Five minutes of re-reading prevents fifty minutes of refactoring.
6. **No TODO comments shipped to main.** Either do it now, or open a follow-up issue.

---

## Phase 0 — Pre-flight (30 min)

**Goal:** A blank Next.js app in your editor, with Supabase connected, brand tokens loaded, and a deploy preview live on Vercel.

### Tasks

1. `pnpm dlx create-next-app@latest guess-who --typescript --tailwind --app --no-src-dir --turbo`
2. `cd guess-who && pnpm add @supabase/ssr @supabase/supabase-js zod sonner qrcode.react clsx tailwind-merge`
3. Create a Supabase project (free tier). Copy URL + anon key + service role key into `.env.local` (use `.env.local.example` from AGENT.md §9 as template).
4. In Supabase SQL Editor, run `db/schema.sql` from AGENT.md §5.
5. Apply `tailwind.config.ts` and `globals.css` from SKILLS.md §13.
6. Add Google Fonts link to `app/layout.tsx`.
7. Implement the `Page`, `Logo`, `Loading`, `Button`, `Input` primitives from SKILLS.md §6 and §7.
8. Build the **Landing page** (`app/page.tsx`) — copy text and structure from `reference/prototype.jsx` `<Landing>` component. No actions yet, just two buttons that route to `/host/new` and `/play`.
9. Push to GitHub. Connect to Vercel. Add env vars in Vercel dashboard. Get a deploy preview URL.

### Exit criteria

- [ ] `pnpm dev` runs without warnings
- [ ] Landing page renders at the deploy preview URL on your phone, looks correct in dark mode
- [ ] Lora and Didact Gothic fonts loaded (verify in DevTools → Network → woff2 files present)
- [ ] Tapping "I'm hosting" navigates to a stub `/host/new` (404 is fine for now)
- [ ] Supabase tables visible in Supabase dashboard

### Self-review

Open the deploy preview on your phone. Hold it at arm's length. Does it look like a premium product or a hackathon project? If hackathon, fix the spacing, the type sizes, the gradient density before continuing. First impressions compound.

---

## Phase 1 — Host setup → lobby (no realtime yet) (~2 hr)

**Goal:** A host can create a session, see the code + QR on screen, and the lobby renders correctly. No players yet.

### Tasks

1. **Action**: `lib/actions/createSession.ts` — implements Skill 2 pattern. Inputs: `code, hostName, questions[3]`. Generates `hostToken` server-side, inserts row, returns `{ ok, code, hostToken }`.
2. **Validation**: `lib/game/validation.ts` — port the schemas from SKILLS.md §5.
3. **Page**: `app/host/new/page.tsx` — client component. Form with code, name, 3 questions. On submit, call action, store token via `localToken.set('host', code, token)`, then `router.push('/host/[code]/lobby')`.
4. **Layout**: `app/host/[code]/layout.tsx` — client component that reads `localToken.get('host', code)`. If absent, redirect to `/host/new` with a toast: "You're not the host of this session."
5. **Page**: `app/host/[code]/lobby/page.tsx` — server component that fetches the session row server-side using `supabaseAdmin`, then passes data to a client `<Lobby>` component. Renders QR (Skill 9), big code, stat cards (still showing 0/0/0), "Start" button (disabled).
6. **Test the round trip**: create a session, refresh the lobby page, verify it loads. Open the lobby URL in incognito — should redirect to `/host/new`.

### Exit criteria

- [ ] Host can create a session in <30 seconds from landing
- [ ] Session row appears in Supabase
- [ ] Lobby renders at `/host/[code]/lobby` after creation
- [ ] Refreshing the lobby page does not lose the session (localStorage works)
- [ ] Incognito user cannot access another host's lobby

### Self-review

- [ ] All three Server Action error paths (validation fail, code collision, DB error) return human-readable error messages, surfaced as toasts
- [ ] Form fields use the `<Input>` primitive, not raw `<input>` tags
- [ ] No hex codes in the JSX (only Tailwind class names like `text-gold`)
- [ ] No `console.log` statements

---

## Phase 2 — Player join → submit answers → wait (~2.5 hr)

**Goal:** Up to 30 players can join a session, submit answers, land on the wait screen. Lobby shows them appearing live.

### Tasks

1. **Action**: `joinSession` — inputs: `code, name`. Verifies session exists and `status='lobby'`. Checks for duplicate name (case-insensitive). Inserts player, generates token, returns `{ ok, playerId, playerToken }`.
2. **Action**: `submitAnswers` — inputs: `code, playerId, playerToken, answers[3]`. Verifies token. Inserts 3 rows into `answers` (use a single `.insert()` call with array). Idempotent — if rows exist, error gracefully ("You've already submitted").
3. **Page**: `app/play/[code]/page.tsx` — join form. On submit, set localToken, route to `/play/[code]/submit`.
4. **Page**: `app/play/[code]/submit/page.tsx` — three textareas, character counter, submit button. After submit, route to `/wait`.
5. **Page**: `app/play/[code]/wait/page.tsx` — the warm "you're in" screen.
6. **Layout**: `app/play/[code]/layout.tsx` — checks for player token. If absent, route to `/play/[code]` (the join page).
7. **Hook**: `usePlayers(code)` — Skill 3 pattern, but listens to BOTH `players` INSERTs and `answers` INSERTs (need both to compute "submitted/total"). Returns `{ players, submittedCount, loading }`.
8. **Wire up Lobby**: replace the static stat cards with live data from `usePlayers`. Enable Start button when `submittedCount >= 2`.

### Exit criteria

- [ ] Two browser windows: window A (host) sees window B's player appear in the lobby within 2 seconds of joining
- [ ] Window B (player) can submit answers, route to wait
- [ ] Window A's "submitted" count updates within 2 seconds of B submitting
- [ ] Window A's Start button enables when ≥2 players have submitted
- [ ] Refresh on the wait screen restores the wait screen (token persistence works)

### Self-review

- [ ] What happens if a player tries to join a session that's already `live`? — should show "Game already started" cleanly
- [ ] What happens if a player joins with a duplicate name? — should show "Someone's already using that name"
- [ ] What happens if a player submits empty answers? — zod blocks at action, but does the form also prevent the submit visually?
- [ ] Realtime channels are cleaned up on unmount? Add `console.log('cleanup')` to the cleanup, navigate away, verify it fires, then **remove the log**

---

## Phase 3 — Live round (host view) (~2 hr)

**Goal:** Host taps Start. Deck builds. Host sees the current card in big readable type with the live guess count.

### Tasks

1. **Pure functions**: `lib/game/deck.ts` — `buildDeck` from Skill 10. Add a unit test: paste a quick `tsx` file and run it with `pnpm dlx tsx test-deck.ts` — verify 30 cards out for 10 players × 3 answers, no consecutive same-player pairs in 5 random runs.
2. **Action**: `startGame` — verifies host token, fetches all players + answers, calls `buildDeck`, inserts cards into `cards` table (single batch insert), updates session status to `'live'` with `current_card_index=0, card_revealed=false`.
3. **Action**: `revealCard` — host-only, sets `card_revealed=true`.
4. **Action**: `nextCard` — host-only. If `current_card_index + 1 >= total cards`, set `status='final'`. Else increment index, reset `card_revealed=false`.
5. **Page**: `app/host/[code]/live/page.tsx` — server component fetches session + current card + question. Client component handles realtime + render.
6. **Component**: `<BigAnswerCard>` — port from prototype. Lora type, gold border on reveal, owner-name pill on top centre when revealed.
7. **Hook**: `useGuesses(code, cardId)` — subscribes to `guesses` filtered by current `card_id`. Returns `{ guesses, count }`.
8. **Wait screen polls for `status` change**: `usePlayers` already includes session status — when it flips to `'live'`, the wait screen routes the player to `/play/[code]/game`.

### Exit criteria

- [ ] Tapping Start on host shows the first card on the host screen within 1 second
- [ ] Card content displayed at minimum 24px (better: 28–32px responsive)
- [ ] Guess count display updates as fake guesses are inserted directly via Supabase SQL editor
- [ ] Tapping Reveal shows the owner pill, correct guesser list, and "share the story" prompt
- [ ] Tapping Next advances to next card, all UI resets correctly
- [ ] Last card → Next sets status to `final` and routes to `/host/[code]/final` (stub for now)

### Self-review

- [ ] Host live screen readable from across a room — print to your phone, hold it 5m away, can you read the question?
- [ ] Reveal animation feels intentional (the gold pill pop, the border glow) — not jittery
- [ ] Skill 3 cleanup pattern: switching to next card creates a new `useGuesses` channel and the old one is removed (verify in Supabase dashboard → Realtime → connected clients)

---

## Phase 4 — Live round (player view) + scoring + final (~2.5 hr)

**Goal:** Players can guess. The "this card is yours" branch works. Reveal moments sync. Final leaderboard renders correctly.

### Tasks

1. **Action**: `submitGuess` — inputs: `code, playerToken, cardId, guessedPlayerId`. Verifies player token. Verifies card belongs to current session and current_card_index. Verifies card is NOT owned by guesser (server-side). Upserts into `guesses`.
2. **Page**: `app/play/[code]/game/page.tsx` — three branches:
   - If current card's `player_id === my player id`: render the "this is yours" screen
   - Else if `card_revealed === true`: render the reveal feedback (correct/wrong + owner name)
   - Else: render the guess buttons
3. **Component**: `<GuessButtons>` — Skill 4 pattern (optimistic). One button per other player. Reset optimistic state when `cardId` changes.
4. **Pure function**: `lib/game/scoring.ts` — Skill 11.
5. **Page**: `app/host/[code]/final/page.tsx` — fetches all data server-side, calls `tallyScores`, renders podium + leaderboard. Port `<Podium>` from prototype.
6. **Page**: `app/play/[code]/final/page.tsx` — same data, different presentation: "#3" giant in gold, full leaderboard with player's row highlighted.
7. **Action**: `endSession` — sets `ended_at`, clears the host's localStorage on the client side after success.

### Exit criteria

- [ ] Two-window test: player taps name → optimistic update is instant (<50ms perceived) → host's count goes up within 2s
- [ ] Player whose card is current sees the "yours" branch, NOT guess buttons
- [ ] Player can change their guess up until host taps Reveal
- [ ] Reveal flips on player screen within 2s of host tap
- [ ] Final leaderboard scores match a hand-calculated tally for a 3-player test session
- [ ] Player's own row in their final leaderboard is highlighted gold

### Self-review

- [ ] What if a player joins after the game starts? — they should see a "game already started, watch from the host's screen" message, not crash
- [ ] What if the host loses connection mid-game? — when they reconnect, they land back in the right place because `localToken` is intact and the session row tells them the state
- [ ] What if two host browser tabs are open? — both should work; whichever taps the action wins, the other's UI catches up via realtime

---

## Phase 5 — Polish + deploy (~1.5 hr)

**Goal:** It looks like a finished product, not a prototype.

### Polish checklist (work top-down)

#### Visual
- [ ] All buttons are at least 44px tall (Apple HIG minimum)
- [ ] Spacing follows the 8pt grid — no `pt-7`, `mt-13`, etc. Only `pt-8`, `mt-12`.
- [ ] All headings use Lora, all chrome uses Didact Gothic
- [ ] Gold accent appears once or twice per screen — never overused
- [ ] Borders use `border-border` token, never raw colours
- [ ] Reveal animation is a single, considered moment — not multiple competing animations

#### Copy
- [ ] No "Submit" buttons — they say what they do ("Lock in my answers", "Open the lobby", "Start game")
- [ ] All error messages are friendly and actionable
- [ ] Hints under inputs use lowercase "back" arrow style — calm, not shouty
- [ ] The prompt at reveal ("🎤 [Name] — share the story behind this if you like.") matches prototype exactly

#### Behaviour
- [ ] Pull-to-refresh disabled on iOS via `viewport` config
- [ ] Inputs don't trigger zoom on iOS (font-size ≥16px on inputs is the trick)
- [ ] No FOUT (flash of unstyled text) — Lora and Didact Gothic preloaded with `<link rel="preload">` in `<head>`
- [ ] Slow 3G test: every screen renders something within 1s, full data within 3s

#### Resilience
- [ ] Throwing the host laptop into airplane mode mid-game and bringing it back: state recovers, realtime reconnects automatically (Supabase handles this — verify it actually does)
- [ ] Player phones backgrounded for 5 minutes: when they return, screen reflects current state
- [ ] Two players submit guesses at the exact same instant: both succeed (upsert handles it)

#### Production
- [ ] Real OG image and favicon
- [ ] Page titles per route (`<title>Guess Who · Lobby ABCD</title>`)
- [ ] `robots.txt` blocking indexing — this is a private game, not for SEO
- [ ] Vercel deployment uses production Supabase project (not the dev one)

### Deploy

1. Final `git push` to main → Vercel auto-deploys
2. Smoke test on production URL with two real devices (your laptop + your phone)
3. Run a 3-card mini game against yourself to verify end-to-end
4. Send the URL to Joseph

### Done

When you can hand a non-technical friend the URL and the session code, walk away, and they can run the game without you helping — you're done.

---

## After every phase: the 5-minute review

Before opening the next phase's tasks, do this:

1. **Re-read AGENT.md §10 (Definition of Done).** Tick every box for what you just built. If a box is unticked, fix it now.
2. **Re-open `reference/prototype.jsx`.** Compare the screen you just built to the prototype's equivalent. Anything missing? Anything diverged that wasn't intentional?
3. **Open the deploy preview on your phone.** Test the new flow once, end-to-end, on real cellular if you can. Note three things you'd improve. Decide which one is worth doing now.
4. **Commit. Push. Breathe.**

---

## When something breaks

The order in which to suspect bugs:

1. **My realtime subscription** — wrong filter, missing cleanup, race with initial fetch. (Most common.)
2. **My validation** — zod rejected something I didn't expect.
3. **My RLS policy** — Supabase silently returning empty arrays when policy denies. Check Supabase logs.
4. **My optimistic state** — out of sync with server, didn't reset on entity change.
5. **My token check** — token in localStorage doesn't match the row.
6. **The framework** — almost never. Suspect this last.

---

## When to ask Joseph

Almost never. He hired you to ship.

The only legitimate triggers:
- A real-time edge case the prototype doesn't show (e.g. host disconnects between Reveal and Next — what should the UI say?)
- A copy decision where two prototype passages disagree
- A scope question that AGENT.md §11 doesn't explicitly answer

When you do ask, ask in this format:
- **Context:** one sentence
- **Decision:** one sentence
- **Options:** 2–3 with one-line tradeoffs
- **Your recommendation:** one sentence

He will pick fast. Don't ask open-ended questions — they'll cost him 20 minutes of typing and you 20 minutes of waiting.

---

## Done means done

You're done when:

- The deploy preview is the production URL
- A non-technical host could run a game from it without your help
- Joseph can reuse this for his fellowship every Friday for the next year without touching the code

Now go build.
