import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { team } from "@/data/team";

export function TeamPreview() {
  return (
    <section className="bg-offwhite py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Our Team" title="People who've done" emphasis="this before." />
          <Button href="/about" variant="secondary" size="sm">
            Meet the full team
          </Button>
        </div>

        <RevealGroup className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-4">
          {team.map((member) => (
            <RevealItem key={member.slug}>
              <div className="rounded-2xl border border-navy-900/8 bg-white p-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-100 font-display text-lg font-bold text-navy-900">
                  {member.photoPlaceholder}
                </div>
                <p className="mt-3 font-display text-sm font-bold text-navy-900">{member.name}</p>
                <p className="mt-0.5 text-xs text-muted">{member.role}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
