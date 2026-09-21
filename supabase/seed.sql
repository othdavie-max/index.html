-- Seed data mirroring the local fallback content in src/data/*.ts.
-- Run after supabase/schema.sql on a fresh project so the admin dashboard
-- and public site have starting content to edit, rather than empty tables.
-- Every row here is PLACEHOLDER data — see README.md's launch checklist.

-- ─────────────────────────────────────────────────────────────────────────
-- FAQS
-- ─────────────────────────────────────────────────────────────────────────
insert into faqs (category, question, answer, sort_order, published) values
('Costs', 'How much does it cost to study abroad from Nigeria?', 'It depends heavily on the country, city, and course — tuition and living costs vary widely even within one country. Use our Cost Calculator for an estimate broken down by country, level, and city tier, and speak with a counsellor for figures specific to your shortlisted universities.', 1, true),
('Costs', 'Does Baseline charge for consultations?', 'Your first consultation is free. We''ll walk you through our service fees for admission and visa support during that session, based on the countries and services you need.', 2, true),
('Costs', 'What is ''proof of funds'' and how much do I need?', 'Most study visas require you to show you can cover a set period of tuition and living costs, usually via a bank statement held for a minimum number of days. The exact amount and rules differ by country — we''ll confirm the current requirement for your destination during your application.', 3, true),
('Visas', 'Can Baseline guarantee my visa will be approved?', 'No one can guarantee a visa outcome — approval is entirely at the discretion of the destination country''s immigration authority. What we can do is help you prepare a complete, accurate, well-documented application, which is the biggest factor within your control.', 1, true),
('Visas', 'What documents do I typically need for a student visa?', 'Common requirements include a valid passport, your university offer/CAS letter, proof of funds, an English test result, academic transcripts, and passport photographs. Exact requirements vary by country — we provide a country-specific checklist once you''re ready to apply.', 2, true),
('Visas', 'How long does a student visa take to process?', 'Processing times vary by country, embassy workload, and season, ranging from a few weeks to a few months. We help you plan backwards from your intake date so you apply with enough buffer — try the Timeline Planner for a personalised schedule.', 3, true),
('Admissions', 'What grades do I need to study abroad?', 'Minimum requirements vary by university, course, and country. Some universities accept a wider range of WAEC/NECO or degree classifications than others. Share your results with us and we''ll shortlist realistic options.', 1, true),
('Admissions', 'Can I apply to more than one country at the same time?', 'Yes — many students apply to two or three countries in parallel to compare offers, costs, and timelines before deciding. Our Course Matcher and counsellors can help you compare countries side by side.', 2, true),
('Admissions', 'Do I need a specific degree to apply for a Master''s abroad?', 'Most Master''s programmes require a related (or sometimes any) Bachelor''s degree, though some competitive or conversion courses have specific prerequisites. We''ll help you check requirements for your shortlisted programmes.', 3, true),
('English Tests', 'Which English test should I take — IELTS, TOEFL, PTE or Duolingo?', 'It depends on which universities and countries you''re targeting — not all institutions accept every test. We help you confirm which test(s) your shortlisted universities accept before you book one.', 1, true),
('English Tests', 'Can I study abroad without an English test?', 'Some universities waive the requirement if your prior education was taught in English, subject to their own criteria. This isn''t guaranteed everywhere, so we verify it case by case with the university.', 2, true),
('English Tests', 'How long is an English test result valid for?', 'Most test providers set validity at two years from the test date, though visa authorities may apply their own rules on top. We''ll flag this as part of your application timeline.', 3, true),
('Scholarships', 'Does Baseline guarantee scholarships?', 'No — scholarships are awarded by universities and external bodies based on their own criteria and competition levels. We help you identify scholarships you may be eligible for and prepare a strong application, but we never guarantee an award.', 1, true),
('Scholarships', 'When should I start looking for scholarships?', 'As early as possible — many scholarship deadlines fall months before the main application deadline. We flag relevant scholarship windows as part of your personalised timeline.', 2, true),
('Working Abroad', 'Can I work while studying?', 'Most study visas allow some part-time work during term time and full-time during scheduled breaks, though hour limits and rules differ by country. We''ll explain the specific rules for your destination.', 1, true),
('Working Abroad', 'Can I stay and work after I graduate?', 'Several of our destination countries offer post-study work visas or permits that let graduates stay and work for a period after finishing. See each country''s page for an overview, and confirm current rules with us before you apply, since immigration policy changes.', 2, true),
('Working Abroad', 'Does working abroad after graduation lead to permanent residency?', 'In some countries, post-study work experience can count toward permanent residency pathways, but rules and eligibility vary and change over time. This is a long-term decision worth discussing with a counsellor rather than assuming from general information online.', 3, true)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- PARTNERS (placeholder — replace with real partner universities)
-- ─────────────────────────────────────────────────────────────────────────
insert into partners (slug, name, country, logo_url, overview, popular_courses, intakes, published) values
('placeholder-uk-university-1', '[Partner University — UK #1]', 'uk', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Business','Computer Science','Law'], array['September','January'], true),
('placeholder-uk-university-2', '[Partner University — UK #2]', 'uk', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Engineering','Media','Architecture'], array['September'], true),
('placeholder-ireland-university-1', '[Partner University — Ireland #1]', 'ireland', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Pharmaceutical Science','Biotechnology','Business'], array['September','January'], true),
('placeholder-germany-university-1', '[Partner University — Germany #1]', 'germany', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Engineering','Data Science','Automotive Technology'], array['October','April'], true),
('placeholder-canada-university-1', '[Partner University — Canada #1]', 'canada', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Business Administration','Health Sciences','IT'], array['September','January','May'], true),
('placeholder-canada-university-2', '[Partner University — Canada #2]', 'canada', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Hospitality Management','Engineering'], array['September','January'], true),
('placeholder-usa-university-1', '[Partner University — USA #1]', 'usa', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Computer Science','Data Analytics','Public Health'], array['August','January'], true),
('placeholder-australia-university-1', '[Partner University — Australia #1]', 'australia', null, 'PLACEHOLDER overview. Replace with the university''s real profile, campus info and rankings once confirmed.', array['Information Technology','Nursing','Business'], array['February','July'], true)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- TEAM (placeholder — replace with real counsellors)
-- ─────────────────────────────────────────────────────────────────────────
insert into team_members (slug, name, role, bio, sort_order, published) values
('placeholder-lead-counsellor', '[Lead Counsellor Name]', 'Lead Study Abroad Counsellor', 'PLACEHOLDER bio — replace with a short, real profile covering experience and specialism.', 1, true),
('placeholder-visa-specialist', '[Visa Specialist Name]', 'Visa & Documentation Specialist', 'PLACEHOLDER bio — replace with a short, real profile covering experience and specialism.', 2, true),
('placeholder-admissions-officer', '[Admissions Officer Name]', 'Admissions Officer', 'PLACEHOLDER bio — replace with a short, real profile covering experience and specialism.', 3, true),
('placeholder-test-prep-coach', '[Test Prep Coach Name]', 'English Test Preparation Coach', 'PLACEHOLDER bio — replace with a short, real profile covering experience and specialism.', 4, true)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- TESTIMONIALS (placeholder — replace with real, consented stories)
-- consent_given is false on every row until a real student's consent is on file.
-- ─────────────────────────────────────────────────────────────────────────
insert into testimonials (name, course, university, country, visa_approved, consent_given, quote, published) values
('[Student Name]', 'MSc Data Science', '[Partner University — UK #1]', 'uk', true, false, 'PLACEHOLDER quote — replace with a real, consented testimonial once available.', true),
('[Student Name]', 'MBA', '[Partner University — Canada #1]', 'canada', true, false, 'PLACEHOLDER quote — replace with a real, consented testimonial once available.', true),
('[Student Name]', 'BSc Computer Science', '[Partner University — Ireland #1]', 'ireland', true, false, 'PLACEHOLDER quote — replace with a real, consented testimonial once available.', true),
('[Student Name]', 'MEng Mechanical Engineering', '[Partner University — Germany #1]', 'germany', false, false, 'PLACEHOLDER quote — replace with a real, consented testimonial once available.', true),
('[Student Name]', 'MPH Public Health', '[Partner University — USA #1]', 'usa', true, false, 'PLACEHOLDER quote — replace with a real, consented testimonial once available.', true),
('[Student Name]', 'BSc Nursing', '[Partner University — Australia #1]', 'australia', true, false, 'PLACEHOLDER quote — replace with a real, consented testimonial once available.', true)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- GUIDES (placeholder file URLs — upload real PDFs and update file_url)
-- ─────────────────────────────────────────────────────────────────────────
insert into guides (slug, title, description, file_url, page_count, published) values
('uk-visa-document-checklist', 'UK Visa Document Checklist', 'Every document you need for a UK student visa application, in one printable checklist.', '/guides/PLACEHOLDER-uk-visa-checklist.pdf', 3, true),
('scholarship-application-starter-kit', 'Scholarship Application Starter Kit', 'A step-by-step guide to finding and applying for scholarships as a Nigerian student.', '/guides/PLACEHOLDER-scholarship-starter-kit.pdf', 6, true),
('sop-writing-guide', 'Statement of Purpose Writing Guide', 'A practical framework for writing a statement of purpose that stands out — with dos and don''ts.', '/guides/PLACEHOLDER-sop-writing-guide.pdf', 5, true)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- DESTINATION CONTENT (estimates — verify before launch)
-- ─────────────────────────────────────────────────────────────────────────
insert into destination_content (country_code, hero_copy, tuition_min, tuition_max, living_min, living_max, intakes, post_study_work, top_courses, visa_notes, currency) values
('uk', 'World-renowned degrees, one-year Master''s options', 9000000, 22000000, 6000000, 12000000, array['September','January'], 'Graduate Route: up to 2 years post-study work (3 for PhD).', array['MBA','Law','Computer Science','Business','Engineering','Media','Architecture'], 'Student visa requires a CAS from your university, proof of funds held for 28 days, and an IHS surcharge.', 'GBP'),
('ireland', 'Europe''s tech and pharma hub, English-speaking', 8000000, 18000000, 6500000, 11000000, array['September','January'], 'Third Level Graduate Scheme: up to 2 years post-study work.', array['Pharmaceutical Science','IT','Chemical Engineering','Biotechnology','HR','Medical Sciences','Business','Law'], 'Non-EEA students need a ''D'' study visa/immigration permission and evidence of funds.', 'EUR'),
('germany', 'Low or no tuition at public universities', 0, 4000000, 6000000, 10000000, array['October','April'], '18-month post-study residence permit to seek qualified work.', array['Engineering','Automotive Technology','Computer Science','Business Administration','Data Science'], 'Requires a blocked account (Sperrkonto) proving living costs, plus university admission or APS certificate.', 'EUR'),
('canada', 'Quality education with clear immigration pathways', 10000000, 24000000, 8000000, 13000000, array['September','January','May'], 'Post-Graduation Work Permit: up to 3 years depending on programme length.', array['Business Administration','Engineering','Health Sciences','IT','Hospitality Management'], 'Study permit requires a Letter of Acceptance, proof of funds, and (for most applicants) a biometrics appointment.', 'CAD'),
('usa', 'The widest range of programmes and campuses', 12000000, 35000000, 9000000, 16000000, array['August','January'], 'Optional Practical Training (OPT): up to 12 months (36 for STEM fields).', array['Computer Science','Business Administration','Engineering','Data Analytics','Public Health'], 'F-1 visa requires a Form I-20 from your school and a SEVIS fee payment before your visa interview.', 'USD'),
('australia', 'Strong tech focus and a diverse, welcoming culture', 11000000, 26000000, 8500000, 14000000, array['February','July'], 'Temporary Graduate visa (subclass 485): 2–4 years depending on qualification.', array['Information Technology','Engineering','Nursing','Business','Data Science'], 'Subclass 500 student visa requires a CoE, Genuine Student criteria, and Overseas Student Health Cover.', 'AUD')
on conflict (country_code) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- EXCHANGE RATES (PLACEHOLDER — update regularly, these move fast)
-- ─────────────────────────────────────────────────────────────────────────
insert into exchange_rates (currency_code, rate_to_ngn) values
('GBP', 2000), ('EUR', 1700), ('CAD', 1100), ('USD', 1550), ('AUD', 1000)
on conflict (currency_code) do nothing;
