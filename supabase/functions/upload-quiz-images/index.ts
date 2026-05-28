// One-shot uploader: receives [{path, b64}] and writes to fourpics-images bucket.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { files } = await req.json();
  const results: Record<string, string> = {};
  for (const f of files) {
    const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
    const { error } = await supa.storage
      .from("fourpics-images")
      .upload(f.path, bytes, { upsert: true, contentType: "image/jpeg" });
    results[f.path] = error ? `ERR: ${error.message}` : "OK";
  }
  return new Response(JSON.stringify(results), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
