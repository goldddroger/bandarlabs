import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error("Gunakan: npm run auth:generate -- \"password-minimal-10-karakter\"");
  process.exit(1);
}

const iterations = 210_000;
const salt = randomBytes(16).toString("base64url");
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");

console.log(`ADMIN_PASSWORD_HASH=pbkdf2-sha256:${iterations}:${salt}:${hash}`);
console.log(`AUTH_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
