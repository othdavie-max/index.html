import { LANGS, type Lang } from "../engine/i18n";
import { useFix } from "./store";

/** Five language buttons: English, Pidgin, Hausa, Yoruba, Igbo. */
export function LangPicker({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useFix();
  return (
    <div className="fx-chips fx-lang" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.id} className="fx-opt" aria-pressed={lang === l.id} onClick={() => setLang(l.id as Lang)}>
          <b>{compact ? l.short : l.native}</b>
        </button>
      ))}
    </div>
  );
}
