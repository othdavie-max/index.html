"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { FacebookIcon, XIcon } from "@/components/ui/social-icons";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const links = [
    { label: "X", icon: XIcon, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { label: "Facebook", icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${l.label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-navy-900 hover:bg-navy-900 hover:text-white"
        >
          <l.icon size={14} />
        </a>
      ))}
      <button
        onClick={copyLink}
        aria-label="Copy link"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-navy-900 hover:bg-navy-900 hover:text-white"
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
      </button>
    </div>
  );
}
