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

export function Avatar({
  look, gender, age, mood = 60, size = 64, dim, className,
}: {
  look: Look; gender: Gender; age: number; mood?: number; size?: number; dim?: boolean; className?: string;
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
  const hideHair = wear === "gele" || wear === "hijab";
  const scale = age < 3 ? 0.72 : age < 7 ? 0.8 : age < 12 ? 0.88 : age < 16 ? 0.95 : 1;
  const mouthY = mood > 65 ? 83 : mood < 35 ? 74 : 78;

  const backHair: ReactNode = (() => {
    if (hideHair) return null;
    switch (hairId) {
      case "afro": return <circle cx="60" cy="42" r="37" fill={hairC} />;
      case "puff": return <circle cx="60" cy="16" r="18" fill={hairC} />;
      case "dreads": return <g fill={hairC}>{[28, 34, 40, 80, 86, 92].map((x) => <rect key={x} x={x} y="34" width="6" height="64" rx="3" />)}</g>;
      case "braids": return <g fill={hairC}>{[26, 32, 38, 82, 88, 94].map((x) => <g key={x}><rect x={x} y="34" width="5" height="86" rx="2.5" />{[56, 72, 88, 104].map((y) => <rect key={y} x={x} y={y} width="5" height="2" fill={shade(hairC, 0.3)} />)}</g>)}</g>;
      case "weave": return <g fill={hairC}><path d="M28 46 C16 84 24 108 42 116 L48 70Z" /><path d="M92 46 C104 84 96 108 78 116 L72 70Z" /><ellipse cx="60" cy="44" rx="31" ry="30" /></g>;
      default: return null;
    }
  })();

  const frontHair: ReactNode = (() => {
    if (hideHair || hairId === "bald") return null;
    const bumps = (pts: [number, number][], r: number) => pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill={hairC} stroke={shade(hairC, 0.25)} strokeWidth="0.8" />);
    switch (hairId) {
      case "afro": return <path d="M36 46 C40 32 80 32 84 46 C80 38 72 36 60 36 C48 36 40 38 36 46Z" fill={hairC} />;
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

  const headwearBack: ReactNode = wear === "hijab" ? <path d="M24 62 C20 20 100 20 96 62 C98 96 80 104 60 104 C40 104 22 96 24 62Z" fill={oc} /> : null;
  const headwearFront: ReactNode = (() => {
    switch (wear) {
      case "fila": return <g><path d="M33 42 C34 14 84 10 90 34 C92 40 90 44 86 44 C68 36 50 36 33 44Z" fill={oc} /><path d="M82 30 C102 38 104 60 94 72 C90 56 86 44 82 30Z" fill={shade(oc, -0.2)} /><path d="M34 42 C50 36 70 36 88 42" stroke={shade(oc, -0.3)} strokeWidth="2" fill="none" /></g>;
      case "hausa": return <g><path d="M36 42 L40 12 Q60 6 80 12 L84 42 Q60 36 36 42Z" fill={oc} />{[46, 53, 60, 67, 74].map((x) => <line key={x} x1={x} y1="14" x2={x} y2="38" stroke={shade(oc, 0.35)} strokeWidth="1.3" />)}<path d="M36 42 Q60 36 84 42 L84 47 Q60 41 36 47Z" fill={shade(oc, -0.25)} /></g>;
      case "gele": return <g><path d="M26 44 C22 14 54 6 70 8 C98 8 102 32 94 44 C80 36 44 36 26 44Z" fill={oc} /><ellipse cx="46" cy="14" rx="17" ry="10" transform="rotate(-22 46 14)" fill={shade(oc, 0.22)} /><ellipse cx="76" cy="11" rx="19" ry="11" transform="rotate(16 76 11)" fill={oc} stroke={shade(oc, -0.25)} strokeWidth="1" /><path d="M30 34 C48 28 70 28 90 34" stroke={shade(oc, -0.3)} strokeWidth="1.5" fill="none" /></g>;
      case "hijab": return <g><path d="M35 46 C40 30 80 30 85 46 C80 37 72 35 60 35 C48 35 40 37 35 46Z" fill={oc} /><path d="M32 76 C44 94 76 94 88 76 L98 108 C72 120 48 120 22 108Z" fill={shade(oc, -0.12)} /></g>;
      case "facecap": return <g><path d="M32 44 C32 14 88 14 88 44Z" fill={oc} /><path d="M68 42 L106 42 C106 49 92 50 68 47Z" fill={shade(oc, -0.2)} /></g>;
      default: return null;
    }
  })();

  const body: ReactNode = (() => {
    const base = "M6 124 C6 100 28 92 48 90 L72 90 C92 92 114 100 114 124Z";
    switch (look.outfit) {
      case "ankara": {
        const a = OUTFIT_COLORS[(look.outfitColor + 3) % OUTFIT_COLORS.length];
        return <g><defs><pattern id={`p${uid}`} width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.2" fill={a} /><rect x="7" y="7" width="4" height="4" transform="rotate(45 9 9)" fill={shade(oc, 0.45)} /></pattern></defs><path d={base} fill={oc} /><path d={base} fill={`url(#p${uid})`} /><path d="M46 90 Q60 102 74 90" stroke={shade(oc, -0.3)} strokeWidth="3" fill="none" /></g>;
      }
      case "agbada": return <g><path d="M0 124 C0 98 24 90 46 88 L74 88 C96 90 120 98 120 124Z" fill={oc} /><path d="M48 90 L60 124 L72 90Z" fill={shade(oc, 0.38)} /><path d="M46 90 Q60 104 74 90" stroke="#f5c542" strokeWidth="2.6" fill="none" /><path d="M14 108 Q24 118 14 124 M106 108 Q96 118 106 124" stroke={shade(oc, -0.3)} strokeWidth="2" fill="none" /></g>;
      case "kaftan": return <g><path d={base} fill={oc} /><path d="M50 90 Q60 98 70 90 L70 95 Q60 103 50 95Z" fill={shade(oc, 0.22)} /><path d="M60 98 V124" stroke={shade(oc, -0.3)} strokeWidth="1.6" />{[106, 114].map((y) => <circle key={y} cx="60" cy={y} r="1.4" fill={shade(oc, 0.5)} />)}</g>;
      case "senator": return <g><path d={base} fill={oc} /><path d="M50 90 Q60 98 70 90 L70 95 Q60 103 50 95Z" fill="#f5c542" /><path d="M60 98 V124" stroke="#f5c542" strokeWidth="2.4" /><path d="M20 110 H34 M86 110 H100" stroke="#f5c542" strokeWidth="2" /></g>;
      case "suit": return <g><path d={base} fill="#1b2430" /><path d="M50 90 L60 112 L70 90Z" fill="#f2f2f2" /><path d="M58 98 H62 L63 118 L60 123 L57 118Z" fill={oc} /><path d="M50 90 L40 124 H52 L60 112Z M70 90 L80 124 H68 L60 112Z" fill="#26313f" /></g>;
      case "jersey": return <g><path d={base} fill="#0b8a3a" /><path d="M48 90 L60 104 L72 90 L72 94 L60 108 L48 94Z" fill="#ffffff" /><path d="M8 112 H112" stroke="#ffffff" strokeWidth="5" opacity="0.9" /></g>;
      case "uniform": return <g><path d={base} fill="#f4f4f4" /><path d="M48 90 L60 100 L72 90 L72 95 L60 105 L48 95Z" fill="#dcdcdc" /><path d="M58 100 H62 L63 120 L60 123 L57 120Z" fill="#1f9d55" /></g>;
      case "camo": return <g><path d={base} fill="#5b6b3a" /><circle cx="26" cy="108" r="7" fill="#3d4a26" /><circle cx="94" cy="112" r="8" fill="#7b8a52" /><circle cx="46" cy="116" r="6" fill="#3d4a26" /><circle cx="78" cy="106" r="6" fill="#8b7a4a" /><path d="M48 90 Q60 99 72 90" stroke="#3d4a26" strokeWidth="3" fill="none" /></g>;
      default: return <g><path d={base} fill={oc} /><path d="M47 90 Q60 102 73 90" stroke={shade(oc, -0.3)} strokeWidth="3" fill="none" /></g>;
    }
  })();

  const lipC = female ? "#8e2a3b" : "#3a1c16";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Character portrait" style={dim ? { filter: "grayscale(1)", opacity: 0.55 } : undefined}>
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1c5a39" /><stop offset="1" stopColor="#0a1c13" /></linearGradient>
        <clipPath id={`c${uid}`}><rect width="120" height="120" rx="22" /></clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width="120" height="120" fill={`url(#bg${uid})`} />
        <g transform={`translate(60 124) scale(${scale}) translate(-60 -124)`}>
          {headwearBack}
          {backHair}
          <rect x="50" y="72" width="20" height="26" fill={skinDark} />
          {body}
          <circle cx="34" cy="56" r="5.5" fill={skin} />
          <circle cx="86" cy="56" r="5.5" fill={skin} />
          <ellipse cx="60" cy="54" rx="26" ry="29" fill={skin} />
          <ellipse cx="60" cy="54" rx="26" ry="29" fill="none" stroke={skinDark} strokeWidth="0.8" opacity="0.5" />
          {beard}
          <ellipse cx="49" cy="53" rx="5.4" ry="3.5" fill="#fff" />
          <ellipse cx="71" cy="53" rx="5.4" ry="3.5" fill="#fff" />
          <circle cx="49.5" cy="53" r="2.7" fill="#231510" />
          <circle cx="70.5" cy="53" r="2.7" fill="#231510" />
          <circle cx="50.4" cy="52" r="0.9" fill="#fff" />
          <circle cx="71.4" cy="52" r="0.9" fill="#fff" />
          {female && <g stroke="#1a100c" strokeWidth="1.4" strokeLinecap="round"><path d="M43.4 51 L41.2 49.4" /><path d="M76.6 51 L78.8 49.4" /></g>}
          <path d="M42 46 Q49 42 56 45.5" stroke={hairC} strokeWidth={female ? 2 : 2.8} fill="none" strokeLinecap="round" />
          <path d="M64 45.5 Q71 42 78 46" stroke={hairC} strokeWidth={female ? 2 : 2.8} fill="none" strokeLinecap="round" />
          <path d="M60 55 C57 63 55 66 58 68 Q60 69 62 68 C65 66 63 63 60 55Z" fill={skinDark} opacity="0.55" />
          <path d={`M52 73 Q60 ${mouthY} 68 73`} stroke={lipC} strokeWidth={female ? 2.8 : 2.2} fill="none" strokeLinecap="round" />
          {frontHair}
          {headwearFront}
        </g>
      </g>
    </svg>
  );
}
