import { ensureAdminUser, ADMIN_EMAIL } from "../src/lib/auth";

async function main() {
  const id = await ensureAdminUser({
    password: process.env.ADMIN_PASSWORD || undefined,
    resetPassword: true,
  });
  console.log("admin synced", Boolean(id), ADMIN_EMAIL);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
