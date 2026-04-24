import { randomBytes } from "node:crypto";

// 32 bytes of randomness, url-safe base64. Used for host + player tokens.
// Tokens never travel through query strings, so we don't need them to be
// uniform-length, but trimming padding keeps them tidy in localStorage.
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
