import type { Icon3DName } from "@/components/ui/icon-3d";

// Editable copy for the About page (src/app/about/page.tsx). Keep this the
// single source of truth for that page's text so it can be updated in one
// place. See the TODO-marked fields below — each is hidden on the live page
// until filled in.

export const aboutHero = {
  eyebrow: "About Baseline",
  title: "Every great journey abroad begins with a",
  emphasis: "solid baseline",
  description:
    "We're a study-abroad consultancy in Abuja that helps Nigerian students and their families turn “I want to study abroad” into a clear, realistic, well-prepared plan. We give honest advice at every step, not just a sales pitch.",
};

export const ourStory = {
  eyebrow: "Our Story",
  heading: "Built for families who deserve the",
  emphasis: "truth",
  paragraphs: [
    "Every year, thousands of Nigerian families save, sacrifice, and hope for a child's education abroad. Too often, that hope is met with confusing advice, hidden costs, and promises that fall apart at the visa stage. Baseline Educational Services was built to offer a better way: an office you can walk into, a counsellor who tells you the truth, and a plan you actually understand before you spend a single naira.",
    "We named ourselves Baseline because everything we do starts from where you are: your grades, your budget, your goals. We build from there, one honest step at a time.",
  ],
};

// TODO: fill in once confirmed, then this line renders on the live page.
// Both values must be non-empty for it to show.
export const founderInfo = {
  foundedYear: "",
  founderName: "",
  founderTitle: "",
  founderPhoto: "", // path under /public, e.g. "/images/founder.jpg"
};

export const whoWeAre = {
  eyebrow: "Who We Are",
  heading: "Our",
  emphasis: "profile",
  paragraphs: [
    "Baseline Educational Services guides Nigerian students through admissions, scholarships and visas for universities around the world. Our most popular destinations are the United Kingdom, Ireland, Germany, Canada, the United States and Australia, but they are only a starting point. Whether you're dreaming of Europe, Asia, the Middle East, or another African country, if you want to study abroad, we'll help you get there.",
    "We support students at every level, from Foundation programmes to Master's degrees and PhDs. We also work closely with parents. Many come to us simply wanting a trustworthy second opinion before they commit their savings, and we welcome that.",
    "Studying abroad is one of the biggest decisions a family will ever make, and we treat it that way. We set clear timelines, budget honestly, and check every document before it's submitted, not after something has gone wrong.",
  ],
};

export const howWeWork: { icon: Icon3DName; title: string; description: string }[] = [
  {
    icon: "speech-balloon",
    title: "We listen first",
    description:
      "Your first consultation is about understanding you: your academic record, your finances, your ambitions and your concerns. There's no pressure and no obligation.",
  },
  {
    icon: "world-map",
    title: "We build your plan",
    description:
      "We recommend the countries, courses and universities that genuinely fit your profile, and we explain exactly why. The right choice might be a well-known destination or somewhere you hadn't considered, like a strong university closer to home in Africa. What matters is that it's right for you.",
  },
  {
    icon: "open-book",
    title: "We prepare you properly",
    description:
      "We guide you through English test preparation, personal statements and interview practice, so you walk in ready rather than hopeful.",
  },
  {
    icon: "page-facing-up",
    title: "We handle the details with you",
    description: "We review every application and visa document, line by line, before anything is submitted.",
  },
  {
    icon: "airplane-departure",
    title: "We stay with you",
    description: "Our support doesn't end at the visa. From pre-departure guidance to your first weeks abroad, we're a message away.",
  },
];

export const whyChooseUs: { icon: Icon3DName; title: string; description: string }[] = [
  {
    icon: "speech-balloon",
    title: "One-on-one counselling",
    description: "Shaped around your grades, budget and goals, never a generic checklist.",
  },
  {
    icon: "globe-europe-africa",
    title: "No destination is off the table",
    description:
      "We're best known for the UK, Ireland, Germany, Canada, the USA and Australia, but we help students study wherever their goals lead, anywhere in the world. Our advice follows your ambitions, not a fixed list.",
  },
  {
    icon: "page-facing-up",
    title: "Document-by-document guidance",
    description: "Every application and visa file is reviewed with you before submission.",
  },
  {
    icon: "office-building",
    title: "A real office in Abuja",
    description: "Students and parents can meet us in person, ask hard questions, and see who they're trusting.",
  },
];

export const ourPromise = {
  eyebrow: "Our Promise",
  heading: "Trust is earned. Here's how we",
  emphasis: "earn it",
  always: [
    "Tell you what's realistic, even when it isn't what you hoped to hear.",
    "Explain our fees clearly and upfront, before you pay anything.",
    "Show you every document before it's submitted in your name.",
    "Respond with care, from your first message to your arrival abroad.",
  ],
  never: [
    "Guarantee a visa or admission. No honest consultant can, because those decisions belong to embassies and universities.",
    "Create, alter or “arrange” documents of any kind.",
    "Push you towards a school or country that doesn't suit you.",
  ],
};

export const ourValues: { icon: Icon3DName; title: string; description: string }[] = [
  {
    icon: "trophy",
    title: "Excellence",
    description: "We hold our advice, our paperwork and our follow-through to a high standard, every single time.",
  },
  {
    icon: "shield",
    title: "Honesty & Trust",
    description: "We tell you what's real, not what's easy to hear. We make no promises we can't keep.",
  },
  {
    icon: "sparkling-heart",
    title: "Care in Every Detail",
    description: "From your first enquiry to your first week abroad, we stay responsive, thorough and present.",
  },
  {
    icon: "handshake",
    title: "Relationships That Last",
    description: "We build long-term relationships with students, families and university partners alike.",
  },
];

// TODO: empty until real credentials (registration numbers, accreditations,
// memberships) are confirmed. The Credentials section is hidden entirely
// while this array is empty — never publish placeholder entries here.
export interface Credential {
  title: string;
  detail: string;
  logo?: string;
}
export const credentials: Credential[] = [];

export const visitUs = {
  eyebrow: "Our Office",
  heading: "Visit us in",
  emphasis: "Abuja",
  body: "We'd love to meet you. Come in, bring your questions (and your parents), and talk to a real counsellor face to face.",
};

export const aboutCta = {
  heading: "Your future abroad is closer than you think.",
  body: "Book a free, no-pressure consultation, or message us on WhatsApp now. A real counsellor, not a bot, will reply.",
};
