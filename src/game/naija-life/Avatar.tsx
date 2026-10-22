"use client";

import { useId, type ReactNode } from "react";
import { HAIR_COLORS, OUTFIT_COLORS, SKINS, type Look } from "./look";
import type { Gender } from "./types";

/** Mix a hex colour toward white (amt > 0) or black (amt < 0). */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const r = Math.round(((n >> 16) & 255) * (1 - k) + t * k);
  const g = Math.round(((n >> 8) & 255) * (1 - k) + t * k);
  const b = Math.round((n & 255) * (1 - k) + t * k);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hairTone(idx: number, age: number): string {
  const base = HAIR_COLORS[idx] ?? HAIR_COLORS[0];
  if (idx >= 3) return base;
  if (age >= 62) return "#d6d6d6";
  if (age >= 48) return "#74706c";
  return base;
}

const CAP = "M34 48 C30 18 90 18 86 48 C82 38 72 34 60 34 C48 34 38 38 34 48 Z";
/** Old hair and headwear shapes were drawn for a smaller head; this fits them to the bigger cartoon head. */
const HS = "translate(60 54) scale(1.1 1.04) translate(-60 -54)";

export function Avatar({
  look, gender, age, mood = 60, size = 64, dim, className, round,
}: {
  look: Look; gender: Gender; age: number; mood?: number; size?: number; dim?: boolean; className?: string; round?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const skin = SKINS[look.skin] ?? SKINS[3];
  const skinDark = shade(skin, -0.2);
  const hairC = hairTone(look.hairColor, age);
  const baby = age < 3;
  const hairId = baby ? "bald" : look.hair;
  const oc = OUTFIT_COLORS[look.outfitColor] ?? OUTFIT_COLORS[0];
  const wear = baby ? "none" : look.wear;
  const female = gender === "female";
  const hideHair = wear === "gele" || wear === "hijab" || wear === "turban";
  const scale = age < 3 ? 0.8 : age < 7 ? 0.86 : age < 12 ? 0.92 : age < 16 ? 0.97 : 1;
  const mouthY = mood > 65 ? 83 : mood < 35 ? 75 : 79;
  const glasses = baby ? "none" : look.glasses ?? "none";

  const backHair: ReactNode = (() => {
    if (hideHair) return null;
    switch (hairId) {
      case "afro": return <circle cx="60" cy="47" r="36" fill={hairC} />;
      case "puff": return <circle cx="60" cy="21" r="16" fill={hairC} />;
      case "puffs": return <g fill={hairC}><circle cx="31" cy="30" r="13" /><circle cx="89" cy="30" r="13" /></g>;
      case "bun": return <g fill={hairC}><circle cx="60" cy="19" r="12" /></g>;
      case "bob": return <path d="M26 52 C20 92 28 100 40 100 L80 100 C92 100 100 92 94 52 C94 14 26 14 26 52Z" fill={hairC} />;
      case "curls": return <g fill={hairC}>{[[36, 34], [46, 26], [58, 22], [70, 25], [82, 33], [30, 46], [90, 46]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8.5" />)}</g>;
      case "dreads": return <g fill={hairC}>{[28, 34, 40, 80, 86, 92].map((x) => <rect key={x} x={x} y="34" width="6" height="64" rx="3" />)}</g>;
      case "braids": return <g fill={hairC}>{[26, 32, 38, 82, 88, 94].map((x) => <g key={x}><rect x={x} y="34" width="5" height="86" rx="2.5" />{[56, 72, 88, 104].map((y) => <rect key={y} x={x} y={y} width="5" height="2" fill={shade(hairC, 0.3)} />)}</g>)}</g>;
      case "weave": return <g fill={hairC}><path d="M28 46 C16 84 24 108 42 116 L48 70Z" /><path d="M92 46 C104 84 96 108 78 116 L72 70Z" /><ellipse cx="60" cy="44" rx="31" ry="30" /></g>;
      default: return null;
    }
  })();

  const sideHair: ReactNode = (() => {
    if (hideHair) return null;
    const strand = (x: number, y2: number, w: number, beads?: boolean) => (
      <g key={x}><rect x={x} y="40" width={w} height={y2 - 40} rx={w / 2} fill={hairC} />{[58, 70, 82, 94, 106].filter((y) => y < y2 - 2).map((y, i) => (beads ? <circle key={y} cx={x + w / 2} cy={y} r="2.6" fill={["#f5c542", "#e8658a", "#1f9d55", "#5fb0e6", "#ffffff"][(i + x) % 5]} /> : <rect key={y} x={x} y={y} width={w} height="1.6" fill={shade(hairC, 0.3)} />))}</g>
    );
    switch (hairId) {
      case "braids": return <g>{[27, 33, 39, 80, 86, 92].map((x) => strand(x, 122, 5))}</g>;
      case "beads": return <g>{[26, 32, 38, 80, 86, 93].map((x) => strand(x, 116, 5, true))}</g>;
      case "dreads": return <g>{[28, 34, 40, 78, 84, 90].map((x) => strand(x, 100, 6))}</g>;
      case "weave": return <g fill={hairC}><path d="M28 46 C14 84 22 112 42 120 L50 70Z" /><path d="M92 46 C106 84 98 112 78 120 L70 70Z" /></g>;
      default: return null;
    }
  })();

  const frontHair: ReactNode = (() => {
    if (hideHair || hairId === "bald") return null;
    const bumps = (pts: [number, number][], r: number) => pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill={hairC} stroke={shade(hairC, 0.25)} strokeWidth="0.8" />);
    switch (hairId) {
      case "afro": case "puff": case "puffs": case "bun": case "bob": case "curls": return <path d="M33 50 C33 28 87 28 87 50 C82 38 72 35 60 35 C48 35 38 38 33 50Z" fill={hairC} />;
      case "beads": case "braids": case "dreads": case "weave": return <g><path d={CAP} fill={hairC} /><path d="M60 22 V37" stroke={shade(hairC, 0.3)} strokeWidth="1.3" /></g>;
      case "fade": return wear === "none" ? <g><path d={CAP} fill={hairC} /><rect x="40" y="10" width="40" height="26" rx="5" fill={hairC} /></g> : <path d={CAP} fill={hairC} />;
      case "cornrows": return <g><path d={CAP} fill={hairC} />{[44, 52, 60, 68, 76].map((x) => <path key={x} d={`M${x} 36 Q${x + (x - 60) * 0.1} 28 ${x + (x - 60) * 0.35} 19`} stroke={shade(hairC, 0.3)} strokeWidth="1.6" fill="none" strokeLinecap="round" />)}</g>;
      case "knots": return wear === "none" ? <g><path d={CAP} fill={hairC} />{bumps([[40, 26], [50, 19], [60, 17], [70, 19], [80, 26], [34, 38], [86, 38]], 6)}</g> : <path d={CAP} fill={hairC} />;
      case "twists": return wear === "none" ? <g><path d={CAP} fill={hairC} />{bumps([[42, 24], [52, 20], [62, 19], [72, 21], [80, 28], [47, 31], [58, 28], [69, 29]], 4.5)}</g> : <path d={CAP} fill={hairC} />;
      case "shuku": return wear === "none" ? <g><path d={CAP} fill={hairC} />{[-62, -42, -21, 0, 21, 42, 62].map((a) => { const r = (a * Math.PI) / 180; return <line key={a} x1={60 + Math.sin(r) * 24} y1={34 - Math.cos(r) * 10} x2={60 + Math.sin(r) * 42} y2={22 - Math.cos(r) * 22} stroke={hairC} strokeWidth="4.5" strokeLinecap="round" />; })}</g> : <path d={CAP} fill={hairC} />;
      default: return <path d={CAP} fill={hairC} />;
    }
  })();

  const beard: ReactNode = (() => {
    if (age < 14 || female) return null;
    const c = hairTone(look.hairColor, age);
    switch (look.beard) {
      case "stubble": return <path d="M35 56 C34 88 60 94 85 56 C80 78 66 80 60 80 C54 80 40 78 35 56Z" fill={c} opacity="0.32" />;
      case "full": return <path d="M35 56 C33 90 60 98 85 56 C80 78 66 82 60 82 C54 82 40 78 35 56Z" fill={c} />;
      case "mous": return <path d="M47 70 Q54 65 60 68 Q66 65 73 70 Q66 73 60 72 Q54 73 47 70Z" fill={c} />;
      case "goatee": return <g fill={c}><path d="M47 70 Q54 65 60 68 Q66 65 73 70 Q66 73 60 72 Q54 73 47 70Z" /><ellipse cx="60" cy="84" rx="7" ry="6" /></g>;
      default: return null;
    }
  })();

  const headwearBack: ReactNode = wear === "hijab" ? <path d="M22 62 C18 14 102 14 98 62 C101 98 82 108 60 108 C38 108 19 98 22 62Z" fill={oc} /> : null;
  const headwearFront: ReactNode = (() => {
    switch (wear) {
      case "fila": return <g><path d="M33 42 C34 14 84 10 90 34 C92 40 90 44 86 44 C68 36 50 36 33 44Z" fill={oc} /><path d="M82 30 C102 38 104 60 94 72 C90 56 86 44 82 30Z" fill={shade(oc, -0.2)} /><path d="M34 42 C50 36 70 36 88 42" stroke={shade(oc, -0.3)} strokeWidth="2" fill="none" /></g>;
      case "hausa": return <g><path d="M36 42 L40 12 Q60 6 80 12 L84 42 Q60 36 36 42Z" fill={oc} />{[46, 53, 60, 67, 74].map((x) => <line key={x} x1={x} y1="14" x2={x} y2="38" stroke={shade(oc, 0.35)} strokeWidth="1.3" />)}{[18, 26, 34].map((y) => <path key={y} d={`M38 ${y} H82`} stroke={shade(oc, -0.25)} strokeWidth="1.2" strokeDasharray="3 2" />)}<path d="M36 42 Q60 36 84 42 L84 47 Q60 41 36 47Z" fill={shade(oc, -0.25)} /></g>;
      case "gele": return <g><path d="M26 44 C22 14 54 6 70 8 C98 8 102 32 94 44 C80 36 44 36 26 44Z" fill={oc} /><ellipse cx="46" cy="14" rx="17" ry="10" transform="rotate(-22 46 14)" fill={shade(oc, 0.22)} /><ellipse cx="76" cy="11" rx="19" ry="11" transform="rotate(16 76 11)" fill={oc} stroke={shade(oc, -0.25)} strokeWidth="1" /><path d="M30 34 C48 28 70 28 90 34" stroke={shade(oc, -0.3)} strokeWidth="1.5" fill="none" /></g>;
      case "hijab": return <g><path d="M35 46 C40 30 80 30 85 46 C80 37 72 35 60 35 C48 35 40 37 35 46Z" fill={oc} /><path d="M30 78 C44 98 76 98 90 78 L102 112 C74 124 46 124 18 112Z" fill={shade(oc, -0.12)} /></g>;
      case "facecap": return <g><path d="M32 44 C32 14 88 14 88 44Z" fill={oc} /><path d="M68 42 L106 42 C106 49 92 50 68 47Z" fill={shade(oc, -0.2)} /><circle cx="60" cy="17" r="2.4" fill={shade(oc, -0.25)} /></g>;
      case "redcap": return <g><path d="M36 42 L38 14 Q60 7 82 14 L84 42 Q60 35 36 42Z" fill="#c62828" /><path d="M36 42 Q60 35 84 42 L84 47 Q60 40 36 47Z" fill="#8e1b1b" /><path d="M42 18 Q60 13 78 18" stroke="#e57373" strokeWidth="1.6" fill="none" /></g>;
      case "turban": return <g><path d="M27 46 C22 14 98 14 93 46 C80 35 40 35 27 46Z" fill="#eadcbc" /><path d="M32 40 C48 26 76 24 90 38 M30 34 C50 20 80 20 92 32" stroke="#cdb98c" strokeWidth="2" fill="none" /><ellipse cx="82" cy="22" rx="12" ry="8" transform="rotate(25 82 22)" fill="#f4e9cf" stroke="#cdb98c" strokeWidth="1" /></g>;
      case "band": return <g><path d="M30 44 C34 28 86 28 90 44" stroke={oc} strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M32 40 C44 32 76 32 88 40" stroke={shade(oc, 0.4)} strokeWidth="1.4" fill="none" /></g>;
      default: return null;
    }
  })();

  const body: ReactNode = (() => {
    const base = "M4 124 C4 102 26 94 48 92 L72 92 C94 94 116 102 116 124Z";
    const neck = <path d="M47 92 Q60 108 73 92" fill={skin} />;
    switch (look.outfit) {
      case "ankara": {
        const a = OUTFIT_COLORS[(look.outfitColor + 3) % OUTFIT_COLORS.length];
        return <g><defs><pattern id={`p${uid}`} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="2.4" fill={a} /><rect x="8" y="8" width="4.4" height="4.4" transform="rotate(45 10 10)" fill={shade(oc, 0.5)} /><path d="M0 12 Q4 8 8 12" stroke={shade(oc, -0.25)} strokeWidth="1" fill="none" /></pattern></defs><path d={base} fill={oc} /><path d={base} fill={`url(#p${uid})`} />{neck}{<path d="M46 92 Q60 108 74 92" stroke={shade(oc, -0.3)} strokeWidth="2.4" fill="none" />}</g>;
      }
      case "agbada": return <g><path d="M0 124 C0 98 24 91 46 90 L74 90 C96 91 120 98 120 124Z" fill={oc} /><path d="M48 92 L60 124 L72 92Z" fill={shade(oc, 0.38)} />{neck}<path d="M46 92 Q60 108 74 92" stroke="#f5c542" strokeWidth="2.6" fill="none" /><path d="M12 108 Q24 120 12 124 M108 108 Q96 120 108 124" stroke={shade(oc, -0.3)} strokeWidth="2" fill="none" /></g>;
      case "kaftan": return <g><path d={base} fill={oc} />{neck}<path d="M46 92 Q60 108 74 92" stroke={shade(oc, 0.3)} strokeWidth="3" fill="none" /><path d="M60 106 V124" stroke={shade(oc, -0.3)} strokeWidth="1.6" />{[112, 119].map((y) => <circle key={y} cx="60" cy={y} r="1.5" fill={shade(oc, 0.5)} />)}</g>;
      case "senator": return <g><path d={base} fill={oc} />{neck}<path d="M46 92 Q60 108 74 92" stroke="#f5c542" strokeWidth="3" fill="none" /><path d="M60 106 V124" stroke="#f5c542" strokeWidth="2.4" /><path d="M18 112 H34 M86 112 H102" stroke="#f5c542" strokeWidth="2" /></g>;
      case "suit": case "blazer": {
        const jacket = look.outfit === "blazer" ? shade(oc, -0.45) : "#1b2430";
        return <g><path d={base} fill={jacket} /><path d="M48 92 L60 114 L72 92Z" fill="#f4f4f4" />{neck}<path d="M46 92 L38 124 H52 L60 112Z M74 92 L82 124 H68 L60 112Z" fill={shade(jacket, 0.12)} />{look.outfit === "suit" && <path d="M58 100 H62 L63 120 L60 124 L57 120Z" fill={oc} />}</g>;
      }
      case "jersey": return <g><path d={base} fill="#0b8a3a" /><path d="M46 92 Q60 108 74 92 L74 97 Q60 113 46 97Z" fill="#ffffff" />{neck}<path d="M6 114 H114" stroke="#ffffff" strokeWidth="5" opacity="0.9" /></g>;
      case "uniform": return <g><path d={base} fill="#f4f4f4" /><path d="M46 92 L60 104 L74 92 L74 97 L60 109 L46 97Z" fill="#dcdcdc" />{neck}<path d="M58 104 H62 L63 122 L60 125 L57 122Z" fill="#1f9d55" /></g>;
      case "camo": return <g><path d={base} fill="#5b6b3a" /><circle cx="26" cy="108" r="7" fill="#3d4a26" /><circle cx="94" cy="112" r="8" fill="#7b8a52" /><circle cx="46" cy="116" r="6" fill="#3d4a26" /><circle cx="78" cy="106" r="6" fill="#8b7a4a" />{neck}<path d="M46 92 Q60 108 74 92" stroke="#3d4a26" strokeWidth="3" fill="none" /></g>;
      case "hoodie": return <g><path d="M30 88 C30 74 90 74 90 88 L96 98 L24 98Z" fill={shade(oc, -0.22)} /><path d={base} fill={oc} /><path d="M44 92 Q60 114 76 92 Q60 98 44 92Z" fill={shade(oc, -0.3)} />{neck}<path d="M44 92 Q60 112 76 92" stroke={shade(oc, -0.3)} strokeWidth="3" fill="none" /><path d="M54 104 V120 M66 104 V120" stroke="#f4f4f4" strokeWidth="1.8" strokeLinecap="round" /></g>;
      case "stripes": return <g><defs><pattern id={`s${uid}`} width="10" height="9" patternUnits="userSpaceOnUse"><rect width="10" height="4.5" fill="#f4f4f4" /></pattern></defs><path d={base} fill={oc} /><path d={base} fill={`url(#s${uid})`} />{neck}<path d="M46 92 Q60 108 74 92" stroke={shade(oc, -0.3)} strokeWidth="3" fill="none" /></g>;
      case "shirt": return <g><defs><pattern id={`k${uid}`} width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill={oc} /><rect width="12" height="5" fill={shade(oc, -0.3)} opacity="0.7" /><rect width="5" height="12" fill={shade(oc, -0.3)} opacity="0.7" /></pattern></defs><path d={base} fill={`url(#k${uid})`} />{neck}<path d="M46 92 L54 104 L60 96 L66 104 L74 92 L70 91 L60 100 L50 91Z" fill="#f4f4f4" /><path d="M60 100 V124" stroke={shade(oc, -0.4)} strokeWidth="1.4" /></g>;
      default: return <g><path d={base} fill={oc} />{neck}<path d="M46 92 Q60 108 74 92" stroke={shade(oc, -0.3)} strokeWidth="3" fill="none" /></g>;
    }
  })();

  const lipC = look.beard === "full" || look.beard === "goatee" ? "#d98c78" : female ? "#7a2433" : "#4a2018";
  const frame = "#2a1a12";
  const eyeTilt = female ? 1 : 0;
  const glassesEl: ReactNode = (() => {
    switch (glasses) {
      case "round": return <g fill="rgba(255,255,255,0.14)" stroke={frame} strokeWidth="2"><circle cx="46" cy="57" r="9.4" /><circle cx="74" cy="57" r="9.4" /><path d="M55.4 56 Q60 53 64.6 56" fill="none" /><path d="M36.6 56 L31 54 M83.4 56 L89 54" fill="none" /></g>;
      case "square": return <g fill="rgba(255,255,255,0.14)" stroke={frame} strokeWidth="2"><rect x="36" y="49" width="19" height="16" rx="3.5" /><rect x="65" y="49" width="19" height="16" rx="3.5" /><path d="M55 55 H65" fill="none" /><path d="M36 54 L31 53 M84 54 L89 53" fill="none" /></g>;
      case "sun": return <g><rect x="35" y="50" width="22" height="15" rx="5" fill="#101010" /><rect x="63" y="50" width="22" height="15" rx="5" fill="#101010" /><path d="M57 55 H63" stroke="#101010" strokeWidth="2.4" /><path d="M35 55 L30 53 M85 55 L90 53" stroke="#101010" strokeWidth="2" /><path d="M39 54 L45 54 M67 54 L73 54" stroke="#ffffff" strokeWidth="1.4" opacity="0.35" strokeLinecap="round" /></g>;
      default: return null;
    }
  })();
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy="57" rx="7" ry="6.6" fill="#fff" />
      <circle cx={cx} cy="57.4" r="4.6" fill="#3a1d10" />
      <circle cx={cx} cy="57.4" r="2.6" fill="#120805" />
      <circle cx={cx - 1.6} cy="55.4" r="1.7" fill="#fff" />
      <circle cx={cx + 1.8} cy="59.2" r="0.8" fill="#fff" />
      <path d={`M${cx - 7.2} 55.6 Q${cx} ${50.4 - eyeTilt} ${cx + 7.2} 55.6`} stroke="#1a0e08" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
  const browW = baby ? 2 : female ? 2.8 : 3.8;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Character portrait" style={dim ? { filter: "grayscale(1)", opacity: 0.55 } : undefined}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="0.5" cy="0.4" r="0.8"><stop offset="0" stopColor="#1f8048" /><stop offset="1" stopColor="#0f5a30" /></radialGradient>
        <clipPath id={`c${uid}`}><rect width="120" height="120" rx={round ? 60 : 20} /></clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width="120" height="120" fill={`url(#bg${uid})`} />
        <g transform={`translate(60 121) scale(${scale * 1.08}) translate(-60 -121)`}>
          {headwearBack}
          <g transform={HS}>{backHair}</g>
          <rect x="49" y="74" width="22" height="26" rx="6" fill={skinDark} />
          {body}
          <g transform={HS}>{sideHair}</g>
          <circle cx="31" cy="58" r="6.6" fill={skin} />
          <circle cx="89" cy="58" r="6.6" fill={skin} />
          <path d="M30 55 Q33 58 30 62 M90 55 Q87 58 90 62" stroke={skinDark} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.6" />
          {look.hoops && !baby && <g fill="none" stroke="#e9b730" strokeWidth="2.3"><circle cx="30" cy="67" r="4.6" /><circle cx="90" cy="67" r="4.6" /></g>}
          {wear === "gele" && !look.hoops && <g fill="#e9b730"><circle cx="30" cy="66" r="2.4" /><circle cx="90" cy="66" r="2.4" /></g>}
          <ellipse cx="60" cy="55" rx="29.5" ry="30.5" fill={skin} />
          <ellipse cx="60" cy="55" rx="29.5" ry="30.5" fill="none" stroke={skinDark} strokeWidth="0.8" opacity="0.4" />
          <g transform={HS}>{beard}</g>
          <ellipse cx="42" cy="68" rx="5" ry="3.2" fill="#d2584a" opacity="0.16" />
          <ellipse cx="78" cy="68" rx="5" ry="3.2" fill="#d2584a" opacity="0.16" />
          {eye(46)}
          {eye(74)}
          <path d={`M37 ${46 + eyeTilt} Q46 ${41} 55 ${45.4}`} stroke={hairC} strokeWidth={browW} fill="none" strokeLinecap="round" />
          <path d={`M65 45.4 Q74 41 83 ${46 + eyeTilt}`} stroke={hairC} strokeWidth={browW} fill="none" strokeLinecap="round" />
          <path d="M60 60 C58.4 65 57 67 59 68.2 Q60 68.8 61 68.2 C63 67 61.6 65 60 60Z" fill={skinDark} opacity="0.5" />
          <path d={`M51 73.5 Q60 ${mouthY} 69 73.5`} stroke={lipC} strokeWidth={female ? 2.6 : 2.1} fill="none" strokeLinecap="round" />
          {glassesEl}
          <g transform={HS}>{frontHair}</g>
          <g transform={HS}>{headwearFront}</g>
        </g>
      </g>
    </svg>
  );
}
