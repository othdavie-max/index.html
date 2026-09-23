import type { Partner } from "@/types";

// PLACEHOLDER DATA: no real partnerships are implied by the names below —
// they are intentionally generic so nobody mistakes them for confirmed
// institutional partners. Replace every entry with Baseline's verified
// partner university list (name, logo, and details) before launch.
export const partners: Partner[] = [
  {
    slug: "placeholder-uk-university-1",
    name: "[Partner University, UK #1]",
    country: "uk",
    logoPlaceholder: "UK-1",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Business", "Computer Science", "Law"],
    intakes: ["September", "January"],
  },
  {
    slug: "placeholder-uk-university-2",
    name: "[Partner University, UK #2]",
    country: "uk",
    logoPlaceholder: "UK-2",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Engineering", "Media", "Architecture"],
    intakes: ["September"],
  },
  {
    slug: "placeholder-ireland-university-1",
    name: "[Partner University, Ireland #1]",
    country: "ireland",
    logoPlaceholder: "IE-1",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Pharmaceutical Science", "Biotechnology", "Business"],
    intakes: ["September", "January"],
  },
  {
    slug: "placeholder-germany-university-1",
    name: "[Partner University, Germany #1]",
    country: "germany",
    logoPlaceholder: "DE-1",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Engineering", "Data Science", "Automotive Technology"],
    intakes: ["October", "April"],
  },
  {
    slug: "placeholder-canada-university-1",
    name: "[Partner University, Canada #1]",
    country: "canada",
    logoPlaceholder: "CA-1",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Business Administration", "Health Sciences", "IT"],
    intakes: ["September", "January", "May"],
  },
  {
    slug: "placeholder-canada-university-2",
    name: "[Partner University, Canada #2]",
    country: "canada",
    logoPlaceholder: "CA-2",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Hospitality Management", "Engineering"],
    intakes: ["September", "January"],
  },
  {
    slug: "placeholder-usa-university-1",
    name: "[Partner University, USA #1]",
    country: "usa",
    logoPlaceholder: "US-1",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Computer Science", "Data Analytics", "Public Health"],
    intakes: ["August", "January"],
  },
  {
    slug: "placeholder-australia-university-1",
    name: "[Partner University, Australia #1]",
    country: "australia",
    logoPlaceholder: "AU-1",
    overview: "PLACEHOLDER overview. Replace with the university's real profile, campus info and rankings once confirmed.",
    popularCourses: ["Information Technology", "Nursing", "Business"],
    intakes: ["February", "July"],
  },
];

export const getPartner = (slug: string) => partners.find((p) => p.slug === slug);
