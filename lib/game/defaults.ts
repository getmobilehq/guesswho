export const DEFAULT_QUESTIONS: [string, string, string] = [
  "What's the most embarrassing thing that happened to you growing up?",
  "Share a moment from this past year where you felt deeply grateful.",
  "Tell us something most people in this room don't know about you.",
];

// Avoids visually confusable letters (I, O, 1) so codes read clean from a TV.
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  }
  return out;
}
