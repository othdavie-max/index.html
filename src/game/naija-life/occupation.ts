import { T } from "./util";

const APPRENTICE = /mechanic|tailor|welder|carpenter|bricklayer|barber|hairdress|electrician|plumber|painter|caterer|okada|keke|driver/i;
const TRADE = /mechanic|tailor|driver|okada|bricklayer|hawker|trader|mama put|farm|labourer|cleaner|security guard|caterer|shop owner|carpenter|welder|barber|hairdress|artisan|painter|plumber|keke/i;
const SENIOR = /executive|chairman|owner|developer|contractor|mogul|partner|founder|politician|pastor|professor|consultant|director|tycoon|aide|banker|manager|entertainer|trader & |import/i;

const lower = (j: string) => j.replace(/^(roadside|petty|fresh|rising|ex-|former|retired|struggling)\s+/i, "").toLowerCase();
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** What a person with this career is doing at this age. A 13-year-old is never an engineer. */
export function occupationFor(age: number, adultJob: string, key = ""): string {
  const job = adultJob || "Trader";
  if (age <= 2) return T("Baby", "Baby");
  if (age <= 5) return T("Toddler", "Small pikin");
  if (age <= 12) return T("Pupil", "Pupil");
  const trade = TRADE.test(job);
  const senior = SENIOR.test(job) && !trade;
  if (age <= 17) {
    if (APPRENTICE.test(job) && (/mechanic/i.test(job) || hash(key) % 2 === 0)) {
      const noun = lower(job);
      return /mechanic|welder|electrician|plumber/i.test(job) ? T(`Intern ${noun}`, `Intern ${noun}`) : T(`Apprentice ${noun}`, `Apprentice ${noun}`);
    }
    return T("Student", "Student");
  }
  if (age <= 21) {
    if (trade) return APPRENTICE.test(job) ? T(`Apprentice ${lower(job)}`, `Apprentice ${lower(job)}`) : job;
    return T("Student", "Student");
  }
  if (age <= 24 && !trade) {
    if (/doctor|surgeon/i.test(job)) return T("House officer", "House officer");
    if (/lawyer|law firm/i.test(job)) return T("Pupil lawyer", "Pupil lawyer");
    if (senior) return T("Trainee in the family business", "Trainee for family business");
    return T(`Junior ${lower(job)}`, `Junior ${lower(job)}`);
  }
  if (age <= 29 && senior) return T("Rising in the family business", "Dey rise for family business");
  if (age >= 66) return T(`Retired ${lower(job)}`, `Retired ${lower(job)}`);
  return job;
}

/** Jobs that are really a stage of life, not a career. */
export const STAGE_JOBS = /^(baby|toddler|small pikin|pupil|student|apprentice|intern|junior|trainee|house officer|pupil lawyer|rising|retired)/i;
