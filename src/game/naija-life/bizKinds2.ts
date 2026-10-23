import type { BizKind } from "./business";
import { T } from "./util";

const K = (id: string, emoji: string, en: string, pcm: string, bEn: string, bPcm: string, startCost: number, baseRevenue: number, stockPct: number, rent: number, wage: number, minOpp: number, seasonal = false): BizKind => ({
  id, emoji, get label() { return T(en, pcm); }, get blurb() { return T(bEn, bPcm); }, startCost, baseRevenue, stockPct, rent, wage, minOpp, seasonal,
});

/** Businesses Nigerians actually run. Money is base-year naira. */
export const EXTRA_BIZ: BizKind[] = [
  K("cybercafe", "🖨️", "Cyber café and printing", "Cyber café and printing", "Browsing, printing, passport photos and exam registrations.", "Browsing, printing, passport photo and exam registration.", 900_000, 700_000, 0.25, 150_000, 40_000, 1),
  K("mama_foods", "🍲", "Catering and small chops", "Catering and small chops", "Owambe orders, puff-puff and very large pots.", "Owambe order, puff-puff and very big pot.", 800_000, 900_000, 0.5, 100_000, 40_000, 1),
  K("poultry", "🐔", "Poultry farm", "Poultry farm", "Eggs and broilers. Feed prices decide your mood.", "Egg and broiler. Feed price go decide your mood.", 3_000_000, 2_200_000, 0.55, 150_000, 45_000, 1),
  K("fishfarm", "🐟", "Fish farm (catfish)", "Fish farm (catfish)", "Ponds, feed and 'pepper soup' customers.", "Pond, feed and 'pepper soup' customer.", 3_500_000, 2_400_000, 0.5, 120_000, 45_000, 1, true),
  K("ricemill", "🌾", "Rice mill", "Rice mill", "Paddy in, polished rice out, and middlemen everywhere.", "Paddy in, polished rice out, and middlemen everywhere.", 18_000_000, 8_000_000, 0.6, 700_000, 60_000, 2, true),
  K("palmoil", "🛢️", "Palm oil mill", "Palm oil mill", "From bunches to bottles, with a long season.", "From bunch to bottle, with long season.", 6_000_000, 3_800_000, 0.55, 300_000, 50_000, 1, true),
  K("cassava", "🥔", "Garri and cassava processing", "Garri and cassava processing", "Peel, grate, press and fry. Garri never goes out of style.", "Peel, grate, press and fry. Garri no dey go out of style.", 2_500_000, 1_800_000, 0.55, 180_000, 40_000, 1),
  K("buildmat", "🧱", "Building materials store", "Building materials store", "Cement, rods, tiles and customers who 'will pay Friday'.", "Cement, rod, tile and customer wey 'go pay Friday'.", 12_000_000, 6_500_000, 0.75, 600_000, 50_000, 2),
  K("autoshop", "🔩", "Auto workshop", "Auto workshop", "Engine knock, brake pads and the 'oga, it's the gearbox' speech.", "Engine knock, brake pad and 'oga, na gearbox' speech.", 2_200_000, 1_800_000, 0.45, 220_000, 45_000, 1),
  K("autospares", "⚙️", "Auto spare parts shop", "Auto spare parts shop", "Tokunbo and original parts, in Ladipo style.", "Tokunbo and original parts, for Ladipo style.", 6_500_000, 4_200_000, 0.72, 400_000, 50_000, 2),
  K("cardealer", "🚗", "Car dealership (Tokunbo)", "Car dealership (Tokunbo)", "Import clean cars, haggle all day.", "Import clean car, haggle all day.", 25_000_000, 11_000_000, 0.85, 900_000, 70_000, 3),
  K("rentcar", "🚙", "Car hire and chauffeur service", "Car hire and chauffeur service", "Weddings, airport pickups and VIP cars.", "Wedding, airport pickup and VIP car.", 15_000_000, 6_000_000, 0.25, 500_000, 55_000, 3),
  K("keke_fleet", "🛺", "Keke fleet", "Keke fleet", "Own tricycles, hire drivers, collect daily remittance.", "Own keke, hire driver, collect daily remittance.", 6_000_000, 3_200_000, 0.3, 120_000, 45_000, 1),
  K("fuelstation", "⛽", "Filling station", "Filling station", "Pumps, queues and the price on the board.", "Pump, queue and price on board.", 60_000_000, 24_000_000, 0.88, 2_000_000, 65_000, 3),
  K("gasplant", "🔥", "Cooking gas plant", "Cooking gas plant", "Refill, deliver and watch the cylinders.", "Refill, deliver and watch cylinders.", 9_000_000, 5_000_000, 0.72, 400_000, 55_000, 2),
  K("borehole", "🚰", "Borehole drilling company", "Borehole drilling company", "Everyone needs water. Few trust the drillers.", "Everybody need water. Few trust the driller.", 8_000_000, 4_500_000, 0.4, 300_000, 55_000, 2),
  K("coldroom", "🧊", "Cold room and frozen foods", "Cold room and frozen foods", "Fish, chicken and a prayer against NEPA.", "Fish, chicken and prayer against NEPA.", 10_000_000, 6_000_000, 0.68, 450_000, 50_000, 2),
  K("school", "🏫", "Private primary school", "Private primary school", "Fees, uniforms and PTA meetings.", "Fees, uniform and PTA meeting.", 12_000_000, 5_500_000, 0.2, 700_000, 60_000, 2),
  K("college", "🎓", "Tutorial and exam centre", "Tutorial and exam centre", "JAMB, WAEC and 'we guarantee A1'.", "JAMB, WAEC and 'we guarantee A1'.", 3_500_000, 2_200_000, 0.18, 250_000, 45_000, 2, true),
  K("clinic", "🏥", "Private clinic", "Private clinic", "Consultation, tests and 'please pay the deposit'.", "Consultation, test and 'abeg pay the deposit'.", 30_000_000, 12_000_000, 0.35, 1_200_000, 90_000, 3),
  K("gym", "🏋️", "Gym and fitness centre", "Gym and fitness centre", "Memberships in January, ghost members in March.", "Membership for January, ghost member for March.", 5_000_000, 3_000_000, 0.12, 400_000, 50_000, 3),
  K("spa", "💆", "Spa and massage centre", "Spa and massage centre", "Weekend relaxation for Lagos's tired people.", "Weekend relaxation for Lagos tired people.", 6_000_000, 3_500_000, 0.2, 500_000, 50_000, 3),
  K("makeupstudio", "💄", "Makeup and beauty studio", "Makeup and beauty studio", "Brides, bridesmaids and aso-ebi squads.", "Bride, bridesmaid and aso-ebi squad.", 2_000_000, 1_700_000, 0.3, 200_000, 45_000, 2, true),
  K("eventcentre", "🎉", "Event centre", "Event centre", "Weddings every Saturday. Noise complaints every Sunday.", "Wedding every Saturday. Noise complaint every Sunday.", 45_000_000, 15_000_000, 0.25, 1_800_000, 65_000, 3, true),
  K("lounge", "🍸", "Bar and lounge", "Bar and lounge", "Cold drinks, loud music and a nervous landlord.", "Cold drink, loud music and nervous landlord.", 9_000_000, 6_500_000, 0.55, 800_000, 50_000, 3),
  K("beerparlour", "🍺", "Beer parlour", "Beer parlour", "Pepper soup, football nights and unpaid tabs.", "Pepper soup, football night and unpaid tab.", 2_500_000, 2_000_000, 0.55, 200_000, 40_000, 1),
  K("bookshop", "📚", "Bookshop and stationery", "Bookshop and stationery", "School runs, back-to-school and photocopying.", "School run, back-to-school and photocopy.", 3_000_000, 1_900_000, 0.65, 250_000, 40_000, 2, true),
  K("photostudio", "📷", "Photography and video studio", "Photography and video studio", "Weddings, birthdays and drone shots.", "Wedding, birthday and drone shot.", 3_500_000, 2_000_000, 0.18, 220_000, 45_000, 2, true),
  K("recordlabel", "🎵", "Record label and studio", "Record label and studio", "Sign artists, make hits, argue over royalties.", "Sign artist, make hit, argue over royalty.", 14_000_000, 5_500_000, 0.15, 600_000, 60_000, 4),
  K("filmhouse", "🎬", "Film production house", "Film production house", "Scripts, locations and a leading man who is late.", "Script, location and leading man wey late.", 20_000_000, 8_000_000, 0.3, 700_000, 65_000, 4),
  K("radio", "📻", "Radio station", "Radio station", "Ads, call-in shows and a very loud presenter.", "Ad, call-in show and very loud presenter.", 25_000_000, 7_500_000, 0.1, 900_000, 65_000, 3),
  K("fintech", "💳", "Fintech and payments startup", "Fintech and payments startup", "Wallets, cards and 'CBN regulations'.", "Wallet, card and 'CBN regulation'.", 30_000_000, 10_000_000, 0.1, 800_000, 100_000, 5),
  K("ecommerce", "🛍️", "Online store (e-commerce)", "Online store (e-commerce)", "Instagram orders and dispatch riders.", "Instagram order and dispatch rider.", 2_500_000, 2_200_000, 0.62, 120_000, 45_000, 3),
  K("realestate", "🏘️", "Real estate firm", "Real estate firm", "Agents, inspections and commission.", "Agent, inspection and commission.", 8_000_000, 5_500_000, 0.1, 500_000, 70_000, 3),
  K("solarco", "☀️", "Solar and inverter company", "Solar and inverter company", "NEPA's loss is your gain.", "NEPA loss na your gain.", 12_000_000, 7_000_000, 0.65, 500_000, 60_000, 3),
  K("mall", "🏬", "Shopping plaza", "Shopping plaza", "Rent collection, security and the elevator that never works.", "Rent collection, security and elevator wey no dey work.", 150_000_000, 40_000_000, 0.1, 3_000_000, 85_000, 5),
];
