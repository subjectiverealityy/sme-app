/**
 * Apply supabase/schema.sql via a Postgres connection string.
 * Usage (PowerShell):
 *   $env:DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"
 *   npm run db:apply
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DATABASE_URL env var.");
    process.exit(1);
  }
  const sqlPath = path.join(__dirname, "..", "supabase", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("connected");
  await client.query(sql);
  console.log("SCHEMA_APPLIED_OK");
  const r = await client.query(
    "select table_name from information_schema.tables where table_schema='public' and table_name in ('profiles','businesses','transactions','categories','scanned_records') order by 1"
  );
  console.log("TABLES:", JSON.stringify(r.rows));
  await client.end();
})().catch((e) => {
  console.error("SCHEMA_FAILED:", e.message);
  process.exit(1);
});
