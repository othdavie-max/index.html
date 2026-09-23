export type OtherDestinationRegion = "Europe" | "Africa" | "Asia & the Middle East" | "Oceania" | "The Americas";

export interface OtherDestination {
  name: string;
  /** ISO 3166-1 alpha-2 code, lowercase — matches /public/flags/<flagCode>.svg (circle-flags). */
  flagCode: string;
  region: OtherDestinationRegion;
}

// Editable starter list of countries students commonly ask about beyond our
// six popular destinations. Add more any time — no code changes needed.
export const otherDestinations: OtherDestination[] = [
  { name: "Netherlands", flagCode: "nl", region: "Europe" },
  { name: "France", flagCode: "fr", region: "Europe" },
  { name: "Poland", flagCode: "pl", region: "Europe" },
  { name: "Malta", flagCode: "mt", region: "Europe" },
  { name: "Cyprus", flagCode: "cy", region: "Europe" },
  { name: "Sweden", flagCode: "se", region: "Europe" },
  { name: "New Zealand", flagCode: "nz", region: "Oceania" },
  { name: "UAE", flagCode: "ae", region: "Asia & the Middle East" },
  { name: "Malaysia", flagCode: "my", region: "Asia & the Middle East" },
  { name: "China", flagCode: "cn", region: "Asia & the Middle East" },
  { name: "Turkey", flagCode: "tr", region: "Asia & the Middle East" },
  { name: "South Africa", flagCode: "za", region: "Africa" },
  { name: "Ghana", flagCode: "gh", region: "Africa" },
  { name: "Rwanda", flagCode: "rw", region: "Africa" },
];

export const otherDestinationRegionOrder: OtherDestinationRegion[] = [
  "Europe",
  "Africa",
  "Asia & the Middle East",
  "Oceania",
  "The Americas",
];

export function otherDestinationsByRegion() {
  return otherDestinationRegionOrder
    .map((region) => ({ region, countries: otherDestinations.filter((c) => c.region === region) }))
    .filter((group) => group.countries.length > 0);
}
