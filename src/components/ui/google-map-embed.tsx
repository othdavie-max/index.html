export function GoogleMapEmbed({ address, className = "" }: { address: string; className?: string }) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return (
    <iframe
      src={src}
      title={`Map showing ${address}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`aspect-video w-full rounded-2xl border border-ink-900/8 ${className}`}
    />
  );
}
