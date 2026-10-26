"use client";
/** A one-image summary of your term, drawn on a canvas so it can be saved or shared (no server involved). */
import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "../../game/ui/kit";
import type { FixState, Snap } from "../engine/types";
import { SCENARIO_BY_ID } from "../engine/setup";
import { presidentName } from "../engine/util";
import { TRAITS, dominantTrait } from "../engine/society";

const SKINS = ["#f3d2b3", "#e0ac84", "#c68642", "#a1683a", "#7b4a2a", "#4a2f1d"];
const HAIRS = ["#0d0d0d", "#2b1b12", "#4a3426", "#6b6b6b"];
const ACCENTS = ["#00c875", "#2563eb", "#e11d48", "#f59e0b", "#7c3aed"];

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

export function drawShareCard(canvas: HTMLCanvasElement, s: FixState, title: string, a: Snap, b: Snap, verdict: string) {
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b1f36"); g.addColorStop(1, "#0d4a3a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#00c875"; ctx.fillRect(0, 0, W, 14);
  const font = (w: number, px: number) => `${w} ${px}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "#9db3c9"; ctx.font = font(800, 30); ctx.fillText("NIGERIA: CAN YOU FIX IT?", 70, 100);
  // portrait
  const p = s.meta.portrait, cx = 170, cy = 260;
  ctx.fillStyle = "#cfe0ee"; ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = ACCENTS[p.accent % 5]; ctx.beginPath(); ctx.ellipse(cx, cy + 120, 95, 70, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = SKINS[p.skin % 6]; ctx.beginPath(); ctx.ellipse(cx, cy - 10, 45, 52, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = HAIRS[p.hair % 4]; ctx.beginPath(); ctx.ellipse(cx, cy - 45, 47, 24, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff"; ctx.font = font(900, 54); ctx.fillText(presidentName(s).slice(0, 30), 300, 235);
  ctx.fillStyle = "#cfe0ee"; ctx.font = font(600, 28); ctx.fillText(`${SCENARIO_BY_ID[s.meta.scenario]?.name ?? ""} · ${s.meta.difficulty}`, 300, 285);
  const t = dominantTrait(s); if (t) { ctx.fillStyle = "#86efac"; ctx.fillText(`Known as ${TRAITS[t].title}`, 300, 325); }
  // title
  ctx.fillStyle = "#00c875"; ctx.font = font(900, 84); wrap(ctx, title, 70, 480, W - 140, 92);
  ctx.fillStyle = "#e2e8f0"; ctx.font = font(600, 32); let y = wrap(ctx, verdict, 70, 600, W - 140, 42);
  // stats
  y = Math.max(y + 20, 700);
  const rows: [string, string, string, boolean][] = [
    ["Naira per $1", `₦${a.fx.toLocaleString()}`, `₦${b.fx.toLocaleString()}`, b.fx < a.fx],
    ["Inflation", `${a.inflation}%`, `${b.inflation}%`, b.inflation < a.inflation],
    ["Unemployment", `${a.unemployment}%`, `${b.unemployment}%`, b.unemployment < a.unemployment],
    ["Electricity (MW)", a.power.toLocaleString(), b.power.toLocaleString(), b.power > a.power],
    ["Public happiness", `${Math.round(a.happiness)}`, `${Math.round(b.happiness)}`, b.happiness > a.happiness],
    ["Projects completed", "0", String(s.projects.filter((x) => x.status === "done").length), s.projects.some((x) => x.status === "done")],
  ];
  for (const [label, from, to, good] of rows) {
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(70, y - 46, W - 140, 72);
    ctx.fillStyle = "#cbd5e1"; ctx.font = font(600, 30); ctx.fillText(label, 95, y);
    ctx.fillStyle = "#94a3b8"; ctx.fillText(from, 560, y);
    ctx.fillStyle = good ? "#4ade80" : "#fb7185"; ctx.font = font(800, 32); ctx.fillText(`→ ${to} ${good ? "▲" : "▼"}`, 730, y);
    y += 86;
  }
  ctx.fillStyle = "#64748b"; ctx.font = font(500, 22); ctx.fillText("A fictional simulation. All numbers are simulated game values.", 70, H - 50);
}

export function ShareButton({ s, title, a, b, verdict }: { s: FixState; title: string; a: Snap; b: Snap; verdict: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const go = async () => {
    const c = document.createElement("canvas");
    drawShareCard(c, s, title, a, b, verdict);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/png"));
    if (!blob) { setMsg("Could not create the image."); return; }
    const file = new File([blob], "my-presidency.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    try {
      if (nav.share && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: "My presidency", text: `I was ${title} in Nigeria: Can You Fix It?` }); setMsg("Shared."); return; }
    } catch { /* user cancelled or sharing blocked */ }
    // inside a published claude.ai page, files are offered through the viewer's downloads capability
    const host = (window as unknown as { claude?: { use?: (n: string) => Promise<{ save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null> } }).claude;
    if (host?.use) {
      const dl = await host.use("downloads").catch(() => null);
      if (dl) {
        try { await dl.save({ filename: "my-presidency.png", data: blob }); setMsg("Image saved."); }
        catch (e) { const code = (e as { code?: string }).code; setMsg(code === "declined" ? "Save cancelled." : code === "rate_limited" ? "Please wait a moment and try again." : "Saving is not available here."); }
        return;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "my-presidency.png"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg("Image saved to your downloads.");
  };
  return <span className="g-row" style={{ gap: 8 }}><Button onClick={go}><Share2 size={16} /> Share my term</Button>{msg && <span className="g-tiny" style={{ color: "#cfe0ee" }}>{msg}</span>}</span>;
}
