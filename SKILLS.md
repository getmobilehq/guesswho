# SKILLS.md
> **Patterns. Copy-adapt, don't reinvent.** Each skill below has a name, a "use when" trigger, and a concrete code snippet. If a screen needs a pattern not listed here, design it once, write it down, and add it to this file before re-using.

---

## Skill 1 — Supabase client setup

**Use when:** Setting up the project. Done once.

### Browser client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Server client (`lib/supabase/server.ts`)

```typescript
import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service role bypasses RLS. ONLY import this from Server Actions / Server Components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

The `'server-only'` import throws at build time if anything client-side imports this file. Don't remove it.

---

## Skill 2 — Server Action shape

**Use when:** Any mutation. Every mutation. No direct client → DB writes.

```typescript
'use server';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const Input = z.object({
  code: z.string().min(3).max(12).regex(/^[A-Z0-9]+$/),
  hostToken: z.string().min(20),
  // ...
});

export async function someAction(raw: unknown) {
  // 1. Validate
  const parsed = Input.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' } as const;
  }
  const input = parsed.data;

  // 2. Authorise (verify token matches the row's host_token / player_token)
  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('host_token, status')
    .eq('code', input.code)
    .single();

  if (!session) return { ok: false, error: 'Session not found' } as const;
  if (session.host_token !== input.hostToken) {
    return { ok: false, error: 'Not authorised' } as const;
  }

  // 3. Guard against invalid state transitions
  if (session.status !== 'lobby') {
    return { ok: false, error: 'Game already started' } as const;
  }

  // 4. Mutate
  const { error } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'live' })
    .eq('code', input.code);

  if (error) {
    console.error('startGame failed', error);
    return { ok: false, error: 'Could not start game' } as const;
  }

  // 5. Return discriminated union — never throw
  return { ok: true } as const;
}
```

**Rules:**
- Always `'use server'` at top
- Always validate with zod (see Skill 5)
- Always return `{ ok: true, ... } | { ok: false, error: string }` — never throw to client
- Never `revalidatePath` for game data — realtime handles UI updates
- `console.error` for real failures only (Vercel logs them)

---

## Skill 3 — Realtime subscription hook

**Use when:** A client screen needs to react to row changes.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useSession(code: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function run() {
      // 1. Fetch initial state
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single();

      if (cancelled) return;
      setSession(data);
      setLoading(false);

      // 2. Subscribe to changes for this row only
      channel = supabase
        .channel(`session:${code}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `code=eq.${code}`,
          },
          (payload) => setSession(payload.new as Session)
        )
        .subscribe();
    }

    run();

    // 3. ALWAYS clean up
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  return { session, loading };
}
```

**Rules:**
- One channel per concern, named `session:CODE`, `players:CODE`, `guesses:CODE-CARDID`
- Always filter by session code in the subscription — never broad subscriptions
- Always `removeChannel` in cleanup. A leaked channel = ghost listener = bugs in next round
- Use `cancelled` flag to ignore late responses if component unmounts mid-fetch
- Initial fetch + subscribe-after pattern (in that order) — prevents missing updates between fetch and subscribe

---

## Skill 4 — Optimistic guess submission

**Use when:** The player taps a name button. Latency matters here more than anywhere else.

```typescript
'use client';

function GuessButtons({ cardId, players, myGuess: serverGuess }: Props) {
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const myGuess = optimistic ?? serverGuess;

  async function vote(guessedId: string) {
    setOptimistic(guessedId); // instant feedback
    const result = await submitGuess({ cardId, guessedPlayerId: guessedId, /* ... */ });
    if (!result.ok) {
      setOptimistic(null); // roll back
      toast.error(result.error);
    }
    // On success, leave optimistic — realtime will catch up and the values will match
  }

  // Reset optimistic state when the card changes (parent re-keys this component)
  // ... or: useEffect(() => setOptimistic(null), [cardId]);

  return (
    <div className="flex flex-col gap-2">
      {players.map(p => (
        <button
          key={p.id}
          onClick={() => vote(p.id)}
          className={cn(
            'guess-button',
            myGuess === p.id && 'guess-button--selected'
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
```

**Rules:**
- Only optimistic-update for guesses. Everything else (submit answers, start game, reveal, next) is rare enough that a 200ms wait with a loading state is fine.
- Always reconcile if the server rejects.
- Reset optimistic state when the underlying entity changes (new card → clear my optimistic guess).

---

## Skill 5 — Validation with zod

**Use when:** Any user input. Server Actions, form submissions, URL params.

```typescript
import { z } from 'zod';

export const SessionCode = z.string()
  .min(3).max(12)
  .regex(/^[A-Z0-9]+$/, 'Letters and numbers only')
  .transform(s => s.toUpperCase());

export const PlayerName = z.string()
  .trim()
  .min(1, 'Name is required')
  .max(30, 'Name too long');

export const Answer = z.string()
  .trim()
  .min(1, 'Answer cannot be empty')
  .max(500, 'Answer too long');

export const Questions = z.array(z.string().trim().min(1).max(300)).length(3);

// Compose into action inputs
export const CreateSessionInput = z.object({
  code: SessionCode,
  hostName: z.string().trim().max(30).default('Host'),
  questions: Questions,
});
```

**Rules:**
- Define primitive schemas once in `lib/game/validation.ts`. Compose them into action inputs.
- Use `.transform()` for normalisation (e.g. uppercase the session code) — happens automatically on parse.
- Return validation errors as friendly messages. Never expose zod's raw error JSON to users.
- Validate on the client too if it improves UX (instant inline feedback) but the server is the source of truth.

---

## Skill 6 — Brand component primitives

**Use when:** Any UI element. Build these once in `components/ui/`, then use everywhere.

### Button

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variants = {
  primary: 'bg-gold text-bg border-gold uppercase tracking-[0.1em] font-bold hover:bg-gold-deep',
  secondary: 'bg-elevated text-ivory border-border hover:bg-elevated/80',
  ghost: 'bg-transparent text-muted border-transparent hover:text-ivory',
  danger: 'bg-transparent text-red border-red hover:bg-red/10',
};
const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function Button({ variant='secondary', size='md', full, className, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded font-ui border-[1.5px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    />
  );
}
```

### Input

```tsx
export function Input({ multiline, className, ...rest }: InputProps) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      className={cn(
        'w-full px-4 py-3 bg-surface border-[1.5px] border-border rounded text-ivory',
        'focus:border-gold focus:outline-none transition-colors',
        multiline ? 'font-head text-lg leading-relaxed resize-y min-h-[100px]' : 'font-ui text-base',
        className,
      )}
      {...rest}
    />
  );
}
```

**Rules:**
- Brand variants live in the component, not at call sites.
- Never style with inline `style={{...}}` except for dynamic values (e.g. progress bar width).
- Compose with `cn()` (clsx + tailwind-merge). Install both.

---

## Skill 7 — Page wrapper + Logo + Loading

**Use when:** Every screen.

```tsx
// components/brand/Page.tsx
export function Page({
  children,
  width = 'narrow', // narrow | wide | full
}: PageProps) {
  const max = { narrow: 'max-w-[480px]', wide: 'max-w-[880px]', full: 'max-w-[1100px]' }[width];
  return (
    <div className={cn('mx-auto px-5 py-8 pb-16 min-h-screen', max)}>
      {children}
    </div>
  );
}

// components/brand/Logo.tsx
export function Logo({ small }: { small?: boolean }) {
  return (
    <div className={cn('font-head font-bold tracking-tight text-ivory', small ? 'text-lg' : 'text-2xl')}>
      <span className="text-gold">·</span> Guess Who <span className="text-gold">·</span>
    </div>
  );
}

// components/brand/Loading.tsx
export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-32 text-muted">
      <div className="w-10 h-10 border-2 border-border border-t-gold rounded-full animate-spin mb-6" />
      {label}
    </div>
  );
}
```

---

## Skill 8 — Three-state UI (loading / empty / error)

**Use when:** Any data-driven screen. Always render all three. Never just `if (data)`.

```tsx
function PlayerList({ code }: { code: string }) {
  const { players, loading, error } = usePlayers(code);

  if (loading) return <Loading label="Loading players..." />;
  if (error) return <ErrorPanel error={error} retry={() => location.reload()} />;
  if (players.length === 0) {
    return (
      <div className="p-6 text-center text-muted border border-dashed border-border rounded">
        Waiting for players to join...
      </div>
    );
  }

  return <div className="flex flex-wrap gap-2">{players.map(p => <PlayerChip key={p.id} player={p} />)}</div>;
}
```

The empty state in particular is where rookies skip — don't. The lobby empty state is the host's first impression while waiting; make it warm, not blank.

---

## Skill 9 — QR code with deep link

**Use when:** The lobby screen. Players scan to join.

```tsx
import { QRCodeSVG } from 'qrcode.react';

function JoinQR({ code }: { code: string }) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/play/${code}`;
  return (
    <div className="bg-ivory p-4 rounded inline-block">
      <QRCodeSVG value={url} size={200} level="M" />
    </div>
  );
}
```

**Rules:**
- Always render QR on a light background (most scanners struggle with dark bg) — even though our brand is dark.
- Show the URL underneath the QR in small ivory text — a fallback for people whose scanner doesn't deep-link.
- Show the session code prominently *separately* from the QR — for people typing it into a different device.

---

## Skill 10 — Deck building (pure function)

**Use when:** Host taps Start. Implementation lives in `lib/game/deck.ts`. Tested in isolation.

```typescript
type Player = { id: string; name: string };
type Answer = { player_id: string; q_index: number; text: string };

export function buildDeck(players: Player[], answers: Answer[]) {
  const cards = answers
    .filter(a => a.text.trim().length > 0)
    .map(a => ({
      player_id: a.player_id,
      q_index: a.q_index,
    }));

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Soft constraint: try not to put two consecutive cards from the same player
  // (one swap pass — good enough, doesn't always succeed but improves the average)
  for (let i = 1; i < cards.length; i++) {
    if (cards[i].player_id === cards[i - 1].player_id) {
      for (let j = i + 1; j < cards.length; j++) {
        if (cards[j].player_id !== cards[i - 1].player_id &&
            (j + 1 >= cards.length || cards[j + 1].player_id !== cards[i].player_id)) {
          [cards[i], cards[j]] = [cards[j], cards[i]];
          break;
        }
      }
    }
  }

  return cards.map((c, i) => ({ ...c, position: i }));
}
```

**Rules:**
- Pure function. No DB calls. Caller persists the result.
- Test it: 10 players × 3 answers should produce 30 cards with no consecutive same-player pairs in >80% of runs.

---

## Skill 11 — Scoring (pure function)

**Use when:** Final screen. Implementation in `lib/game/scoring.ts`.

```typescript
export function tallyScores(
  players: Player[],
  cards: Card[],
  guesses: Guess[],
) {
  const tally: Record<string, { player: Player; correct: number; attempts: number }> = {};
  for (const p of players) tally[p.id] = { player: p, correct: 0, attempts: 0 };

  const cardOwner = new Map(cards.map(c => [c.id, c.player_id]));

  for (const g of guesses) {
    const owner = cardOwner.get(g.card_id);
    if (!owner) continue;
    const t = tally[g.guesser_id];
    if (!t) continue;
    t.attempts++;
    if (g.guessed_player_id === owner) t.correct++;
  }

  return Object.values(tally).sort((a, b) =>
    b.correct - a.correct || b.attempts - a.attempts
  );
}
```

---

## Skill 12 — Local token storage

**Use when:** After `createSession` or `joinSession`. Stores the token that authorises the user as host or that specific player.

```typescript
// lib/hooks/useLocalToken.ts
'use client';

const KEY = (kind: 'host' | 'player', code: string) => `gw:${kind}:${code}`;

export const localToken = {
  get(kind: 'host' | 'player', code: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEY(kind, code));
  },
  set(kind: 'host' | 'player', code: string, token: string) {
    localStorage.setItem(KEY(kind, code), token);
  },
  clear(kind: 'host' | 'player', code: string) {
    localStorage.removeItem(KEY(kind, code));
  },
};
```

Layouts (`/host/[code]/layout.tsx`, `/play/[code]/layout.tsx`) read this on mount and redirect to setup/join if absent.

---

## Skill 13 — Tailwind config for the brand

**Use when:** Project setup. Done once.

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D2B',
        surface: '#161642',
        elevated: '#1F1F55',
        gold: { DEFAULT: '#F4C753', deep: '#C9A227' },
        ivory: '#FDFAF0',
        muted: '#9D9BB8',
        border: '#2A2A5E',
        green: '#7DD181',
        red: '#E07A8B',
      },
      fontFamily: {
        head: ['Lora', 'Georgia', 'serif'],
        ui: ['"Didact Gothic"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px' },
    },
  },
} satisfies Config;
```

Then in `globals.css`:

```css
@import "tailwindcss";

@layer base {
  body {
    @apply bg-bg text-ivory font-ui;
    background-image:
      radial-gradient(ellipse at top, rgba(31, 31, 85, 0.33) 0%, transparent 50%),
      radial-gradient(ellipse at bottom right, rgba(201, 162, 39, 0.13) 0%, transparent 60%);
    background-attachment: fixed;
  }
  h1, h2, h3 { @apply font-head; }
}
```

---

## Skill 14 — Error panel + toast

**Use when:** A Server Action returns `{ ok: false, error }`.

Use [`sonner`](https://sonner.emilkowal.ski/) for toast — install it, mount `<Toaster />` once in root layout with `theme="dark"`. Then:

```typescript
import { toast } from 'sonner';

const r = await someAction(input);
if (!r.ok) {
  toast.error(r.error, { duration: 4000 });
  return;
}
```

For full-screen errors (failed initial load), render an `<ErrorPanel>` with a retry button. Never a blank screen.

---

## Skill 15 — Mobile-first viewport

**Use when:** Always.

In `app/layout.tsx`:

```tsx
export const viewport: Viewport = {
  themeColor: '#0D0D2B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // Prevent zoom on input focus on iOS
  userScalable: false,
};
```

Test every screen at 360 × 800 viewport in DevTools before declaring done. Buttons must be 44px tall minimum (Apple HIG). Tap targets never closer than 8px.
