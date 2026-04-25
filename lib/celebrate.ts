"use client";

import confetti from "canvas-confetti";

const BRAND_COLORS = ["#F4C753", "#FDFAF0", "#7DD181", "#1F1F55", "#C9A227"];

// Two simultaneous side-cannon bursts, then a rolling cascade. Tuned so the
// gold dominates and the cascade settles within ~1.5s.
function fireConfetti() {
  const fromLeft: confetti.Options = {
    particleCount: 90,
    angle: 60,
    spread: 70,
    startVelocity: 55,
    origin: { x: 0, y: 0.7 },
    colors: BRAND_COLORS,
    scalar: 1.05,
  };
  const fromRight: confetti.Options = { ...fromLeft, angle: 120, origin: { x: 1, y: 0.7 } };

  confetti(fromLeft);
  confetti(fromRight);

  // Cascade — three lighter bursts from the top to feel like falling
  // gold leaf rather than a single explosion.
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 100,
      startVelocity: 35,
      origin: { x: 0.5, y: 0.2 },
      colors: BRAND_COLORS,
      scalar: 0.9,
      gravity: 0.9,
    });
  }, 250);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 110,
      startVelocity: 30,
      origin: { x: 0.3, y: 0.15 },
      colors: BRAND_COLORS,
      gravity: 1,
    });
    confetti({
      particleCount: 50,
      spread: 110,
      startVelocity: 30,
      origin: { x: 0.7, y: 0.15 },
      colors: BRAND_COLORS,
      gravity: 1,
    });
  }, 600);
}

// Synthesized applause via Web Audio API. Each clap is a short white-noise
// burst shaped by an exponential decay envelope and a high-pass filter to
// give it that hand-clap snap. ~30 claps over ~1.6s, slightly randomized so
// it doesn't sound like a metronome — closer to a real room reacting.
function playApplause() {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;

  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return;
  }

  // If the audio context is suspended (e.g. autoplay policy), try to resume.
  // Without a recent user gesture the resume() may reject — we swallow the
  // error and just skip the audio in that case.
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }

  // One impact clap up front to mark the moment, then sustained applause.
  scheduleClap(ctx, 0, 0.6);

  const claps = 32;
  const totalDuration = 1.6;
  for (let i = 0; i < claps; i++) {
    const base = 0.05 + (i / claps) * totalDuration;
    const jitter = (Math.random() - 0.5) * 0.04;
    const offset = base + jitter;
    const gain = 0.18 + Math.random() * 0.18;
    scheduleClap(ctx, offset, gain);
  }

  // Tail off — close the context once the longest clap could plausibly end.
  setTimeout(() => {
    ctx.close().catch(() => {});
  }, (totalDuration + 1) * 1000);
}

function scheduleClap(ctx: AudioContext, offset: number, gainValue: number) {
  const sampleRate = ctx.sampleRate;
  const noiseDurationSec = 0.06;
  const bufferSize = Math.floor(noiseDurationSec * sampleRate);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  const decayConstant = bufferSize * 0.18;
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decayConstant);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 1000;
  highpass.Q.value = 0.7;

  const gainNode = ctx.createGain();
  gainNode.gain.value = gainValue;

  source.connect(highpass).connect(gainNode).connect(ctx.destination);
  source.start(ctx.currentTime + offset);
  source.stop(ctx.currentTime + offset + noiseDurationSec);
}

let alreadyCelebrated = false;

// Idempotent within a page-load — guards against React strict-mode double
// effects firing two simultaneous celebrations.
export function celebrate() {
  if (alreadyCelebrated) return;
  alreadyCelebrated = true;
  fireConfetti();
  playApplause();
}
