/**
 * Name pools used to generate FICTIONAL characters. Pools are drawn from common Nigerian given names and surnames;
 * states map to a weighted mix of pools. Combinations are random, so any resemblance to a real person is
 * coincidental. Names carry no gameplay meaning — voting never depends on a character's name or origin pool.
 */
export type NamePool = "yoruba" | "igbo" | "hausa" | "ne" | "ss" | "midbelt";

interface Pool { male: string[]; female: string[]; surnames: string[] }

export const NAME_POOLS: Record<NamePool, Pool> = {
  yoruba: {
    male: ["Adebayo", "Babatunde", "Olumide", "Segun", "Femi", "Tunde", "Kayode", "Olamide", "Akin", "Dapo", "Wale", "Kunle", "Yinka", "Ayodele", "Seyi", "Gbenga", "Taiwo", "Lekan", "Sola", "Bolaji"],
    female: ["Funmilayo", "Folake", "Titilayo", "Yetunde", "Bukola", "Adenike", "Omolara", "Bisi", "Shade", "Morenike", "Temitope", "Abiola", "Damilola", "Kemi", "Ronke", "Toyin", "Modupe", "Iyabo", "Sade", "Wuraola"],
    surnames: ["Adeyemi", "Ogunleye", "Balogun", "Adebisi", "Olaniyan", "Akinwale", "Ojo", "Ayoola", "Famuyiwa", "Oyelaran", "Adeleke", "Alabi", "Oladipo", "Ogundipe", "Salami", "Akintola", "Bamidele", "Ogunbanjo", "Olawale", "Adewale", "Folarin", "Ajayi", "Adesina", "Olatunji", "Ogunsola"],
  },
  igbo: {
    male: ["Chukwuemeka", "Obinna", "Ikenna", "Chidi", "Nnamdi", "Emeka", "Uchenna", "Ifeanyi", "Kelechi", "Chinedu", "Onyeka", "Arinze", "Tobechukwu", "Kenechukwu", "Ugochukwu", "Okechukwu", "Nkem", "Ejike", "Osita", "Chijioke"],
    female: ["Ngozi", "Chioma", "Adaeze", "Ifeoma", "Nneka", "Amaka", "Uchechi", "Obiageli", "Chiamaka", "Ujunwa", "Nkechi", "Oluchi", "Ebele", "Ozioma", "Onyinye", "Ada", "Kamsi", "Chidinma", "Nnenna", "Ihuoma"],
    surnames: ["Okafor", "Nwosu", "Eze", "Okeke", "Nwachukwu", "Onyeama", "Obi", "Ugwu", "Umeh", "Chukwu", "Anyanwu", "Okonkwo", "Nnadi", "Madu", "Ibe", "Ezeani", "Agu", "Ogbonna", "Nwankwo", "Onwudiwe", "Ikeoha", "Ozor", "Uzor", "Offor", "Ejiofor"],
  },
  hausa: {
    male: ["Abubakar", "Ibrahim", "Usman", "Musa", "Aliyu", "Sani", "Yusuf", "Bashir", "Garba", "Suleiman", "Lawal", "Mustapha", "Shehu", "Haruna", "Nasiru", "Abdullahi", "Kabiru", "Danjuma", "Idris", "Umar"],
    female: ["Aisha", "Fatima", "Hauwa", "Zainab", "Maryam", "Khadija", "Hadiza", "Amina", "Safiya", "Rabi", "Binta", "Halima", "Jamila", "Asmau", "Ramatu", "Zuwaira", "Rukayya", "Salamatu", "Nafisa", "Hafsat"],
    surnames: ["Mohammed", "Bello", "Abdullahi", "Yakubu", "Danladi", "Sulaiman", "Gambo", "Maigari", "Isa", "Jibril", "Tijani", "Dikko", "Ahmad", "Garuba", "Lamido", "Waziri", "Galadima", "Shuaibu", "Tanko", "Umaru", "Sambo", "Aminu", "Kolo", "Zubairu", "Magaji"],
  },
  ne: {
    male: ["Modu", "Kyari", "Bukar", "Mala", "Goni", "Lawan", "Babagana", "Zannah", "Kashim", "Baba", "Mamman", "Abba", "Gana", "Tukur", "Ali", "Ahmadu", "Abdulkadir", "Hassan", "Ismail", "Adamu"],
    female: ["Aisha", "Falmata", "Hauwa", "Zara", "Fatima", "Kaltum", "Maryam", "Yagana", "Hajja", "Amina", "Balaraba", "Ya-Gana", "Hadiza", "Mairo", "Jummai", "Rakiya", "Zainab", "Khadija", "Asabe", "Halima"],
    surnames: ["Kyari", "Bukar", "Modu", "Lawan", "Zanna", "Gana", "Mala", "Goni", "Kolo", "Kachalla", "Mustapha", "Abba", "Umar", "Garba", "Ibrahim", "Aji", "Fannami", "Gubio", "Bulama", "Tijjani"],
  },
  ss: {
    male: ["Osagie", "Efosa", "Osaze", "Eghosa", "Tamuno", "Preye", "Timi", "Ime", "Etim", "Effiong", "Udo", "Okon", "Bassey", "Ovie", "Oghenekaro", "Tega", "Barinem", "Ebiye", "Ndifreke", "Emem"],
    female: ["Idara", "Ekaette", "Mfon", "Uduak", "Nsikak", "Ebiere", "Tonye", "Ere", "Oghenekevwe", "Ejiro", "Eseosa", "Ehi", "Imaobong", "Aniekan", "Efe", "Ogechi", "Tari", "Ibiere", "Ofonime", "Ugonna"],
    surnames: ["Osagie", "Aigbokhan", "Ogbeide", "Idahosa", "Omoruyi", "Uwaifo", "Ebikeme", "Ogoriba", "Tonye", "Dikio", "Seriake", "Etim", "Effiong", "Okon", "Bassey", "Ekpo", "Archibong", "Ibok", "Okotie", "Ejiro", "Oghene", "Amadi", "Ogan", "Nwiyor"],
  },
  midbelt: {
    male: ["Terver", "Msuur", "Ochai", "Ameh", "Attah", "Ocheja", "Gyang", "Dalyop", "Bitrus", "Danjuma", "Istifanus", "Joseph", "Peter", "Samuel", "Dauda", "Yohanna", "Terkimbi", "Ogbu", "Audu", "Ndayako"],
    female: ["Mbayange", "Ene", "Ojoma", "Hannatu", "Rahila", "Naomi", "Esther", "Ladi", "Mary", "Rebecca", "Salome", "Comfort", "Ngunan", "Onyeje", "Aisha", "Hajara", "Jummai", "Zainab", "Blessing", "Grace"],
    surnames: ["Gyang", "Dung", "Pam", "Lar", "Bako", "Dalyop", "Ochai", "Ameh", "Attah", "Ocheja", "Akaa", "Ityavyar", "Onah", "Ogbu", "Audu", "Ndayako", "Zakari", "Kolo", "Yakubu", "Tsav", "Iorfa", "Ayuba", "Chollom", "Dantong"],
  },
};

/** State id → weighted name pools. Purely cosmetic realism for generated characters. */
export const STATE_NAME_POOLS: Record<string, Partial<Record<NamePool, number>>> = {
  "NG-AB": { igbo: 1 }, "NG-AD": { ne: 0.5, hausa: 0.3, midbelt: 0.2 }, "NG-AK": { ss: 1 }, "NG-AN": { igbo: 1 },
  "NG-BA": { hausa: 0.8, ne: 0.2 }, "NG-BY": { ss: 1 }, "NG-BE": { midbelt: 1 }, "NG-BO": { ne: 1 },
  "NG-CR": { ss: 1 }, "NG-DE": { ss: 0.7, igbo: 0.3 }, "NG-EB": { igbo: 1 }, "NG-ED": { ss: 1 },
  "NG-EK": { yoruba: 1 }, "NG-EN": { igbo: 1 }, "NG-GO": { hausa: 0.6, ne: 0.4 }, "NG-IM": { igbo: 1 },
  "NG-JI": { hausa: 1 }, "NG-KD": { hausa: 0.65, midbelt: 0.35 }, "NG-KN": { hausa: 1 }, "NG-KT": { hausa: 1 },
  "NG-KE": { hausa: 1 }, "NG-KO": { midbelt: 0.5, yoruba: 0.25, igbo: 0.25 }, "NG-KW": { yoruba: 0.55, hausa: 0.2, midbelt: 0.25 },
  "NG-LA": { yoruba: 0.7, igbo: 0.2, hausa: 0.1 }, "NG-NA": { midbelt: 0.7, hausa: 0.3 }, "NG-NI": { hausa: 0.5, midbelt: 0.5 },
  "NG-OG": { yoruba: 1 }, "NG-ON": { yoruba: 1 }, "NG-OS": { yoruba: 1 }, "NG-OY": { yoruba: 1 },
  "NG-PL": { midbelt: 1 }, "NG-RI": { ss: 0.8, igbo: 0.2 }, "NG-SO": { hausa: 1 }, "NG-TA": { midbelt: 0.5, ne: 0.3, hausa: 0.2 },
  "NG-YO": { ne: 0.7, hausa: 0.3 }, "NG-ZA": { hausa: 1 }, "NG-FC": { hausa: 0.3, midbelt: 0.3, yoruba: 0.2, igbo: 0.2 },
};
