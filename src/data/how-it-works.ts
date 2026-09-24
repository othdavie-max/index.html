export const howItWorksSteps = [
  {
    id: "consultation",
    number: "01",
    title: "Consultation",
    short: "Consult",
    caption: "Getting to know you",
    description:
      "Tell us your goals, academic background, budget and where you'd like to study. We listen first, then give you an honest read on what's realistic.",
  },
  {
    id: "selection",
    number: "02",
    title: "Course & University Selection",
    short: "Selection",
    caption: "Finding the right fit",
    description:
      "We shortlist courses and universities that actually fit your profile and goals, using our Course Matcher and counsellor review. Popular destinations or anywhere else, we start from you.",
  },
  {
    id: "application",
    number: "03",
    title: "Application",
    short: "Application",
    caption: "Building your application",
    description:
      "We help you compile documents, write a strong statement of purpose and submit to your shortlisted universities. When offers arrive, we help you compare them and flag scholarships you may be eligible for.",
  },
  {
    id: "visa",
    number: "04",
    title: "Visa Support",
    short: "Visa",
    caption: "Preparing your visa",
    description:
      "We help you prepare a complete visa application, check your documents and run mock interviews where one is required.",
  },
  {
    id: "departure",
    number: "05",
    title: "Pre-Departure",
    short: "Departure",
    caption: "Ready for your next chapter",
    description:
      "From pre-departure briefings to your first weeks abroad, we help you get ready to go and stay reachable while you settle into your new campus.",
  },
] as const;

export type HowItWorksStep = (typeof howItWorksSteps)[number];
