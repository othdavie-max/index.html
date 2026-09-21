export type NavLink = { label: string; href: string; description?: string };

export const servicesNav: NavLink[] = [
  { label: "Career Counselling", href: "/services/career-counselling", description: "Find the right course and country for you" },
  { label: "Admission Services", href: "/services/admission-services", description: "End-to-end university applications" },
  { label: "English Test Preparation", href: "/services/english-test-preparation", description: "IELTS, TOEFL, PTE and Duolingo prep" },
  { label: "Visa Assistance", href: "/services/visa-assistance", description: "Documentation and application support" },
  { label: "Interview Preparation", href: "/services/interview-preparation", description: "Practice for visa and admission interviews" },
];

export const destinationsNav: NavLink[] = [
  { label: "United Kingdom", href: "/destinations/uk" },
  { label: "Ireland", href: "/destinations/ireland" },
  { label: "Germany", href: "/destinations/germany" },
  { label: "Canada", href: "/destinations/canada" },
  { label: "United States", href: "/destinations/usa" },
  { label: "Australia", href: "/destinations/australia" },
];

export const toolsNav: NavLink[] = [
  { label: "Course Matcher", href: "/tools/course-matcher", description: "2-minute quiz to find your best-fit country" },
  { label: "Cost Calculator", href: "/tools/cost-calculator", description: "Estimate tuition and living costs" },
  { label: "Timeline Planner", href: "/tools/timeline-planner", description: "A personalised roadmap to your intake" },
];

export const primaryNav = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services", children: servicesNav },
  { label: "Destinations", href: "/destinations", children: destinationsNav },
  { label: "Tools", href: "/tools", children: toolsNav },
  { label: "Partners", href: "/partners" },
  { label: "Success Stories", href: "/success-stories" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const footerNav = {
  company: [
    { label: "About Us", href: "/about" },
    { label: "Partners", href: "/partners" },
    { label: "Success Stories", href: "/success-stories" },
    { label: "Blog & Guides", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  services: servicesNav,
  destinations: destinationsNav,
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Notice", href: "/cookie-policy" },
  ],
};
