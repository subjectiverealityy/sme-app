/**
 * Apply an arbitrary SQL file via a Postgres connection string.
 * Usage (PowerShell):
 *   $env:DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
 *   node scripts/apply-sql.cjs supabase/migration_customers.sql
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/apply-sql.cjs <sql-file>");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DATABASE_URL env var.");
    process.exit(1);
  }
  const sqlPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("connected");
  await client.query(sql);
  console.log("SQL_APPLIED_OK:", file);
  await client.end();
})().catch((e) => {
  console.error("SQL_FAILED:", e.message);
  process.exit(1);
});
