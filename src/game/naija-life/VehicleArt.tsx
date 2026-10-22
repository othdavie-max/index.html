"use client";

import { useId, type ReactNode } from "react";

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const r = Math.round(((n >> 16) & 255) * (1 - k) + t * k);
  const g = Math.round(((n >> 8) & 255) * (1 - k) + t * k);
  const b = Math.round((n & 255) * (1 - k) + t * k);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const GLASS = "#cfe6f7";
const Wheel = ({ x, y = 76, r = 13 }: { x: number; y?: number; r?: number }) => (
  <g><circle cx={x} cy={y} r={r} fill="#1f2937" /><circle cx={x} cy={y} r={r * 0.55} fill="#cbd5e1" /><circle cx={x} cy={y} r={r * 0.2} fill="#475569" /></g>
);

/** Stylised side views for the dealership and garage. */
export function VehicleArt({ art, color, size = 96 }: { art: string; color: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const dark = shade(color, -0.28);
  const light = shade(color, 0.3);
  const body = `url(#b${id})`;
  const defs = (
    <defs>
      <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={light} /><stop offset="0.55" stopColor={color} /><stop offset="1" stopColor={dark} /></linearGradient>
      <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e0f2fe" /><stop offset="1" stopColor="#f8fafc" /></linearGradient>
    </defs>
  );
  let shape: ReactNode;
  switch (art) {
    case "sedan":
      shape = <g><path d="M14 74 L18 62 Q22 54 44 52 L70 36 Q96 28 126 34 L152 52 Q176 54 184 62 L188 74 Z" fill={body} /><path d="M72 40 Q96 34 122 38 L142 52 L66 52 Z" fill={GLASS} /><line x1="104" y1="38" x2="104" y2="52" stroke={dark} strokeWidth="2" /><rect x="176" y="62" width="9" height="5" rx="2" fill="#fef08a" /><Wheel x={52} /><Wheel x={150} /></g>;
      break;
    case "coupe":
      shape = <g><path d="M10 74 L14 64 Q22 56 50 54 L82 38 Q110 30 138 40 L160 54 Q184 56 190 66 L192 74 Z" fill={body} /><path d="M86 42 Q110 36 134 44 L148 54 L78 54 Z" fill={GLASS} /><rect x="180" y="64" width="9" height="5" rx="2" fill="#fef9c3" /><Wheel x={50} /><Wheel x={152} /></g>;
      break;
    case "suv":
      shape = <g><path d="M12 76 L14 56 Q18 48 40 46 L58 30 Q98 24 140 30 L158 46 Q180 48 186 58 L188 76 Z" fill={body} /><path d="M62 34 Q98 29 136 34 L150 46 L56 46 Z" fill={GLASS} /><line x1="98" y1="31" x2="98" y2="46" stroke={dark} strokeWidth="2" /><rect x="176" y="58" width="9" height="6" rx="2" fill="#fef08a" /><Wheel x={52} r={14} /><Wheel x={150} r={14} /></g>;
      break;
    case "gwagon":
      shape = <g><path d="M14 76 L14 40 Q14 34 22 34 L146 34 Q156 34 160 44 L186 52 Q190 54 190 60 L190 76 Z" fill={body} /><rect x="30" y="40" width="108" height="16" rx="3" fill={GLASS} /><line x1="84" y1="40" x2="84" y2="56" stroke={dark} strokeWidth="2.4" /><circle cx="186" cy="62" r="3.4" fill="#fef9c3" /><rect x="168" y="66" width="20" height="3" fill="#94a3b8" /><Wheel x={52} r={15} /><Wheel x={152} r={15} /></g>;
      break;
    case "pickup":
      shape = <g><path d="M12 76 L14 56 L100 56 L100 40 Q104 32 118 30 L146 30 Q158 34 166 46 L186 52 L188 76 Z" fill={body} /><path d="M108 36 L144 36 L156 48 L108 48 Z" fill={GLASS} /><rect x="14" y="52" width="82" height="6" fill={dark} /><Wheel x={48} r={14} /><Wheel x={152} r={14} /></g>;
      break;
    case "supercar":
      shape = <g><path d="M8 76 L14 66 Q40 56 78 52 L112 38 Q140 34 160 46 L190 62 L192 74 Q192 78 186 78 L14 78 Q8 78 8 76Z" fill={body} /><path d="M92 50 L114 41 Q132 39 146 48 L150 54 L88 56 Z" fill="#9fb8cc" /><path d="M14 66 L30 58" stroke={dark} strokeWidth="3" /><path d="M118 64 L170 64" stroke={dark} strokeWidth="2" /><rect x="8" y="48" width="26" height="4" fill={dark} /><rect x="14" y="52" width="3" height="10" fill={dark} /><Wheel x={48} y={78} r={14} /><Wheel x={152} y={78} r={14} /></g>;
      break;
    case "hypercar":
      shape = <g><path d="M8 76 L14 66 Q40 56 78 52 L112 38 Q140 32 164 46 L190 62 L192 74 Q192 78 186 78 L14 78 Q8 78 8 76Z" fill={body} /><path d="M92 50 L114 41 Q134 38 148 48 L152 54 L88 56 Z" fill="#8aa5bb" /><path d="M96 56 L160 56 L180 64 L100 64Z" fill="#0f172a" opacity="0.75" /><path d="M170 58 q8 3 8 9 q-6 -2 -8 -9z" fill="#e2e8f0" /><rect x="8" y="46" width="30" height="4" fill="#0f172a" /><Wheel x={48} y={78} r={14.5} /><Wheel x={152} y={78} r={14.5} /></g>;
      break;
    case "bus":
      shape = <g><rect x="10" y="30" width="170" height="46" rx="8" fill={body} /><g fill={GLASS}>{[22, 52, 82, 112, 142].map((x) => <rect key={x} x={x} y="36" width="24" height="18" rx="2" />)}</g><rect x="160" y="36" width="18" height="26" rx="2" fill={GLASS} /><rect x="10" y="58" width="170" height="5" fill={dark} /><Wheel x={44} r={12} /><Wheel x={146} r={12} /></g>;
      break;
    case "keke":
      shape = <g><path d="M50 74 L52 40 Q54 28 80 26 L122 26 Q140 28 142 44 L146 74 Z" fill={body} /><rect x="64" y="34" width="62" height="22" rx="3" fill={GLASS} /><path d="M142 60 L180 66 L180 74 L142 74 Z" fill={dark} /><rect x="168" y="62" width="8" height="5" rx="2" fill="#fef08a" /><Wheel x={74} r={11} /><Wheel x={124} r={11} /><Wheel x={172} y={76} r={9} /></g>;
      break;
    case "bike":
      shape = <g><Wheel x={52} r={15} /><Wheel x={150} r={15} /><path d="M52 76 L88 50 L130 50 L150 76" stroke={color} strokeWidth="6" fill="none" strokeLinejoin="round" /><rect x="86" y="40" width="40" height="10" rx="5" fill={dark} /><path d="M126 50 L140 36 L152 36" stroke="#475569" strokeWidth="4" fill="none" /></g>;
      break;
    case "heli":
      shape = <g><ellipse cx="86" cy="58" rx="46" ry="24" fill={body} /><path d="M110 50 Q138 50 176 46 L176 56 Q140 62 112 66Z" fill={body} /><path d="M170 36 L180 36 L180 60 L170 60Z" fill={dark} /><path d="M62 46 Q90 36 112 52 L110 66 L58 62 Z" fill={GLASS} /><line x1="30" y1="30" x2="146" y2="30" stroke="#334155" strokeWidth="3" strokeLinecap="round" /><line x1="86" y1="30" x2="86" y2="36" stroke="#334155" strokeWidth="3" /><path d="M54 84 L126 84 M66 84 L66 76 M114 84 L114 76" stroke="#334155" strokeWidth="3" strokeLinecap="round" /></g>;
      break;
    case "jet":
      shape = <g><path d="M10 56 Q14 44 50 42 L160 42 Q186 44 192 54 Q186 64 160 66 L50 66 Q14 66 10 56Z" fill={body} /><path d="M40 42 L18 18 L34 18 L66 42Z" fill={dark} /><path d="M90 54 L132 90 L112 90 L70 58Z" fill={shade(color, -0.12)} /><path d="M92 50 L130 14 L112 14 L72 46Z" fill={shade(color, -0.12)} /><g fill="#60a5fa">{[120, 134, 148, 162].map((x) => <rect key={x} x={x} y="48" width="8" height="6" rx="2" />)}</g><path d="M168 46 L186 52 L168 56Z" fill="#94a3b8" /><ellipse cx="62" cy="64" rx="12" ry="5" fill="#475569" /></g>;
      break;
    case "boat":
      shape = <g><path d="M6 62 L196 58 L174 82 L30 82 Z" fill={body} /><path d="M6 62 L196 58 L192 64 L10 68Z" fill={dark} /><path d="M70 58 L82 38 L130 38 L146 58Z" fill="#f8fafc" /><path d="M88 42 L128 42 L136 56 L80 56Z" fill={GLASS} /><path d="M2 88 Q20 82 40 88 T80 88 T120 88 T160 88 T198 88" stroke="#7dd3fc" strokeWidth="3" fill="none" /></g>;
      break;
    case "yacht":
      shape = <g><path d="M6 60 L196 56 L176 82 L28 82 Z" fill="#f8fafc" /><path d="M6 60 L196 56 L192 63 L10 67Z" fill="#1e3a8a" /><path d="M36 56 L46 36 L150 34 L166 56Z" fill="#f1f5f9" /><path d="M64 36 L74 18 L132 18 L142 36Z" fill="#e2e8f0" /><g fill="#60a5fa">{[54, 72, 90, 108, 126, 144].map((x) => <rect key={x} x={x} y="42" width="10" height="8" rx="2" />)}</g><g fill="#60a5fa">{[84, 100, 116].map((x) => <rect key={x} x={x} y="22" width="10" height="8" rx="2" />)}</g><path d="M2 88 Q20 82 40 88 T80 88 T120 88 T160 88 T198 88" stroke="#7dd3fc" strokeWidth="3" fill="none" /></g>;
      break;
    default:
      shape = <g><rect x="20" y="40" width="160" height="34" rx="10" fill={body} /><Wheel x={56} /><Wheel x={146} /></g>;
  }
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 200 100" role="img" aria-label={art} className="shrink-0">
      {defs}
      <rect width="200" height="100" rx="14" fill={`url(#sky${id})`} />
      <ellipse cx="100" cy="90" rx="86" ry="5" fill="#0f172a" opacity="0.12" />
      {shape}
    </svg>
  );
}
