import { T } from "./util";

export type CardFormat = "post" | "story";
export const CARD_SIZE: Record<CardFormat, [number, number]> = { post: [1080, 1350], story: [1080, 1920] };

export interface ShareCardInput {
  kicker: string;
  title: string;
  /** A short label under the title, such as the life verdict. */
  subtitle?: string;
  stats: { label: string; value: string }[];
  lines?: string[];
  footer?: string;
  /** The character's face as an SVG string. */
  avatarSvg?: string;
  /** A big emoji shown beside the kicker. */
  emoji?: string;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = w;
    } else line = test;
  }
  if (line) out.push(line);
  return out;
}

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

/** Shrinks the font until the text fits in `maxLines` lines. Returns the lines and the size used. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min: number, maxLines: number, weight: string, family: string): { lines: string[]; size: number } {
  let size = start;
  for (; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines) return { lines, size };
  }
  ctx.font = `${weight} ${min}px ${family}`;
  const lines = wrap(ctx, text, maxW).slice(0, maxLines);
  if (lines.length === maxLines) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[ .,;:!?]+$/, "")}…`;
  return { lines, size: min };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadSvg(svg: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const withNs = svg.includes("xmlns=") ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withNs)}`;
  });
}

/** Draws a share card sized for social posts (4:5) or stories (9:16) and returns a PNG blob. */
export async function drawShareCard(input: ShareCardInput, format: CardFormat = "post"): Promise<Blob> {
  const [W, H] = CARD_SIZE[format];
  const story = format === "story";
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error(T("Canvas not supported", "Canvas no dey supported"));
  const img = input.avatarSvg ? await loadSvg(input.avatarSvg) : null;

  // Background: deep green with a soft glow and a quiet dot pattern
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#04120b");
  bg.addColorStop(0.5, "#0b3b23");
  bg.addColorStop(1, "#04120b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.3, 40, W / 2, H * 0.3, W * 0.8);
  glow.addColorStop(0, "rgba(245,184,46,0.22)");
  glow.addColorStop(1, "rgba(245,184,46,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  for (let yy = 30; yy < H; yy += 60) for (let xx = (yy / 60) % 2 ? 30 : 60; xx < W; xx += 60) { ctx.beginPath(); ctx.arc(xx, yy, 3.5, 0, Math.PI * 2); ctx.fill(); }

  // Flag band
  ctx.fillStyle = "#1faa59"; ctx.fillRect(0, 0, W / 3, 16);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(W / 3, 0, W / 3, 16);
  ctx.fillStyle = "#1faa59"; ctx.fillRect((W * 2) / 3, 0, W / 3, 16);

  const pad = 84;
  const inner = W - pad * 2;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  // Brand pill and kicker
  let y = story ? 150 : 74;
  ctx.fillStyle = "rgba(245,184,46,0.16)";
  roundRect(ctx, W / 2 - 250, y, 500, 70, 35);
  ctx.fill();
  ctx.fillStyle = "#f5b82e";
  ctx.font = `800 34px ${SANS}`;
  ctx.fillText(`🇳🇬  NAIJA LIFE${input.emoji ? "  " + input.emoji : ""}`, W / 2, y + 17);
  y += 98;
  ctx.fillStyle = "#9ad8b3";
  ctx.font = `700 28px ${SANS}`;
  ctx.fillText(input.kicker.toUpperCase(), W / 2, y);
  y += 56;

  // Avatar with a gold ring
  const av = story ? 400 : 240;
  if (img) {
    const cx = W / 2;
    const cy = y + av / 2;
    ctx.fillStyle = "#f5b82e";
    ctx.beginPath(); ctx.arc(cx, cy, av / 2 + 12, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, av / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, cx - av / 2, cy - av / 2, av, av);
    ctx.restore();
    y += av + (story ? 52 : 40);
  }

  // Title
  ctx.fillStyle = "#ffffff";
  const title = fit(ctx, input.title, inner, story ? 104 : 92, 52, 2, "800", SERIF);
  ctx.font = `800 ${title.size}px ${SERIF}`;
  for (const l of title.lines) { ctx.fillText(l, W / 2, y); y += title.size * 1.12; }
  if (input.subtitle) {
    y += 8;
    const sub = fit(ctx, input.subtitle, inner - 60, 46, 28, 2, "800", SANS);
    const w = Math.min(inner, Math.max(...sub.lines.map((l) => ctx.measureText(l).width)) + 70);
    const h = sub.lines.length * sub.size * 1.2 + 26;
    ctx.fillStyle = "#f5b82e";
    roundRect(ctx, W / 2 - w / 2, y, w, h, h / 2 > 40 ? 40 : h / 2);
    ctx.fill();
    ctx.fillStyle = "#0b2a14";
    ctx.font = `800 ${sub.size}px ${SANS}`;
    let ty = y + 13;
    for (const l of sub.lines) { ctx.fillText(l, W / 2, ty); ty += sub.size * 1.2; }
    y += h;
  }
  y += 40;

  // Stat cards in a row
  const stats = input.stats.slice(0, 3);
  if (stats.length) {
    const gap = 22;
    const cw = (inner - gap * (stats.length - 1)) / stats.length;
    const ch = story ? 190 : 150;
    stats.forEach((s, i) => {
      const x = pad + i * (cw + gap);
      ctx.fillStyle = "rgba(255,255,255,0.09)";
      roundRect(ctx, x, y, cw, ch, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(245,184,46,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#9ad8b3";
      ctx.font = `700 24px ${SANS}`;
      ctx.fillText(s.label.toUpperCase(), x + cw / 2, y + 22);
      const v = fit(ctx, s.value, cw - 30, 44, 24, 2, "800", SANS);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${v.size}px ${SANS}`;
      const blockH = v.lines.length * v.size * 1.15;
      let vy = y + 62 + (ch - 62 - blockH) / 2 - 6;
      for (const l of v.lines) { ctx.fillText(l, x + cw / 2, vy); vy += v.size * 1.15; }
    });
    y += ch + 36;
  }

  // Funny lines as quote panels, shrunk to fit the space left above the footer
  const footerTop = H - (story ? 260 : 190);
  const lines = (input.lines ?? []).filter(Boolean);
  if (lines.length) {
    const room = footerTop - y - 10;
    let size = story ? 40 : 36;
    let blocks: string[][] = [];
    let total = 0;
    for (; size >= 24; size -= 2) {
      ctx.font = `600 ${size}px ${SANS}`;
      blocks = lines.map((l) => wrap(ctx, l, inner - 90));
      total = blocks.reduce((sum, b) => sum + b.length * size * 1.32 + 44 + 16, 0);
      if (total <= room) break;
    }
    ctx.textAlign = "left";
    for (const b of blocks) {
      const h = b.length * size * 1.32 + 44;
      if (y + h > footerTop) break;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, pad, y, inner, h, 24);
      ctx.fill();
      ctx.fillStyle = "#f5b82e";
      roundRect(ctx, pad, y + 14, 10, h - 28, 5);
      ctx.fill();
      ctx.fillStyle = "#f0faf3";
      ctx.font = `600 ${size}px ${SANS}`;
      let ty = y + 22;
      for (const l of b) { ctx.fillText(l, pad + 40, ty); ty += size * 1.32; }
      y += h + 16;
    }
    ctx.textAlign = "center";
  }

  // Footer call to action
  const fy = H - (story ? 230 : 160);
  ctx.fillStyle = "#f5b82e";
  roundRect(ctx, W / 2 - 330, fy, 660, 84, 42);
  ctx.fill();
  ctx.fillStyle = "#0b2a14";
  ctx.font = `800 36px ${SANS}`;
  ctx.fillText(T("Live your own Naija life", "Live your own Naija life"), W / 2, fy + 22);
  ctx.fillStyle = "#9ad8b3";
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText(input.footer ?? "#NaijaLife", W / 2, fy + 104);

  return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error(T("Could not create the image", "Image no gree create")))), "image/png"));
}

export interface FuneralCardInput {
  name: string;
  age: number;
  tag: string;
  emoji: string;
  avatarSvg?: string;
  /** What they did, short lines for the top right. */
  did: string[];
  stats: { label: string; value: string }[];
  lines: string[];
  epitaph: string;
  labels: { rip: string; did: string; age: string; cta: string };
}

/** A white funeral card: the portrait on a tombstone, what they did at the top right. */
export async function drawFuneralCard(input: FuneralCardInput, format: CardFormat = "post"): Promise<Blob> {
  const [W, H] = CARD_SIZE[format];
  const story = format === "story";
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error(T("Canvas not supported", "Canvas no dey supported"));
  const img = input.avatarSvg ? await loadSvg(input.avatarSvg) : null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1faa59"; ctx.fillRect(0, 0, W / 3, 14);
  ctx.fillStyle = "#e9ecef"; ctx.fillRect(W / 3, 0, W / 3, 14);
  ctx.fillStyle = "#1faa59"; ctx.fillRect((W * 2) / 3, 0, W / 3, 14);
  ctx.textBaseline = "top";
  const pad = 64;

  // Header
  ctx.textAlign = "left";
  ctx.fillStyle = "#0b2a6b";
  ctx.font = `800 30px ${SANS}`;
  ctx.fillText("🇳🇬  NAIJA LIFE", pad, 44);

  // Tombstone (left)
  const tw = story ? 470 : 430;
  const th = story ? 700 : 590;
  const tx = pad;
  const ty = story ? 130 : 100;
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath(); ctx.ellipse(tx + tw / 2, ty + th + 6, tw / 2 + 24, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#bfc5cc";
  ctx.beginPath(); ctx.moveTo(tx - 8, ty + th); ctx.lineTo(tx - 8, ty + tw / 2); ctx.arc(tx + tw / 2, ty + tw / 2, tw / 2 + 8, Math.PI, 0); ctx.lineTo(tx + tw + 8, ty + th); ctx.closePath(); ctx.fill();
  const stone = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
  stone.addColorStop(0, "#e7eaee"); stone.addColorStop(1, "#cfd4da");
  ctx.fillStyle = stone;
  ctx.beginPath(); ctx.moveTo(tx, ty + th); ctx.lineTo(tx, ty + tw / 2); ctx.arc(tx + tw / 2, ty + tw / 2, tw / 2, Math.PI, 0); ctx.lineTo(tx + tw, ty + th); ctx.closePath(); ctx.fill();
  ctx.textAlign = "center";
  const cx = tx + tw / 2;
  let y = ty + 56;
  ctx.fillStyle = "#6b7480";
  ctx.font = `800 34px ${SERIF}`;
  ctx.fillText(input.labels.rip, cx, y);
  y += 56;
  const av = story ? 270 : 220;
  if (img) {
    const cy = y + av / 2;
    ctx.fillStyle = "#9aa3ad"; ctx.beginPath(); ctx.arc(cx, cy, av / 2 + 8, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, av / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, cx - av / 2, cy - av / 2, av, av); ctx.restore();
    y += av + 28;
  }
  const nm = fit(ctx, input.name, tw - 60, 46, 26, 2, "800", SERIF);
  ctx.fillStyle = "#2d3640";
  ctx.font = `800 ${nm.size}px ${SERIF}`;
  for (const l of nm.lines) { ctx.fillText(l, cx, y); y += nm.size * 1.12; }
  ctx.fillStyle = "#6b7480";
  ctx.font = `600 28px ${SANS}`;
  ctx.fillText(`${input.labels.age} ${input.age}  ·  ${input.emoji}`, cx, y + 6);
  y += 52;
  const epRoom = ty + th - 34 - y;
  if (epRoom > 40) {
    let es = 26;
    let el: string[] = [];
    for (; es >= 18; es -= 2) { ctx.font = `italic 600 ${es}px ${SERIF}`; el = wrap(ctx, input.epitaph, tw - 70); if (el.length * es * 1.25 <= epRoom) break; }
    ctx.fillStyle = "#56606b";
    ctx.font = `italic 600 ${es}px ${SERIF}`;
    for (const l of el) { if (y + es * 1.25 > ty + th - 30) break; ctx.fillText(l, cx, y); y += es * 1.25; }
  }
  // grass and flowers
  ctx.fillStyle = "#6fbf73";
  ctx.beginPath(); ctx.ellipse(cx, ty + th + 2, tw / 2 + 40, 34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.font = `40px ${SANS}`;
  ctx.fillText("🌼", tx - 10, ty + th - 22);
  ctx.fillText("🕯️", tx + tw - 20, ty + th - 22);

  // What they did (top right)
  const bx = tx + tw + 56;
  const bw = W - pad - bx;
  const by = ty + 4;
  const bh = th - 8;
  ctx.fillStyle = "#f6f4ec";
  roundRect(ctx, bx, by, bw, bh, 28);
  ctx.fill();
  ctx.strokeStyle = "#e0b43a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "#b8860b";
  ctx.font = `800 26px ${SANS}`;
  ctx.fillText(input.labels.did.toUpperCase(), bx + 28, by + 24);
  let ly = by + 74;
  const room = bh - 74 - 24;
  let size = 30;
  let blocks: string[][] = [];
  for (; size >= 20; size -= 2) {
    ctx.font = `600 ${size}px ${SANS}`;
    blocks = input.did.map((d) => wrap(ctx, d, bw - 76));
    if (blocks.reduce((sum, b) => sum + b.length * size * 1.3 + 14, 0) <= room) break;
  }
  ctx.fillStyle = "#2d3640";
  ctx.font = `600 ${size}px ${SANS}`;
  for (const b of blocks) {
    if (ly + b.length * size * 1.3 > by + bh - 16) break;
    ctx.fillStyle = "#e0b43a"; ctx.fillText("•", bx + 28, ly);
    ctx.fillStyle = "#2d3640";
    for (const l of b) { ctx.fillText(l, bx + 56, ly); ly += size * 1.3; }
    ly += 14;
  }

  // Verdict
  y = ty + th + 70;
  ctx.textAlign = "center";
  const vt = fit(ctx, input.tag, W - pad * 2 - 80, 50, 30, 1, "800", SANS);
  const vw = Math.min(W - pad * 2, ctx.measureText(vt.lines[0]).width + 90);
  ctx.fillStyle = "#f5b82e";
  roundRect(ctx, W / 2 - vw / 2, y, vw, vt.size * 1.2 + 28, 40);
  ctx.fill();
  ctx.fillStyle = "#0b2a14";
  ctx.font = `800 ${vt.size}px ${SANS}`;
  ctx.fillText(`${input.emoji} ${vt.lines[0]}`, W / 2, y + 14);
  y += vt.size * 1.2 + 28 + 28;

  // Stats
  const stats = input.stats.slice(0, 3);
  const gap = 20;
  const cw = (W - pad * 2 - gap * (stats.length - 1)) / stats.length;
  const chh = 130;
  stats.forEach((st, i) => {
    const x = pad + i * (cw + gap);
    ctx.fillStyle = "#f1f4f8";
    roundRect(ctx, x, y, cw, chh, 24);
    ctx.fill();
    ctx.fillStyle = "#6b7480";
    ctx.font = `700 22px ${SANS}`;
    ctx.fillText(st.label.toUpperCase(), x + cw / 2, y + 18);
    const v = fit(ctx, st.value, cw - 24, 40, 22, 1, "800", SANS);
    ctx.fillStyle = "#0b2a6b";
    ctx.font = `800 ${v.size}px ${SANS}`;
    ctx.fillText(v.lines[0], x + cw / 2, y + 62);
  });
  y += chh + 28;

  // Funny lines
  const footerTop = H - (story ? 250 : 190);
  const quotes = input.lines.filter(Boolean);
  const roomQ = footerTop - y - 8;
  let qs = story ? 36 : 32;
  let qb: string[][] = [];
  for (; qs >= 22; qs -= 2) {
    ctx.font = `600 ${qs}px ${SANS}`;
    qb = quotes.map((q) => wrap(ctx, q, W - pad * 2 - 80));
    if (qb.reduce((sum, b) => sum + b.length * qs * 1.3 + 36 + 14, 0) <= roomQ) break;
  }
  ctx.textAlign = "left";
  for (const b of qb) {
    const h = b.length * qs * 1.3 + 36;
    if (y + h > footerTop) break;
    ctx.fillStyle = "#f6f4ec";
    roundRect(ctx, pad, y, W - pad * 2, h, 22);
    ctx.fill();
    ctx.fillStyle = "#e0b43a";
    roundRect(ctx, pad, y + 12, 9, h - 24, 4);
    ctx.fill();
    ctx.fillStyle = "#2d3640";
    ctx.font = `600 ${qs}px ${SANS}`;
    let qy = y + 18;
    for (const l of b) { ctx.fillText(l, pad + 36, qy); qy += qs * 1.3; }
    y += h + 14;
  }

  // Footer
  ctx.textAlign = "center";
  const fy = H - (story ? 220 : 150);
  ctx.fillStyle = "#1faa59";
  roundRect(ctx, W / 2 - 330, fy, 660, 78, 39);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 34px ${SANS}`;
  ctx.fillText(input.labels.cta, W / 2, fy + 20);
  ctx.fillStyle = "#6b7480";
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText("#NaijaLife", W / 2, fy + 96);
  return await new Promise<Blob>((resolve, reject) => c.toBlob((bl) => (bl ? resolve(bl) : reject(new Error(T("Could not create the image", "Image no gree create")))), "image/png"));
}

/** Share or download any finished card blob. */
export async function shareBlob(blob: Blob, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], "naija-life.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text }); return "shared"; } catch { /* cancelled */ }
  }
  const url = URL.createObjectURL(blob);
  window.dispatchEvent(new CustomEvent("naija-share-image", { detail: { url, text } }));
  return "downloaded";
}

/** Share the image via the native share sheet when possible, otherwise download it. */
export async function shareCard(input: ShareCardInput, text: string, format: CardFormat = "post"): Promise<"shared" | "downloaded"> {
  const blob = await drawShareCard(input, format);
  const file = new File([blob], "naija-life.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      /* user cancelled: fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  // Show the card on screen so it can be saved or screenshotted even where downloads are blocked.
  window.dispatchEvent(new CustomEvent("naija-share-image", { detail: { url, text } }));
  return "downloaded";
}
