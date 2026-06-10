#!/usr/bin/env node
/**
 * One-command dev login. Reads the Playwright test account credentials from
 * .env.local and opens the /dev/test-auth bootstrap route in your default
 * browser, which signs that account in and sets the session cookie — no
 * magic-link email round-trip.
 *
 * Run from project root, in a NEW terminal tab (not the one running the dev
 * server) so you see this output:
 *
 *   node scripts/dev-login.mjs                  # uses http://localhost:3000
 *   node scripts/dev-login.mjs 3100             # custom port
 *   node scripts/dev-login.mjs --print          # print URL instead of opening
 *
 * Requires: npm run dev already running, and ENABLE_DEV_ROUTES=true plus
 * ENABLE_DEV_AUTH=true in .env.local (the route 404s otherwise).
 *
 * The password is read locally and passed straight to the browser via the
 * URL — it is never written to stdout.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";

function readEnv(name) {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const line = content.split("\n").find((l) => new RegExp(`^\\s*${name}\\s*=`).test(l));
  if (!line) return "";
  let v = line.slice(line.indexOf("=") + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1).trim();
  return v;
}

console.log("--- dev login (Playwright test account) ---");

const args = process.argv.slice(2);
const printOnly = args.includes("--print");
const port = args.find((a) => /^\d+$/.test(a)) ?? "3000";

let email, password, devAuth;
try {
  email = readEnv("PLAYWRIGHT_TEST_EMAIL");
  password = readEnv("PLAYWRIGHT_TEST_PASSWORD");
  devAuth = readEnv("ENABLE_DEV_AUTH");
} catch (e) {
  console.error("Could not read .env.local:", e.message);
  process.exit(1);
}

if (!email || !password) {
  console.error("Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD in .env.local");
  process.exit(1);
}
if (devAuth !== "true") {
  console.error("ENABLE_DEV_AUTH is not 'true' in .env.local — /dev/test-auth will 404. Set it and restart the dev server.");
  process.exit(1);
}

const url =
  `http://localhost:${port}/dev/test-auth` +
  `?email=${encodeURIComponent(email)}` +
  `&password=${encodeURIComponent(password)}`;

console.log("Email:", email);
console.log("Port: ", port);

if (printOnly) {
  console.log("\nURL (contains password — do not paste into chat/logs):\n" + url);
  process.exit(0);
}

// macOS `open`; falls back to xdg-open on Linux.
const opener = process.platform === "darwin" ? "open" : "xdg-open";
const child = spawn(opener, [url], { stdio: "ignore", detached: true });
child.on("error", (err) => {
  console.error(`Could not launch browser via '${opener}':`, err.message);
  console.error("Re-run with --print to get the URL and open it manually.");
  process.exit(1);
});
child.unref();

console.log(
  "\nOpened /dev/test-auth in your browser. It should show 'ok' when signed in.\n" +
  "Then go to http://localhost:" + port + "/onboarding (or any protected route) — you'll no longer be bounced to sign-in."
);
