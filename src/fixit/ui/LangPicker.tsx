import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGS, type Lang } from "../engine/i18n";
import { useFix } from "./store";

/** One small "Language" control: tap it, pick a language from the list, done. */
export function LangPicker({ compact = false, up = false, align = "center" }: { compact?: boolean; up?: boolean; align?: "center" | "right" | "left" }) {
  const { lang, setLang } = useFix();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const cur = LANGS.find((l) => l.id === lang) ?? LANGS[0];
  return (
    <div className={`fx-langdd ${compact ? "fx-langdd-compact" : ""}`} ref={box}>
      <button className="fx-langdd-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} title="Language">
        <Globe size={16} aria-hidden /><span>{compact ? cur.short : cur.native}</span><ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <ul className="fx-langdd-menu" role="listbox" aria-label="Language" data-up={up ? "1" : undefined} data-align={align}>
          {LANGS.map((l) => (
            <li key={l.id} role="option" aria-selected={l.id === lang}>
              <button onClick={() => { setLang(l.id as Lang); setOpen(false); }}>
                <span>{l.native}</span>{l.id === lang && <Check size={16} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
