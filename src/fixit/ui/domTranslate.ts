import { ui, type Lang } from "../engine/i18n";

/** Swaps known interface text (and title / aria-label) for Hausa, Yoruba or Igbo as the screen changes. Original text is remembered so switching back is exact. */
export function startTranslator(lang: Lang, root: HTMLElement = document.body): () => void {
  if (lang === "en" || lang === "pcm") return () => {};
  const orig = new WeakMap<Node, string>();
  const done = new WeakMap<Node, string>();
  const text = (n: Text) => {
    const cur = n.nodeValue ?? ""; if (!cur.trim()) return;
    if (done.get(n) === cur) return; // already ours
    const out = ui(lang, cur);
    orig.set(n, cur);
    if (out !== cur) { done.set(n, out); n.nodeValue = out; }
  };
  const attrs = (e: Element) => { for (const a of ["title", "aria-label", "placeholder"]) { const v = e.getAttribute(a); if (v) { const o = ui(lang, v); if (o !== v) e.setAttribute(a, o); } } };
  const walk = (n: Node) => {
    if (n.nodeType === 3) return text(n as Text);
    if (n.nodeType !== 1) return;
    const el = n as Element; if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "SVG" || el.tagName === "svg") return;
    attrs(el); el.childNodes.forEach(walk);
  };
  let queued = false; const pending = new Set<Node>();
  const flush = () => { queued = false; const items = [...pending]; pending.clear(); obs.disconnect(); items.forEach((n) => { if (n.isConnected) walk(n); }); watch(); };
  const obs = new MutationObserver((ms) => { for (const m of ms) { if (m.type === "characterData") pending.add(m.target); else m.addedNodes.forEach((a) => pending.add(a)); if (m.type === "attributes") pending.add(m.target); } if (!queued) { queued = true; requestAnimationFrame(flush); } });
  const watch = () => obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder"] });
  walk(root); watch();
  return () => {
    obs.disconnect();
    const undo = (n: Node) => { if (n.nodeType === 3) { const o = orig.get(n); if (o !== undefined && done.get(n) === n.nodeValue) n.nodeValue = o; } else n.childNodes.forEach(undo); };
    undo(root);
  };
}
