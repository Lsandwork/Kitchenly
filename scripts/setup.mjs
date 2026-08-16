import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
mkdirSync(path.join(root, "data", "uploads"), { recursive: true });

if (!existsSync(envPath)) {
  const secret = randomBytes(32).toString("hex");
  const example = path.join(root, ".env.example");
  let contents = existsSync(example)
    ? readFileSync(example, "utf8")
    : `DATABASE_URL="file:./dev.db"\nAUTH_SECRET=\nAPP_URL=http://localhost:3000\n`;
  contents = contents.replace("AUTH_SECRET=", `AUTH_SECRET=${secret}`);
  writeFileSync(envPath, contents);
  console.log("Wrote .env with a fresh AUTH_SECRET.");
} else {
  console.log(".env already exists.");
}
