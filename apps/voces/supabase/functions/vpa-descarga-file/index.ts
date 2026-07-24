// vpa-descarga-file — descarga final con marca de agua personal.
// GET ?t=token. Valida el token (1 hora), baja el archivo privado, estampa el correo
// del comprador en cada página del PDF (disuade el reenvío) y lo entrega como descarga.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

function safeName(title: string, ext: string) {
  const base = title.normalize("NFD").replace(/[^a-zA-Z0-9 ._-]/g, "").trim().replace(/\s+/g, "-") || "eBook";
  return base + "." + ext;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";
  if (!token) return new Response("Falta el enlace de descarga.", { status: 400 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: tk } = await sb.from("app_vpa_dl_tokens").select("*").eq("token", token).maybeSingle();
  if (!tk) return new Response("Enlace de descarga inválido.", { status: 404 });
  if (new Date(tk.expires_at) < new Date()) return new Response("El enlace de descarga venció. Solicítalo de nuevo en voces.flowme.one/biblioteca", { status: 410 });

  const { data: blob, error } = await sb.storage.from(tk.bucket).download(tk.path);
  if (error || !blob) return new Response("Archivo no disponible.", { status: 404 });
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const isPdf = tk.path.toLowerCase().endsWith(".pdf");
  let out = bytes;
  if (isPdf) {
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const stamp = `Licencia personal · ${tk.email} · Voces para el Alma`;
      for (const page of pdf.getPages()) {
        const { width } = page.getSize();
        const size = 8;
        const w = font.widthOfTextAtSize(stamp, size);
        page.drawText(stamp, { x: Math.max(16, (width - w) / 2), y: 14, size, font, color: rgb(0.5, 0.45, 0.4), opacity: 0.55 });
      }
      out = await pdf.save();
    } catch (_) { out = bytes; /* si falla el sellado, entrega el original */ }
  }

  const filename = safeName(tk.title || "eBook", isPdf ? "pdf" : (tk.path.split(".").pop() || "bin"));
  return new Response(out, {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
