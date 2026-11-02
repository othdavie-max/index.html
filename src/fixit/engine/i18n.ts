/**
 * Languages. English is the source. Pidgin is rule-based (engine/pidgin.ts). Hausa, Yoruba and Igbo translate the
 * interface itself (menus, buttons, tabs, resource names) by exact-text lookup; long story text stays in English.
 * These are careful first-pass translations and want a native-speaker review before being called final.
 */
export type Lang = "en" | "pcm" | "ha" | "yo" | "ig";
export const LANGS: { id: Lang; name: string; native: string; short: string }[] = [
  { id: "en", name: "English", native: "English", short: "EN" },
  { id: "pcm", name: "Naija Pidgin", native: "Naija Pidgin", short: "PCM" },
  { id: "ha", name: "Hausa", native: "Hausa", short: "HA" },
  { id: "yo", name: "Yoruba", native: "Yorùbá", short: "YO" },
  { id: "ig", name: "Igbo", native: "Igbo", short: "IG" },
];
export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.id === v);

type Row = [en: string, ha: string, yo: string, ig: string];
const ROWS: Row[] = [
  // groups & tabs
  ["Build", "Gina", "Kọ́", "Wuo"], ["Economy", "Tattalin arziki", "Ọ̀rọ̀ ajé", "Akụ̀ na ụzụ"], ["Power", "Iko", "Agbára", "Ike"], ["People", "Jama'a", "Àwọn ènìyàn", "Ndị mmadụ"], ["News", "Labarai", "Ìròyìn", "Akụkọ"],
  ["Overview", "Taƙaitaccen bayani", "Àkópọ̀", "Nchịkọta"], ["Plans", "Tsare-tsare", "Ètò", "Atụmatụ"], ["Projects", "Ayyuka", "Iṣẹ́ àkànṣe", "Ọrụ"], ["Grand plans", "Manyan tsare-tsare", "Ètò ńlá", "Atụmatụ ukwu"], ["Policies", "Manufofi", "Ìlànà", "Iwu na atumatu"],
  ["Trade & world", "Ciniki da duniya", "Okòwò àti ayé", "Azụmahịa na ụwa"], ["Debt & lending", "Bashi da lamuni", "Gbèsè àti yíyá owó", "Ụgwọ na ịgbazinye"], ["Fuel & refineries", "Mai da matatu", "Epo àti ilé iṣẹ́ epo", "Mmanụ na ụlọ ọrụ mmanụ"], ["Investors", "Masu zuba jari", "Àwọn oníbàáṣepọ̀", "Ndị na-etinye ego"],
  ["President's office", "Ofishin shugaban ƙasa", "Ọ́fíìsì Ààrẹ", "Ụlọ ọrụ Onye isi ala"], ["Assembly", "Majalisa", "Ilé aṣòfin", "Ụlọ omebe iwu"], ["Big moves", "Manyan matakai", "Ìgbésẹ̀ ńlá", "Nzọ ukwu"], ["Foreign", "Harkokin waje", "Ìbáṣepọ̀ ilẹ̀ òkèèrè", "Mba ofesi"], ["World league", "Gasar duniya", "Ìdíje àgbáyé", "Asọmpi ụwa"], ["Military", "Soja", "Ológun", "Ndị agha"],
  ["My team", "Ƙungiyata", "Ẹgbẹ́ mi", "Otu m"], ["Governors", "Gwamnoni", "Àwọn gómìnà", "Ndị gọvanọ"], ["Party", "Jam'iyya", "Ẹgbẹ́ òṣèlú", "Otu ndọrọ ndọrọ"], ["Advisers", "Masu ba da shawara", "Àwọn agbani-nímọ̀ràn", "Ndị ndụmọdụ"], ["Enemies", "Abokan gaba", "Àwọn ọ̀tá", "Ndị iro"],
  ["Naija X", "Naija X", "Naija X", "Naija X"], ["Nigeria today", "Najeriya a yau", "Nàìjíríà lónìí", "Naịjirịa taa"],
  // resources & stats
  ["Budget", "Kasafi", "Ìsúnàá", "Mmefu ego"], ["Approval", "Amincewa", "Ìfọwọ́sí", "Nkwenye"], ["Trust", "Amana", "Ìgbẹ́kẹ̀lé", "Ntụkwasị obi"], ["Happiness", "Farin ciki", "Ayọ̀", "Obi ụtọ"], ["Safety", "Tsaro", "Ààbò", "Nchekwa"], ["Corruption", "Cin hanci", "Ìwà ìbàjẹ́", "Ọchịchọ ego na-ezighi ezi"],
  ["Democracy", "Dimokuraɗiyya", "Ìjọba alágbádá", "Ọchịchị onye kwuo uche ya"], ["Press freedom", "'Yancin jarida", "Òmìnira oníròyìn", "Nnwere onwe ụlọ akụkọ"], ["Street anger", "Fushin titi", "Ìbínú ìgboro", "Iwe n'okporo ụzọ"], ["Coup risk", "Haɗarin juyin mulki", "Ewu ìdìtẹ̀", "Ọghọm mgbanwe ọchịchị"], ["World pressure", "Matsin lambar duniya", "Ìdààmú àgbáyé", "Nrụgide ụwa"],
  ["Reserves", "Ajiya", "Owó ìpamọ́", "Ego ndebe"], ["Naira", "Naira", "Náírà", "Naịra"], ["Elite loyalty", "Amincin manyan mutane", "Ìdúróṣinṣin àwọn ọlọ́lá", "Ịkwụwa ndị ukwu n'azụ"], ["Human rights", "Haƙƙin ɗan Adam", "Ẹ̀tọ́ ọmọ ènìyàn", "Ikike mmadụ"],
  ["Traders", "'Yan kasuwa", "Àwọn oníṣòwò", "Ndị ahịa"], ["Farmers", "Manoma", "Àwọn àgbẹ̀", "Ndị ọrụ ugbo"], ["Youth", "Matasa", "Àwọn ọ̀dọ́", "Ndị ntorobịa"], ["Workers", "Ma'aikata", "Àwọn òṣìṣẹ́", "Ndị ọrụ"], ["Business", "Kasuwanci", "Ìṣòwò", "Azụmahịa"], ["Army", "Sojoji", "Ọmọ ogun", "Ndị agha"], ["Faith leaders", "Shugabannin addini", "Àwọn aṣíwájú ẹ̀sìn", "Ndị isi okpukpe"],
  // buttons & prompts
  ["Do it", "Yi shi", "Ṣe é", "Mee ya"], ["Decide", "Yanke shawara", "Pinnu", "Kpebie"], ["Save now", "Ajiye yanzu", "Fi pamọ́ nísinsìnyí", "Chekwaa ugbu a"], ["Save slots", "Wuraren ajiya", "Àwọn ibi ìpamọ́", "Ebe nchekwa"], ["How to play", "Yadda ake wasa", "Bí a ṣe ń ṣeré", "Otu esi egwu"], ["About & data", "Game da wasan", "Nípa eré yìí", "Maka egwuregwu a"],
  ["Sound on", "Sauti a kunna", "Ohùn ń ṣiṣẹ́", "Olu na-akpọ"], ["Sound off", "Sauti a kashe", "Ohùn ti paá", "Olu emechiri"], ["Music on", "Kiɗa a kunna", "Orin ń ṣiṣẹ́", "Egwu na-akpọ"], ["Music off", "Kiɗa a kashe", "Orin ti paá", "Egwu emechiri"],
  ["Export save file", "Fitar da fayil ɗin ajiya", "Gbé fáìlì ìpamọ́ jáde", "Wepụta faịlụ nchekwa"], ["Import save file", "Shigo da fayil ɗin ajiya", "Gbé fáìlì ìpamọ́ wọlé", "Bubata faịlụ nchekwa"], ["Restore last backup", "Maido da ajiyar ƙarshe", "Dá ìpamọ́ tó kẹ́yìn padà", "Weghachi nchekwa ikpeazụ"],
  ["Continue", "Ci gaba", "Tẹ̀síwájú", "Gaa n'ihu"], ["Back", "Koma baya", "Padà sẹ́yìn", "Laghachi"], ["Next", "Na gaba", "Èyí tó kàn", "Nke na-esote"], ["Start", "Fara", "Bẹ̀rẹ̀", "Malite"], ["Close", "Rufe", "Pa á", "Mechie"], ["Cancel", "Soke", "Fagilé", "Kagbuo"], ["Done", "An gama", "Ti parí", "Emechaala"], ["Yes", "Eh", "Bẹ́ẹ̀ni", "Ee"], ["No", "A'a", "Rárá", "Mba"],
  ["New game", "Sabon wasa", "Eré tuntun", "Egwuregwu ọhụrụ"], ["Continue game", "Ci gaba da wasa", "Tẹ̀síwájú eré", "Gaa n'ihu n'egwuregwu"], ["Menu", "Menu", "Àtòjọ", "Menu"], ["Settings", "Saituna", "Ètò", "Nhazi"], ["Language", "Harshe", "Èdè", "Asụsụ"], ["Game length", "Tsawon wasa", "Gígùn eré", "Ogologo egwuregwu"], ["Full campaign", "Cikakken yaƙin neman zaɓe", "Ìpolongo kíkún", "Mgbasa ozi zuru ezu"], ["Quick term", "Wa'adi mai sauri", "Ọdún kúkúrú", "Oge dị mkpụmkpụ"], ["Legacy mode", "Yanayin gado", "Ipò ogún", "Ụdị ihe nketa"], ["Sandbox", "Sandbox", "Sandbox", "Sandbox"],
  ["Street voices in", "Muryoyin titi a", "Ohùn ìgboro ní", "Olu n'okporo ụzọ n'asụsụ"], ["How you take over", "Yadda za ka karɓi mulki", "Bí o ṣe gbàjọba", "Otu i si weghara ọchịchị"], ["Legacy perks from past games", "Fa'idodin gado daga wasannin baya", "Àǹfààní ogún láti àwọn eré tó kọjá", "Uru nketa sitere n'egwuregwu gara aga"],
  ["Overview of the month", "Taƙaitaccen watan", "Àkópọ̀ oṣù", "Nchịkọta nke ọnwa"], ["Next month", "Wata mai zuwa", "Oṣù tó ń bọ̀", "Ọnwa na-esote"], ["End month", "Ƙare wata", "Parí oṣù", "Mechie ọnwa"], ["Pause", "Dakata", "Dúró", "Kwụsị"], ["Play", "Kunna", "Ṣeré", "Kpọọ"],
  ["More detail", "Ƙarin bayani", "Àlàyé síi", "Ọzọ ozi"], ["What is this?", "Menene wannan?", "Kí ni èyí?", "Gịnị bụ nke a?"], ["Open Power", "Buɗe Iko", "Ṣí Agbára", "Mepee Ike"], ["Open Plans", "Buɗe Tsare-tsare", "Ṣí Ètò", "Mepee Atụmatụ"],
  ["Nigeria: Can you fix it?", "Najeriya: Za ka iya gyara ta?", "Nàìjíríà: Ṣé o lè tún un ṣe?", "Naịjirịa: Ị nwere ike idozi ya?"], ["NIGERIA: CAN YOU FIX IT?", "NAJERIYA: ZA KA IYA GYARA TA?", "NÀÌJÍRÍÀ: ṢÉ O LÈ TÚN UN ṢE?", "NAỊJIRỊA: Ị NWERE IKE IDOZI YA?"],
  ["A PRESIDENTIAL STRATEGY GAME", "WASAN dabarun shugabancin ƙasa", "ERÉ ÌGBÉṢẸ̀ ÌJỌBA ÀÁRẸ", "EGWURUEGWU AKA NDỤMỌDỤ ONYE ISI ALA"],
  ["Start your presidency", "Fara shugabancinka", "Bẹ̀rẹ̀ ipò Ààrẹ rẹ", "Malite ọchịchị gị"], ["Continue your last game", "Ci gaba da wasanka na ƙarshe", "Tẹ̀síwájú eré rẹ tó kẹ́yìn", "Gaa n'ihu n'egwuregwu gị nke ikpeazụ"],
  ["Fix Nigeria. Then take on the world.", "Gyara Najeriya. Sannan ka fuskanci duniya.", "Tún Nàìjíríà ṣe. Lẹ́yìn náà, kojú ayé.", "Doo Naịjirịa. Mgbe ahụ, gaa chee ụwa ihu."],
  ["Fictional and simulated. Every figure is a game value, not real data.", "Na ƙirƙira ne kuma na kwaikwayo ne. Kowace lamba ƙimar wasa ce, ba bayanai na gaske ba.", "Ìtàn àròsọ ni, àfarawé sì ni. Gbogbo nọ́ńbà jẹ́ iye eré, kì í ṣe dátà gidi.", "Ọ bụ akụkọ echepụtara, ọ bụkwa ịmụrụ anya. Ọnụọgụ ọ bụla bụ uru egwuregwu, ọ bụghị data n'ezie."],
  ["Load", "Buɗe", "Gbé wọlé", "Bubata"], ["Daily", "Na yau da kullum", "Ojoojúmọ́", "Kwa ụbọchị"], ["Hall", "Zauren", "Gbọ̀ngàn", "Ụlọ nsọpụrụ"], ["About", "Game da", "Nípa", "Banyere"],
  ["Trade", "Ciniki", "Okòwò", "Azụmahịa"], ["Friendship", "Abota", "Ọ̀rẹ́", "Enyi"], ["Imports", "Shigo da kaya", "Ọjà àbọ̀", "Ngwa ewetara"], ["Exports", "Fitar da kaya", "Ọjà tí a ń kó jáde", "Ngwa ezipụ"], ["Factories", "Masana'antu", "Àwọn ilé iṣẹ́", "Ụlọ ọrụ"], ["Oil", "Mai", "Epo", "Mmanụ"], ["Food", "Abinci", "Oúnjẹ", "Nri"], ["Jobs", "Ayyuka", "Iṣẹ́", "Ọrụ"], ["Mood", "Yanayi", "Ìwà", "Ọnọdụ obi"], ["Politics", "Siyasa", "Òṣèlú", "Ndọrọ ndọrọ ọchịchị"],
];
const IDX: Record<"ha" | "yo" | "ig", Map<string, string>> = { ha: new Map(), yo: new Map(), ig: new Map() };
for (const [en, ha, yo, ig] of ROWS) { IDX.ha.set(en, ha); IDX.yo.set(en, yo); IDX.ig.set(en, ig); }
/** Look up one interface string. Keeps surrounding spaces and any leading emoji/icons. */
export function ui(lang: Lang, text: string): string {
  if (lang === "en" || lang === "pcm") return text;
  const m = IDX[lang]; const hit = m.get(text.trim()); if (hit) return text.replace(text.trim(), hit);
  const g = text.match(/^([^\p{L}\p{N}]+)(.+?)\s*$/u); // "🔊 Sound on" → icon + label
  if (g) { const h2 = m.get(g[2].trim()); if (h2) return text.replace(g[2].trim(), h2); }
  return text;
}
