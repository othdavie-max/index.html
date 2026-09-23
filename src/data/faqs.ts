import type { FaqItem } from "@/types";

// General process information — no invented company statistics, fees, or
// success rates. Country-specific figures are qualified as estimates and
// point back to the cost calculator / a counsellor for current numbers.
export const faqs: FaqItem[] = [
  {
    id: "cost-1",
    category: "Costs",
    question: "How much does it cost to study abroad from Nigeria?",
    answer:
      "It depends heavily on the country, city, and course. Tuition and living costs vary widely even within one country. Use our Cost Calculator for an estimate broken down by country, level, and city tier, and speak with a counsellor for figures specific to your shortlisted universities.",
  },
  {
    id: "cost-2",
    category: "Costs",
    question: "Does Baseline charge for consultations?",
    answer:
      "Your first consultation is free. We'll walk you through our service fees for admission and visa support during that session, based on the countries and services you need.",
  },
  {
    id: "cost-3",
    category: "Costs",
    question: "What is 'proof of funds' and how much do I need?",
    answer:
      "Most study visas require you to show you can cover a set period of tuition and living costs, usually via a bank statement held for a minimum number of days. The exact amount and rules differ by country. We'll confirm the current requirement for your destination during your application.",
  },
  {
    id: "visa-1",
    category: "Visas",
    question: "Can Baseline guarantee my visa will be approved?",
    answer:
      "No one can guarantee a visa outcome. Approval is entirely at the discretion of the destination country's immigration authority. What we can do is help you prepare a complete, accurate, well-documented application, which is the biggest factor within your control.",
  },
  {
    id: "visa-2",
    category: "Visas",
    question: "What documents do I typically need for a student visa?",
    answer:
      "Common requirements include a valid passport, your university offer/CAS letter, proof of funds, an English test result, academic transcripts, and passport photographs. Exact requirements vary by country. We provide a country-specific checklist once you're ready to apply.",
  },
  {
    id: "visa-3",
    category: "Visas",
    question: "How long does a student visa take to process?",
    answer:
      "Processing times vary by country, embassy workload, and season, ranging from a few weeks to a few months. We help you plan backwards from your intake date so you apply with enough buffer. Try the Timeline Planner for a personalised schedule.",
  },
  {
    id: "admissions-1",
    category: "Admissions",
    question: "What grades do I need to study abroad?",
    answer:
      "Minimum requirements vary by university, course, and country. Some universities accept a wider range of WAEC/NECO or degree classifications than others. Share your results with us and we'll shortlist realistic options.",
  },
  {
    id: "admissions-2",
    category: "Admissions",
    question: "Can I apply to more than one country at the same time?",
    answer:
      "Yes, many students apply to two or three countries in parallel to compare offers, costs, and timelines before deciding. Our Course Matcher and counsellors can help you compare countries side by side.",
  },
  {
    id: "admissions-3",
    category: "Admissions",
    question: "Do I need a specific degree to apply for a Master's abroad?",
    answer:
      "Most Master's programmes require a related (or sometimes any) Bachelor's degree, though some competitive or conversion courses have specific prerequisites. We'll help you check requirements for your shortlisted programmes.",
  },
  {
    id: "english-1",
    category: "English Tests",
    question: "Which English test should I take: IELTS, TOEFL, PTE or Duolingo?",
    answer:
      "It depends on which universities and countries you're targeting. Not all institutions accept every test. We help you confirm which test(s) your shortlisted universities accept before you book one.",
  },
  {
    id: "english-2",
    category: "English Tests",
    question: "Can I study abroad without an English test?",
    answer:
      "Some universities waive the requirement if your prior education was taught in English, subject to their own criteria. This isn't guaranteed everywhere, so we verify it case by case with the university.",
  },
  {
    id: "english-3",
    category: "English Tests",
    question: "How long is an English test result valid for?",
    answer:
      "Most test providers set validity at two years from the test date, though visa authorities may apply their own rules on top. We'll flag this as part of your application timeline.",
  },
  {
    id: "scholarships-1",
    category: "Scholarships",
    question: "Does Baseline guarantee scholarships?",
    answer:
      "No, scholarships are awarded by universities and external bodies based on their own criteria and competition levels. We help you identify scholarships you may be eligible for and prepare a strong application, but we never guarantee an award.",
  },
  {
    id: "scholarships-2",
    category: "Scholarships",
    question: "When should I start looking for scholarships?",
    answer:
      "As early as possible. Many scholarship deadlines fall months before the main application deadline. We flag relevant scholarship windows as part of your personalised timeline.",
  },
  {
    id: "working-1",
    category: "Working Abroad",
    question: "Can I work while studying?",
    answer:
      "Most study visas allow some part-time work during term time and full-time during scheduled breaks, though hour limits and rules differ by country. We'll explain the specific rules for your destination.",
  },
  {
    id: "working-2",
    category: "Working Abroad",
    question: "Can I stay and work after I graduate?",
    answer:
      "Several of our destination countries offer post-study work visas or permits that let graduates stay and work for a period after finishing. See each country's page for an overview, and confirm current rules with us before you apply, since immigration policy changes.",
  },
  {
    id: "working-3",
    category: "Working Abroad",
    question: "Does working abroad after graduation lead to permanent residency?",
    answer:
      "In some countries, post-study work experience can count toward permanent residency pathways, but rules and eligibility vary and change over time. This is a long-term decision worth discussing with a counsellor rather than assuming from general information online.",
  },
];

export const faqCategories = ["Costs", "Visas", "Admissions", "English Tests", "Scholarships", "Working Abroad"] as const;
