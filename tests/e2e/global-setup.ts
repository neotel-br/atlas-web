import { execSync } from "node:child_process";

export default async function globalSetup() {
  // Seed admin against the running stack's DB before e2e.
  // Assumes DATABASE_URL + ADMIN_* env vars are exported for the test run.
  if (process.env.E2E_SEED === "1") {
    execSync("npm run db:migrate && npm run db:seed", { stdio: "inherit" });
  }
}
