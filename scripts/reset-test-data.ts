import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log("Resetting FCM Companion test data...\n");

  const { data, error } = await supabase.rpc("reset_test_data");

  if (error) {
    console.error("Reset failed:", error.message);
    process.exit(1);
  }

  console.log("Reset complete:");
  console.log(`   Submissions cleared: ${data.cleared.submissions}`);
  console.log(`   Notes cleared:       ${data.cleared.notes}`);
  console.log(`   OSCE responses:      ${data.cleared.osce_responses}`);
  console.log(`\n   Preserved: ${data.preserved.join(", ")}`);
  console.log(`   Timestamp: ${data.timestamp}`);
}

main();
