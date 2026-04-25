import "server-only";
import PptxGenJS from "pptxgenjs";

const C = {
  bg: "0D0D2B",
  surface: "161642",
  gold: "F4C753",
  goldDeep: "C9A227",
  ivory: "FDFAF0",
  muted: "9D9BB8",
  border: "2A2A5E",
} as const;

const FONT_HEAD = "Lora";
const FONT_UI = "Didact Gothic";

const STEPS: { num: string; title: string; body: string }[] = [
  {
    num: "ONE",
    title: "Join",
    body: "Scan the QR code on the host's screen, or visit guesswho.online and enter the session code.",
  },
  {
    num: "TWO",
    title: "Answer privately",
    body: "Three questions. Answer at least one — your name stays hidden until your card is revealed.",
  },
  {
    num: "THREE",
    title: "Guess who",
    body: "Each answer is revealed one at a time. Tap who you think wrote it. Change your mind any time before the reveal.",
  },
  {
    num: "FOUR",
    title: "Reveal & share",
    body: "The author's name drops in gold. Right or wrong, they get the floor — share the story if you'd like.",
  },
  {
    num: "FIVE",
    title: "Win the room",
    body: "One point per correct guess. Most correct tops the leaderboard. Ties resolved by engagement.",
  },
];

// 16:9 wide layout is 13.333 × 7.5 inches.
export async function buildRulesDeck(opts: {
  code: string;
  questions: [string, string, string];
  appUrl: string;
}): Promise<Buffer> {
  const { code, questions, appUrl } = opts;
  const cleanUrl = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `Guess Who · Rules · ${code}`;
  pptx.author = "Guess Who";
  pptx.company = "Guess Who";

  // ─── Slide 1 ── Title
  const s1 = pptx.addSlide();
  s1.background = { color: C.bg };

  s1.addText("A Storytelling Party Game", {
    x: 0.5,
    y: 1.6,
    w: 12.33,
    h: 0.5,
    align: "center",
    color: C.gold,
    fontFace: FONT_UI,
    fontSize: 16,
    charSpacing: 14,
    bold: true,
  });

  s1.addText(
    [
      { text: "Guess", options: { color: C.ivory } },
      { text: "Who.", options: { color: C.gold } },
    ],
    {
      x: 0.5,
      y: 2.3,
      w: 12.33,
      h: 2.5,
      align: "center",
      fontFace: FONT_HEAD,
      fontSize: 140,
      bold: true,
    },
  );

  s1.addText(
    "Anonymous answers. Live guessing. The stories behind each one.",
    {
      x: 1,
      y: 5.1,
      w: 11.33,
      h: 0.6,
      align: "center",
      color: C.muted,
      fontFace: FONT_HEAD,
      fontSize: 22,
      italic: true,
    },
  );

  s1.addText(`· ${cleanUrl} · Code: ${code} ·`, {
    x: 0.5,
    y: 6.6,
    w: 12.33,
    h: 0.4,
    align: "center",
    color: C.muted,
    fontFace: FONT_UI,
    fontSize: 13,
    charSpacing: 6,
  });

  // ─── Slide 2 ── How this works
  const s2 = pptx.addSlide();
  s2.background = { color: C.bg };

  s2.addText("How this works", {
    x: 0.5,
    y: 0.45,
    w: 12.33,
    h: 1.0,
    align: "center",
    color: C.ivory,
    fontFace: FONT_HEAD,
    fontSize: 50,
    bold: true,
  });

  // 5 steps in a 2-column grid: 3 left, 2 right (last one centered visually
  // by leaving the right-bottom slot empty).
  const colWidth = 5.8;
  const rowHeight = 1.55;
  const leftX = 0.85;
  const rightX = 6.85;
  const startY = 1.95;

  STEPS.forEach((step, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? leftX : rightX;
    const y = startY + row * (rowHeight + 0.18);

    // Gold left rule
    s2.addShape("rect", {
      x: x - 0.05,
      y,
      w: 0.05,
      h: rowHeight,
      fill: { color: C.gold },
      line: { color: C.gold, width: 0 },
    });

    s2.addText(step.num, {
      x: x + 0.15,
      y,
      w: 1.4,
      h: 0.4,
      color: C.gold,
      fontFace: FONT_UI,
      fontSize: 12,
      bold: true,
      charSpacing: 12,
    });

    s2.addText(step.title, {
      x: x + 0.15,
      y: y + 0.4,
      w: colWidth - 0.2,
      h: 0.55,
      color: C.ivory,
      fontFace: FONT_HEAD,
      fontSize: 26,
      bold: true,
    });

    s2.addText(step.body, {
      x: x + 0.15,
      y: y + 0.95,
      w: colWidth - 0.2,
      h: 0.6,
      color: C.muted,
      fontFace: FONT_UI,
      fontSize: 14,
    });
  });

  // ─── Slide 3 ── Tonight's questions
  const s3 = pptx.addSlide();
  s3.background = { color: C.bg };

  s3.addText("Tonight's questions", {
    x: 0.5,
    y: 0.7,
    w: 12.33,
    h: 0.9,
    align: "center",
    color: C.ivory,
    fontFace: FONT_HEAD,
    fontSize: 50,
    bold: true,
  });

  s3.addText("Three questions. Answer at least one — anonymously.", {
    x: 0.5,
    y: 1.7,
    w: 12.33,
    h: 0.5,
    align: "center",
    color: C.muted,
    fontFace: FONT_UI,
    fontSize: 16,
  });

  // Card panel
  s3.addShape("roundRect", {
    x: 1.5,
    y: 2.6,
    w: 10.33,
    h: 4.0,
    fill: { color: C.surface },
    line: { color: C.gold, width: 1 },
    rectRadius: 0.1,
  });

  questions.forEach((q, i) => {
    const yPos = 2.95 + i * 1.15;
    s3.addText(`${i + 1}.`, {
      x: 1.85,
      y: yPos,
      w: 0.6,
      h: 0.7,
      color: C.gold,
      fontFace: FONT_HEAD,
      fontSize: 28,
      bold: true,
    });
    s3.addText(`"${q}"`, {
      x: 2.4,
      y: yPos,
      w: 9.0,
      h: 1.0,
      color: C.ivory,
      fontFace: FONT_HEAD,
      fontSize: 22,
      italic: true,
    });
  });

  // ─── Slide 4 ── Ready / Join CTA
  const s4 = pptx.addSlide();
  s4.background = { color: C.bg };

  s4.addText("Ready?", {
    x: 0.5,
    y: 1.6,
    w: 12.33,
    h: 1.4,
    align: "center",
    color: C.ivory,
    fontFace: FONT_HEAD,
    fontSize: 110,
    bold: true,
  });

  s4.addText("Pull out your phone.", {
    x: 0.5,
    y: 3.4,
    w: 12.33,
    h: 0.6,
    align: "center",
    color: C.muted,
    fontFace: FONT_HEAD,
    fontSize: 22,
    italic: true,
  });

  // Code badge
  s4.addShape("roundRect", {
    x: 4.5,
    y: 4.4,
    w: 4.33,
    h: 1.5,
    fill: { color: C.bg },
    line: { color: C.gold, width: 2, dashType: "dash" },
    rectRadius: 0.1,
  });

  s4.addText(code, {
    x: 4.5,
    y: 4.4,
    w: 4.33,
    h: 1.5,
    align: "center",
    valign: "middle",
    color: C.gold,
    fontFace: FONT_HEAD,
    fontSize: 56,
    bold: true,
    charSpacing: 30,
  });

  s4.addText(cleanUrl, {
    x: 0.5,
    y: 6.2,
    w: 12.33,
    h: 0.4,
    align: "center",
    color: C.muted,
    fontFace: FONT_UI,
    fontSize: 16,
    charSpacing: 4,
  });

  const result = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return result;
}
