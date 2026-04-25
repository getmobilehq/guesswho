export const DEFAULT_QUESTIONS: [string, string, string] = [
  "A funny or embarrassing moment",
  "A surprising or little-known fact about you",
  "A favourite memory or short story",
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
