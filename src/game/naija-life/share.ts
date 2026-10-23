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
