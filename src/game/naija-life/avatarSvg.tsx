"use client";

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Avatar } from "./Avatar";
import type { Look } from "./look";
import type { Gender } from "./types";

/** Renders a character's face to an SVG string, for drawing on share cards. */
export function avatarSvg(look: Look, gender: Gender, age: number, dim = false): string | undefined {
  try {
    const host = document.createElement("div");
    const root = createRoot(host);
    flushSync(() => root.render(<Avatar look={look} gender={gender} age={age} size={400} dim={dim} />));
    const svg = host.querySelector("svg")?.outerHTML;
    root.unmount();
    return svg;
  } catch {
    return undefined;
  }
}
