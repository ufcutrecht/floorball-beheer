// Filmpjes opruimen: wist de filmpjes van oefeningen met status "verwerkt" uit de opslagbak
// "filmpjes". De beschrijving blijft staan; in data.filmpjesGewist komt wat er gewist is.
// Aanroepen (door Claude, na de opdracht "verwijder de filmpjes van de verwerkte oefeningen"):
//   POST https://agkhomwkcbvbdczqzzey.supabase.co/functions/v1/filmpjes-opruimen
//   body {} voor alle verwerkte oefeningen, of {"id": "<oefening-id>"} voor één oefening.
// Werkt alleen op verwerkte oefeningen; filmpjes van concept of ingestuurd blijven altijd staan.
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "filmpjes";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ fout: "gebruik POST" }, 405);
  let onlyId: string | null = null;
  try {
    const b = await req.json();
    if (b && typeof b.id === "string") onlyId = b.id;
  } catch (_) { /* lege body: alle verwerkte oefeningen */ }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let q = sb.from("film_oefeningen").select("id,data").eq("status", "verwerkt");
  if (onlyId) q = q.eq("id", onlyId);
  const { data: rows, error } = await q;
  if (error) return json({ fout: error.message }, 500);

  const result = { oefeningen: 0, filmpjes: 0, bytes: 0, details: [] as unknown[] };
  for (const row of rows ?? []) {
    const d = (row.data ?? {}) as Record<string, unknown>;
    const videos = Array.isArray(d.videos) ? (d.videos as Record<string, unknown>[]) : [];
    const paths = new Set<string>(videos.map((v) => String(v.path ?? "")).filter(Boolean));
    // ook losse bestanden in de map van deze oefening (bijvoorbeeld een mislukte upload)
    const { data: listed } = await sb.storage.from(BUCKET).list(row.id, { limit: 1000 });
    for (const f of listed ?? []) if (f.name) paths.add(`${row.id}/${f.name}`);
    if (!paths.size) continue;

    const all = [...paths];
    for (let i = 0; i < all.length; i += 100) {
      const { error: e } = await sb.storage.from(BUCKET).remove(all.slice(i, i + 100));
      if (e) return json({ fout: e.message, bij: row.id, ...result }, 500);
    }
    const bytes = videos.reduce((s, v) => s + (Number(v.sizeBytes) || 0), 0);
    const gewist = videos.map((v) => ({ label: v.label, seconds: v.seconds, sizeBytes: v.sizeBytes }));
    const prev = Array.isArray(d.filmpjesGewist) ? d.filmpjesGewist as unknown[] : [];
    const next = { ...d, videos: [], filmpjesGewist: [...prev, ...gewist], gewistOp: new Date().toISOString() };
    delete (next as Record<string, unknown>).links;
    delete (next as Record<string, unknown>).linksTot;
    const { error: ue } = await sb.from("film_oefeningen").update({ data: next }).eq("id", row.id);
    if (ue) return json({ fout: ue.message, bij: row.id, ...result }, 500);

    result.oefeningen++;
    result.filmpjes += all.length;
    result.bytes += bytes;
    result.details.push({ id: row.id, naam: d.naam ?? "", filmpjes: all.length });
  }
  return json(result);
});
