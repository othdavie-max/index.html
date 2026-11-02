/** One icon per idea, used the same way everywhere. */
export const CHIP_ICON: Record<string, string> = {
  "Food supply": "🌾", "Food waste cut": "♻️", "Food storage": "🏚️", "Irrigation": "💧", "Farm inputs": "🧑‍🌾", "Food prices": "🍚", "Transport costs": "🚌", "Local fuel": "⛽", "Oil theft": "🏴‍☠️", "Oil output": "🛢️",
  "Electricity": "💡", "Grid": "🔌", "Gas to power": "🔥", "Maintenance": "🔧", "Roads": "🛣️", "Rail": "🚆", "Ports": "⚓", "Unemployment": "👷", "Small business": "🏪", "Factories": "🏭", "Exports": "🚢", "Skills": "🎓", "Incomes": "💵",
  "Dollars in": "💵", "Dollars out": "💸", "Investor confidence": "📈", "Inflation": "📈", "Revenue": "💰", "Tax collected": "🧾", "Corruption": "🕵️", "Honest contracts": "📝", "Govt capacity": "🏛️", "Transparency": "🔍", "Trust": "🤝",
  "Happiness": "😊", "Safety": "🛡️", "Security forces": "🎖️", "Schools": "🏫", "Health": "🏥", "Social support": "🤲", "Petrol price": "⛽", "Budget": "💰", "Protest risk": "✊", "Help for the poor": "🤲", "Dollar debt": "💳", "Cash now": "💰", "Scandal risk": "🕵️", "Street anger": "😠", "Coup risk": "🎖️", "World pressure": "🌍", "Democracy": "🗳️", "Press freedom": "📰", "Elite loyalty": "🎩", "Human rights": "🕊️", "Reserves": "🏦", "Traders": "🧺", "Farmers": "🧑‍🌾", "Youth": "🧑‍🎓", "Workers": "👷", "Business": "💼", "Army": "🎖️", "Faith leaders": "🙏",
};
const WORDS: [RegExp, string][] = [
  [/fuel|petrol|diesel|refiner|pump/i, "⛽"], [/rice|food|grain|farm|harvest|garri|hunger/i, "🍚"], [/power|grid|electric|light|megawatt|solar|gas/i, "💡"],
  [/police|troop|army|military|security|soldier|guard|bandit|terror/i, "🛡️"], [/coup|plot|general/i, "🎖️"], [/talk|dialogue|meet|negotiat|council|speech|address|explain|press/i, "💬"],
  [/loan|borrow|bond|debt|imf|bank/i, "💳"], [/tax|revenue|budget|cash|pay|fund|spend|money|price cap|subsid/i, "💰"], [/arrest|prosecut|sack|fire|jail|court|trial|probe|audit|inquiry/i, "⚖️"],
  [/build|project|road|rail|port|dam|factory|plant|house/i, "🏗️"], [/school|health|clinic|teacher|hospital|educat|vaccine/i, "🏫"], [/job|wage|worker|union|employ|strike/i, "👷"],
  [/protest|march|riot|crowd|street/i, "✊"], [/foreign|china|usa|america|europe|ecowas|visit|embassy|trade|export|import/i, "🌍"], [/naira|dollar|fx|exchange|currency/i, "💵"],
  [/promise|pledge|vow/i, "🤞"], [/ignore|wait|hold|nothing|silent|delay|dodge/i, "⏳"], [/apolog|sorry|regret/i, "🙇"], [/blame|attack|threat|crack|force|ban/i, "🚫"], [/pray|faith|imam|pastor|cleric|church|mosque/i, "🙏"],
  [/media|news|journal|tv|radio/i, "📰"], [/party|senate|assembly|lawmaker|vote|election|campaign/i, "🗳️"], [/corrupt|thief|steal|loot|bribe/i, "🕵️"],
];
export function iconFor(text: string, fallback = "▶️"): string { for (const [r, i] of WORDS) if (r.test(text)) return i; return fallback; }
export const chipIcon = (label: string) => CHIP_ICON[label] ?? iconFor(label, "•");
