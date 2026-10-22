export interface ShareCardInput {
  kicker: string;
  title: string;
  stats: { label: string; value: string }[];
  lines?: string[];
  footer?: string;
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

/** Draws a 1080x1350 share card and returns a PNG blob. */
export async function drawShareCard(input: ShareCardInput): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#06150d");
  bg.addColorStop(0.55, "#0c3a22");
  bg.addColorStop(1, "#06150d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle pattern stripes in Nigerian green/white/green
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#1faa59";
  ctx.fillRect(0, 0, 40, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(40, 0, 40, H);
  ctx.fillStyle = "#1faa59";
  ctx.fillRect(80, 0, 40, H);
  ctx.globalAlpha = 1;

  const left = 170;
  const right = W - 90;
  ctx.textBaseline = "top";

  ctx.fillStyle = "#f5b82e";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText(input.kicker.toUpperCase(), left, 110);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 84px Georgia, serif";
  let y = 190;
  for (const l of wrap(ctx, input.title, right - left)) {
    ctx.fillText(l, left, y);
    y += 98;
  }

  y += 40;
  for (const s of input.stats) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(left, y, right - left, 118);
    ctx.fillStyle = "#9ad8b3";
    ctx.font = "600 28px system-ui, sans-serif";
    ctx.fillText(s.label, left + 28, y + 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 46px system-ui, sans-serif";
    ctx.fillText(s.value, left + 28, y + 54);
    y += 134;
  }

  if (input.lines?.length) {
    y += 10;
    ctx.fillStyle = "#e8f5ec";
    ctx.font = "500 34px system-ui, sans-serif";
    for (const line of input.lines) {
      for (const l of wrap(ctx, line, right - left)) {
        ctx.fillText(l, left, y);
        y += 46;
      }
      y += 8;
    }
  }

  ctx.fillStyle = "#f5b82e";
  ctx.font = "700 36px system-ui, sans-serif";
  ctx.fillText("🇳🇬 NAIJA LIFE", left, H - 140);
  ctx.fillStyle = "#9ad8b3";
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText(input.footer ?? "Who you know, what you know, and God.", left, H - 90);

  return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

/** Share the image via the native share sheet when possible, otherwise download it. */
export async function shareCard(input: ShareCardInput, text: string): Promise<"shared" | "downloaded"> {
  const blob = await drawShareCard(input);
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
