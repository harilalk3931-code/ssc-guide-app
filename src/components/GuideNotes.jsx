import { useState, useEffect, useMemo } from 'react';
import Navbar from './Navbar';
import { useStore } from '../store';

// Text-to-speech utility
function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[#*_`>\-]/g, '').replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = 0.85;
  u.pitch = 1;
  u.lang = 'en-IN';
  const voices = window.speechSynthesis.getVoices();
  const indian = voices.find((v) => v.lang.startsWith('en-IN')) || voices.find((v) => v.lang.startsWith('en'));
  if (indian) u.voice = indian;
  window.speechSynthesis.speak(u);
}
function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// Lightweight markdown renderer (no external deps needed on the server build)
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(text) {
  let s = escapeHtml(text);
  // **bold**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // *italic*
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}

function renderMarkdown(md) {
  const lines = String(md || '').split(/\r?\n/);
  const out = [];
  let inList = null; // 'ul' or 'ol'

  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);
    const hr = /^(-{3,}|\*{3,}|_{3,})$/.test(line);

    if (h) {
      closeList();
      const lvl = Math.min(3, h[1].length + 1);
      out.push(`<h${lvl}>${inlineMarkdown(h[2])}</h${lvl}>`);
    } else if (ul) {
      if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
      out.push(`<li>${inlineMarkdown(ul[1])}</li>`);
    } else if (ol) {
      if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
      out.push(`<li>${inlineMarkdown(ol[1])}</li>`);
    } else if (quote) {
      closeList();
      out.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
    } else if (hr) {
      closeList();
      out.push('<hr/>');
    } else {
      closeList();
      out.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

const PROVIDER_NAMES = {
  nemotron: 'NVIDIA Nemotron',
  openai: 'OpenAI',
  groq: 'Groq (Llama)',
  gemini: 'Google Gemini',
};
const getProviderName = (providerId) => PROVIDER_NAMES[providerId] || 'AI';

const GUIDE_NOTES = {
  'General Awareness': {
    icon: '🌍',
    color: 'from-blue-500 to-cyan-500',
    sections: [
      {
        title: 'Indian Polity - Key Articles',
        content: `**Fundamental Rights (Articles 12-35):**
• Article 14: Equality before law
• Article 15: Prohibition of discrimination
• Article 16: Equality of opportunity in public employment
• Article 19: Freedom of speech, assembly, association, movement, residence, profession
• Article 21: Protection of life and personal liberty
• Article 21A: Right to education (6-14 years)
• Article 32: Right to constitutional remedies

**Directive Principles (Articles 36-51):**
• Article 39: Policy principles - adequate livelihood, equal pay, worker protection
• Article 40: Village panchayats
• Article 44: Uniform Civil Code
• Article 45: Early childhood care & education
• Article 50: Separation of judiciary from executive

**Important Amendments:**
• 42nd (1976): Mini-Constitution, added 'Socialist', 'Secular', 'Integrity'
• 44th (1978): Removed right to property as fundamental right
• 73rd/74th (1992): Panchayats & Municipalities
• 86th (2002): Right to Education
• 101st (2016): GST`,
      },
      {
        title: 'Indian History - Quick Timeline',
        content: `**Ancient India:**
• Indus Valley Civilization: 2500-1750 BCE
• Vedic Period: 1500-600 BCE (Rigveda earliest)
• Mauryan Empire: 322-185 BCE (Chandragupta, Ashoka)
• Gupta Empire: 320-550 CE (Golden Age)

**Medieval India:**
• Delhi Sultanate: 1206-1526 CE
• Mughal Empire: 1526-1857 CE (Babur to Bahadur Shah Zafar)
• Vijayanagara & Bahmani Kingdoms

**Modern India:**
• 1857: First War of Independence
• 1885: INC formed
• 1905: Partition of Bengal
• 1919: Jallianwala Bagh, Rowlatt Act
• 1930: Dandi March, Civil Disobedience
• 1942: Quit India Movement
• 1947: Independence & Partition`,
      },
      {
        title: 'Geography - Key Facts',
        content: `**Physical Geography:**
• Highest peak: Kangchenjunga (8,586m) - 3rd highest in world
• Longest river: Ganga (2,525 km in India)
• Largest state by area: Rajasthan
• Smallest state: Goa
• Coastline: 7,516.6 km

**Important Boundaries:**
• Durand Line: India-Afghanistan (now Pak-Afghan)
• McMahon Line: India-China (Arunachal)
• Radcliffe Line: India-Pakistan
• LOC: Line of Control (Kashmir)
• LAC: Line of Actual Control (China)

**Climate & Agriculture:**
• Monsoon: Southwest (June-Sept), Northeast (Oct-Dec)
• Major crops: Rice, Wheat, Cotton, Sugarcane, Tea, Coffee
• Green Revolution: 1960s (Wheat/Rice)
• White Revolution: Operation Flood (Milk)`,
      },
      {
        title: 'Economy - Key Concepts',
        content: `**National Income:**
• GDP: Total value of goods/services produced within territory
• GNP = GDP + Net factor income from abroad
• NNP = GNP - Depreciation
• Per Capita Income = National Income / Population

**Banking & Finance:**
• RBI established: 1935, nationalized 1949
• CRR: Cash Reserve Ratio (currently ~4.5%)
• SLR: Statutory Liquidity Ratio (currently ~18%)
• Repo Rate: Rate at which RBI lends to banks
• Reverse Repo: Rate at which RBI borrows from banks

**Important Schemes:**
• PM-KISAN: ₹6,000/year to farmers
• PM-JAY (Ayushman Bharat): ₹5 lakh health cover
• PM-AWAS: Housing for all
• Ujjwala: Free LPG connections
• Jan Dhan: Financial inclusion`,
      },
      {
        title: 'General Science - High Yield Topics',
        content: `**Physics:**
• Newton's Laws, Work-Energy-Power
• Light: Reflection, Refraction, Lenses, Mirrors
• Electricity: Ohm's Law, Series/Parallel, Power
• Magnetism: Electromagnetic induction
• Modern Physics: Atomic structure, Radioactivity

**Chemistry:**
• Periodic Table: Groups, Periods, Trends
• Acids, Bases, Salts & pH
• Chemical Bonding: Ionic, Covalent, Metallic
• Carbon compounds: Hydrocarbons, Functional groups
• Metallurgy: Extraction, Alloys

**Biology:**
• Cell: Structure, Organelles, Division (Mitosis/Meiosis)
• Human Systems: Digestive, Respiratory, Circulatory, Nervous, Excretory
• Plant Physiology: Photosynthesis, Respiration, Transpiration
• Genetics: Mendel's Laws, DNA/RNA, Genetic disorders
• Diseases: Communicable & Non-communicable, Vaccines`,
      },
    ],
  },
  'Reasoning': {
    icon: '🧩',
    color: 'from-purple-500 to-pink-500',
    sections: [
      {
        title: 'Series Completion Tricks',
        content: `**Number Series Patterns:**
• Prime numbers: 2, 3, 5, 7, 11, 13, 17, 19...
• Squares: 1, 4, 9, 16, 25, 36, 49, 64...
• Cubes: 1, 8, 27, 64, 125, 216...
• Multiplication: ×2, ×3, ×1.5, ×2.5...
• Difference: +2, +4, +6, +8... or ×2, ×3, ×4...
• Alternate series: Two series mixed

**Letter Series:**
• Alphabetical positions: A=1, B=2... Z=26
• Opposite letters: A↔Z, B↔Y, C↔X... (sum=27)
• Skipping patterns: +1, +2, +3... or -1, -2, -3...
• Vowel/Consonant patterns

**Mixed Series:**
• Letter-Number: A1, B2, C3... or A2, B4, C6...
• Symbol patterns: @, #, $, %, ^...`,
      },
      {
        title: 'Coding-Decoding Shortcuts',
        content: `**Common Patterns:**
1. **Letter Shifting:** Each letter shifted by +n or -n
   Example: CAT → DBU (+1 each)

2. **Reverse Order:** Word written backwards
   Example: HELLO → OLLEH

3. **Opposite Letters:** A↔Z, B↔Y, C↔X... (sum=27)
   Example: CAT → XZG

4. **Number Coding:** A=1, B=2... or A=26, B=25...
   Example: CAT = 3-1-20 or 24-26-7

5. **Symbol Substitution:** Each letter = symbol

**Tricks:**
• Write alphabet with numbers (A=1 to Z=26)
• Write reverse alphabet (A=26 to Z=1)
• Check first-last letter pattern
• Check vowel/consonant positions`,
      },
      {
        title: 'Blood Relations - Family Tree Method',
        content: `**Key Relations:**
• Father's/Mother's father = Grandfather
• Father's/Mother's mother = Grandmother
• Father's/Mother's brother = Uncle
• Father's/Mother's sister = Aunt
• Uncle's/Aunt's children = Cousins
• Sibling's children = Nephew/Niece
• Children's children = Grandchildren

**Generations:**
• Generation +2: Grandparents
• Generation +1: Parents, Uncles, Aunts
• Generation 0: Self, Siblings, Cousins
• Generation -1: Children, Nephews, Nieces
• Generation -2: Grandchildren

**Quick Trick:** Draw family tree with symbols:
□ = Male, ○ = Female, = = Marriage, | = Children`,
      },
      {
        title: 'Syllogism - Venn Diagram Approach',
        content: `**Standard Forms:**
• All A are B → A inside B
• Some A are B → A and B overlap
• No A are B → A and B separate
• Some A are not B → Part of A outside B

**Rules:**
1. Middle term must be distributed at least once
2. If a term is distributed in conclusion, it must be distributed in premise
3. Two negative premises → No conclusion
4. Two particular premises → No conclusion
5. One negative premise → Negative conclusion
6. One particular premise → Particular conclusion

**Common Conclusions:**
• All + All = All
• All + No = No
• All + Some = Some
• Some + All = Some
• Some + No = Some Not
• Some + Some = No definite conclusion`,
      },
    ],
  },
  'Quantitative Aptitude': {
    icon: '🔢',
    color: 'from-green-500 to-emerald-500',
    sections: [
      {
        title: 'Percentage - Golden Rules',
        content: `**Basic Formulas:**
• % = (Part/Whole) × 100
• x% of y = (x/100) × y
• x is what % of y = (x/y) × 100
• % change = (New-Old)/Old × 100

**Shortcut Tricks:**
1. **a% of b = b% of a** (Commutative)
2. **Successive %:** x% then y% = x + y + xy/100
3. **% Increase then Decrease by same %:** Net loss = x²/100
4. **If A is x% more than B:** B is (100x)/(100+x)% less than A
5. **If price increases by x%:** Consumption reduce by (100x)/(100+x)% for same expense
6. **Population after n years:** P(1+r/100)ⁿ

**Common Fractions:**
• 1/2 = 50%, 1/3 = 33.33%, 1/4 = 25%
• 1/5 = 20%, 1/6 = 16.67%, 1/7 = 14.28%
• 1/8 = 12.5%, 1/9 = 11.11%, 1/10 = 10%
• 1/11 = 9.09%, 1/12 = 8.33%`,
      },
      {
        title: 'Profit, Loss & Discount',
        content: `**Formulas:**
• Profit = SP - CP (when SP > CP)
• Loss = CP - SP (when CP > SP)
• Profit% = (Profit/CP) × 100
• Loss% = (Loss/CP) × 100
• SP = CP × (100 + P%)/100
• SP = CP × (100 - L%)/100
• CP = SP × 100/(100 + P%)
• CP = SP × 100/(100 - L%)

**Discount:**
• Discount = MP - SP
• Discount% = (Discount/MP) × 100
• SP = MP × (100 - D%)/100
• Successive discounts a% and b% = a + b - ab/100

**Tricks:**
• If CP of x articles = SP of y articles:
  Profit/Loss% = (x-y)/y × 100
• Two items sold at same SP, one at x% profit, other at x% loss:
  Always LOSS = x²/100%`,
      },
      {
        title: 'Time, Speed & Distance',
        content: `**Basic Formulas:**
• Speed = Distance/Time
• Distance = Speed × Time
• Time = Distance/Speed
• Avg Speed = Total Distance/Total Time

**Relative Speed:**
• Same direction: |S₁ - S₂|
• Opposite direction: S₁ + S₂

**Train Problems:**
• Crossing pole/man: Time = Length/Speed
• Crossing platform/bridge: Time = (Train + Platform)/Speed
• Crossing another train: Time = (L₁ + L₂)/Relative Speed

**Boat & Stream:**
• Downstream: S_b + S_s
• Upstream: S_b - S_s
• Speed of boat = (Down + Up)/2
• Speed of stream = (Down - Up)/2

**Unit Conversions:**
• 1 km/hr = 5/18 m/s
• 1 m/s = 18/5 km/hr
• 1 hr = 60 min = 3600 sec`,
      },
      {
        title: 'Geometry & Mensuration - Formulas',
        content: `**2D Shapes:**
• Triangle: Area = ½×b×h = √[s(s-a)(s-b)(s-c)]
  Equilateral: √3/4 × a²
• Rectangle: Area = l×b, Perimeter = 2(l+b)
• Square: Area = a², Perimeter = 4a, Diagonal = a√2
• Circle: Area = πr², Circumference = 2πr
• Parallelogram: Area = b×h
• Trapezium: Area = ½×(a+b)×h
• Rhombus: Area = ½×d₁×d₂

**3D Shapes:**
• Cube: Vol = a³, TSA = 6a², Diagonal = a√3
• Cuboid: Vol = l×b×h, TSA = 2(lb+bh+hl)
• Cylinder: Vol = πr²h, CSA = 2πrh, TSA = 2πr(r+h)
• Cone: Vol = ⅓πr²h, CSA = πrl, TSA = πr(r+l)
• Sphere: Vol = ⁴/₃πr³, SA = 4πr²
• Hemisphere: Vol = ⅔πr³, TSA = 3πr²

**Pythagorean Triplets:**
(3,4,5), (5,12,13), (7,24,25), (8,15,17), (9,40,41)`,
      },
      {
        title: 'Data Interpretation - Quick Tips',
        content: `**Table/Chart Reading:**
1. Read title, units, footnotes first
2. Check what's asked before calculating
3. Use approximation when options far apart
4. Look for patterns/trends

**Common Calculations:**
• Percentage share = (Part/Total) × 100
• Growth rate = (Current-Previous)/Previous × 100
• Average = Sum/Count
• Ratio = Value1:Value2 (simplify)

**Shortcuts:**
• 10% = move decimal left once
• 5% = half of 10%
• 1% = move decimal left twice
• 25% = ¼, 50% = ½, 75% = ¾
• 33.33% = ⅓, 66.67% = ⅔

**Pie Chart:** Angle = (Value/Total) × 360°
**Bar/Line:** Compare heights/lengths visually first`,
      },
    ],
  },
  'English Comprehension': {
    icon: '📝',
    color: 'from-orange-500 to-red-500',
    sections: [
      {
        title: 'Grammar - Error Spotting Rules',
        content: `**Subject-Verb Agreement:**
• Singular subject → Singular verb (is, has, does)
• Plural subject → Plural verb (are, have, do)
• Each/Every/Everyone/Neither/Either → Singular
• A number of → Plural, The number of → Singular
• Collective nouns: Team, Jury, Committee → Singular (usually)

**Tenses:**
• Present Simple: Habitual actions, facts
• Present Continuous: Happening now
• Present Perfect: Completed with present relevance
• Past Simple: Completed past action
• Past Continuous: Was happening at specific past time
• Future: Will/Shall + V1, Going to + V1

**Common Errors:**
• Between → Two persons; Among → More than two
• Less → Uncountable; Fewer → Countable
• Much → Uncountable; Many → Countable
• Who → Subject; Whom → Object
• That → Defining clause; Which → Non-defining`,
      },
      {
        title: 'Vocabulary - High Frequency Words',
        content: `**Important Synonyms/Antonyms:**

**Synonyms:**
• Abandon ↔ Forsake, Desert
• Abundant ↔ Plentiful, Ample
• Adverse ↔ Unfavorable, Hostile
• Benevolent ↔ Kind, Generous
• Candid ↔ Frank, Honest
• Deplete ↔ Exhaust, Reduce
• Ephemeral ↔ Transient, Fleeting
• Facilitate ↔ Ease, Assist
• Gratify ↔ Please, Satisfy
• Hostile ↔ Unfriendly, Adverse
• Impartial ↔ Unbiased, Fair
• Jeopardize ↔ Endanger, Risk
• Knack ↔ Skill, Aptitude
• Lethargic ↔ Sluggish, Lazy
• Meticulous ↔ Careful, Precise

**Antonyms:**
• Abundant × Scarce
• Benevolent × Malevolent
• Candid × Deceptive
• Deplete × Replenish
• Ephemeral × Permanent
• Facilitate × Hinder
• Hostile × Friendly
• Impartial × Biased
• Jeopardize × Safeguard
• Lethargic × Energetic
• Meticulous × Careless`,
      },
      {
        title: 'Idioms & Phrases - Most Asked',
        content: `**Frequently Asked in SSC:**
1. **A blessing in disguise** - Good thing that seemed bad at first
2. **A dime a dozen** - Very common, not special
3. **Beat around the bush** - Avoid main topic
4. **Bite the bullet** - Face difficult situation bravely
5. **Break the ice** - Start conversation in awkward situation
6. **Burn the midnight oil** - Work late into night
7. **Call it a day** - Stop working for the day
8. **Cost an arm and a leg** - Very expensive
9. **Cut corners** - Do something poorly to save time/money
10. **Hit the nail on the head** - Exactly right
11. **Piece of cake** - Very easy
12. **Pull someone's leg** - Joke/tease
13. **See eye to eye** - Agree completely
14. **Under the weather** - Feeling sick
15. **Once in a blue moon** - Very rarely`,
      },
      {
        title: 'One Word Substitution',
        content: `**Most Important for SSC:**
• One who knows many languages → **Polyglot**
• One who walks on foot → **Pedestrian**
• One who hates mankind → **Misanthrope**
• One who loves books → **Bibliophile**
• One who collects stamps → **Philatelist**
• One who collects coins → **Numismatist**
• One who believes in God → **Theist**
• One who doesn't believe in God → **Atheist**
• One who is present everywhere → **Omnipresent**
• One who knows everything → **Omniscient**
• One who has power to do anything → **Omnipotent**
• Government by one → **Monarchy**
• Government by few → **Oligarchy**
• Government by people → **Democracy**
• Government by officials → **Bureaucracy**
• Life history written by self → **Autobiography**
• Life history written by other → **Biography**
• Words written on tombstone → **Epitaph**
• Fear of water → **Hydrophobia**
• Fear of heights → **Acrophobia**
• Fear of closed spaces → **Claustrophobia**`,
      },
    ],
  },
  'Current Affairs': {
    icon: '📰',
    color: 'from-indigo-500 to-purple-500',
    sections: [
      {
        title: '2024-25 Key Events (For SSC CGL)',
        content: `**National:**
• General Elections 2024: 18th Lok Sabha
• New Criminal Laws (July 2024): BNS, BNSS, BSA replaced IPC, CrPC, Evidence Act
• Women's Reservation Act (106th Amendment): 33% seats for women
• PM Vishwakarma Scheme: Traditional artisans support
• PM-Surya Ghar: Free electricity (300 units) via rooftop solar
• Viksit Bharat 2047 vision document

**International:**
• G20 Summit 2023: New Delhi Declaration
• BRICS Expansion (2024): Egypt, Ethiopia, Iran, UAE joined
• COP28 UAE: Loss & Damage Fund operationalized
• India-Middle East-Europe Economic Corridor (IMEC)
• Global South Summit (Voice of Global South)

**Economy:**
• GDP Growth FY24: ~7.6% (est.)
• RBI Repo Rate: 6.5% (unchanged since Feb 2023)
• UPI Transactions: Crossed 100 billion/year
• India's Forex Reserves: ~$650+ billion
• GST Collections: Consistently >₹1.5 lakh crore/month

**Science & Tech:**
• Chandrayaan-3: Successful moon landing (Aug 2023)
• Aditya-L1: Solar mission launched (Sep 2023)
• Gaganyaan: First test flight (2024)
• 5G Rollout: Nationwide coverage
• AI Mission: ₹10,372 crore approved`,
      },
      {
        title: 'Important Days & Themes',
        content: `**January:**
• 12: National Youth Day (Swami Vivekananda)
• 15: Army Day
• 24: National Girl Child Day
• 25: National Voters Day
• 26: Republic Day
• 30: Martyrs' Day

**February:**
• 4: World Cancer Day
• 13: World Radio Day
• 20: World Day of Social Justice
• 28: National Science Day (CV Raman)

**March:**
• 8: International Women's Day
• 15: World Consumer Rights Day
• 21: World Forestry Day
• 22: World Water Day
• 23: World Meteorological Day
• 24: World TB Day

**April:**
• 7: World Health Day
• 18: World Heritage Day
• 21: Civil Services Day
• 22: Earth Day
• 24: Panchayati Raj Day

**May:**
• 1: Labour Day
• 3: Press Freedom Day
• 8: Red Cross Day
• 11: National Technology Day
• 17: World Telecommunication Day
• 21: Anti-Terrorism Day
• 31: Anti-Tobacco Day`,
      },
      {
        title: 'Awards & Honors 2024',
        content: `**Bharat Ratna (2024):**
• Karpoori Thakur (Posthumous)
• L.K. Advani
• P.V. Narasimha Rao (Posthumous)
• Chaudhary Charan Singh (Posthumous)
• M.S. Swaminathan (Posthumous)

**Padma Awards 2024:**
• Padma Vibhushan: 5 recipients
• Padma Bhushan: 17 recipients
• Padma Shri: 110 recipients

**Nobel Prizes 2023 (Awarded 2024):**
• Physics: Pierre Agostini, Ferenc Krausz, Anne L'Huillier (Attosecond pulses)
• Chemistry: Moungi Bawendi, Louis Brus, Alexei Ekimov (Quantum dots)
• Medicine: Katalin Karikó, Drew Weissman (mRNA vaccines)
• Literature: Jon Fosse
• Peace: Narges Mohammadi (Iran women's rights)
• Economics: Claudia Goldin (Women's labor market)

**Sports 2024:**
• Paris Olympics 2024: India - 6 medals (1 Silver, 5 Bronze)
• T20 World Cup 2024: India Champions (defeated SA)
• Asian Games 2023 (held 2023): India 4th - 107 medals`,
      },
    ],
  },
};

export default function GuideNotes() {
  const { customNotes, setCustomNote, removeCustomNote } = useStore();
  const [selectedSubject, setSelectedSubject] = useState('General Awareness');
  const [expandedSections, setExpandedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiApiKeyInput, setAiApiKeyInput] = useState('');
  const [aiKeySaved, setAiKeySaved] = useState(false);
  const [savedKeys, setSavedKeys] = useState([]);
  const [activeKeyId, setActiveKeyId] = useState(null);
  const [folderNotes, setFolderNotes] = useState(null); // subjects loaded from content/guide-notes
  const [notesSource, setNotesSource] = useState('builtin'); // 'builtin' | 'folder' | 'mixed'
  const [ttsSection, setTtsSection] = useState(null);

  // Merge built-in notes with folder notes (folder subjects that aren't built-in are added)
  const allSubjects = useMemo(() => {
    const map = {};
    Object.keys(GUIDE_NOTES).forEach((k) => {
      map[k] = { ...GUIDE_NOTES[k], builtin: true };
    });
    if (Array.isArray(folderNotes)) {
      folderNotes.forEach((s) => {
        if (map[s.name]) {
          // Merge sections from folder into existing built-in subject
          map[s.name].sections = [...map[s.name].sections, ...s.sections];
          map[s.name].totalMCQs = (map[s.name].totalMCQs || 0) + (s.totalMCQs || 0);
        } else {
          map[s.name] = { icon: s.icon, color: s.color, sections: s.sections, builtin: false, totalMCQs: s.totalMCQs || 0 };
        }
      });
    }
    return map;
  }, [folderNotes]);

  const subjects = Object.keys(allSubjects);
  const subjectData = allSubjects[selectedSubject] || { icon: '📘', color: 'from-blue-500 to-cyan-500', sections: [] };

  // Load saved AI notes topic + saved API keys from shared storage
  const aiNotes = Object.keys(customNotes).filter((k) => k.startsWith('ai-note-'));

  useEffect(() => {
    try {
      const keys = JSON.parse(localStorage.getItem('ai-keys') || '[]');
      setSavedKeys(keys);
      const active = localStorage.getItem('ai-active-key');
      setActiveKeyId(active && keys.some((k) => k.id === active) ? active : keys.length > 0 ? keys[0].id : null);
    } catch (e) {
      setSavedKeys([]);
    }
  }, []);

  // Load rich notes from content/guide-notes (markdown files served by the server)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/guide-notes');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.subjects) && data.subjects.length > 0) {
          setFolderNotes(data.subjects);
          setNotesSource(data.subjects.some((s) => Object.prototype.hasOwnProperty.call(GUIDE_NOTES, s.name)) ? 'mixed' : 'folder');
        }
      } catch (e) {
        // fall back to built-in notes silently
        setFolderNotes(null);
      }
    })();
  }, []);

  const getActiveKey = () => {
    return savedKeys.find((k) => k.id === activeKeyId) || savedKeys[0] || null;
  };
  const savedAiKey = getActiveKey()?.key || '';

  const toggleSection = (sectionTitle) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const filteredSections = subjectData.sections.filter((section) =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateAiNotes = async () => {
    const topic = aiTopic.trim();
    if (!topic) {
      alert('Enter a topic to generate notes for.');
      return;
    }
    const apiKey = aiApiKeyInput.trim() || getActiveKey()?.key || '';
    if (!apiKey) {
      alert('Add your AI API key in the ⚙️ settings first.');
      return;
    }
    if (aiApiKeyInput.trim()) {
      // Save the new key into the shared multi-key storage
      const keys = JSON.parse(localStorage.getItem('ai-keys') || '[]');
      const entry = { id: crypto.randomUUID(), name: `${getProviderName(getActiveKey()?.provider || 'nemotron')} Key ${keys.length + 1}`, key: aiApiKeyInput.trim(), provider: getActiveKey()?.provider || 'nemotron' };
      keys.push(entry);
      localStorage.setItem('ai-keys', JSON.stringify(keys));
      localStorage.setItem('ai-active-key', entry.id);
      setSavedKeys(keys);
      setActiveKeyId(entry.id);
      setAiKeySaved(true);
      setAiApiKeyInput('');
    }

    const noteKey = `ai-note-${selectedSubject}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    setAiGenerating(true);
    setAiProgress({ label: `Generating detailed notes on "${topic}"...` });
    try {
      const provider = getActiveKey()?.provider || 'nemotron';
      const response = await fetch('/api/ai/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: selectedSubject, topic, apiKey: getActiveKey()?.key || apiKey, provider }),
      });
      const data = await response.json();
      if (data.success) {
        setCustomNote(noteKey, {
          topic,
          subject: selectedSubject,
          content: data.notes,
          createdAt: new Date().toISOString(),
        });
        alert('✅ Detailed notes generated and saved! They appear under "My AI Notes" below.');
      } else {
        alert(data.error || 'Failed to generate notes');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setAiGenerating(false);
      setAiProgress(null);
    }
  };

  const myAiNotesForSubject = aiNotes
    .map((key) => ({ key, ...customNotes[key] }))
    .filter((n) => n.subject === selectedSubject);

  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Study Guide Notes</h1>
            <p className="text-gray-600 dark:text-gray-400">Quick revision notes for SSC CGL Tier-I</p>
          </div>
        </div>

        {/* Subject Selector */}
        <div className="glass-card p-3 mb-6 animate-fade-in stagger-1 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedSubject === subject
                    ? `bg-gradient-to-r ${allSubjects[subject].color} text-white shadow-lg`
                    : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span>{allSubjects[subject].icon}</span> {subject}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="glass-card p-4 mb-6 animate-fade-in stagger-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search within notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* AI Notes Generator */}
        <div className="glass-card-hover p-5 mb-6 animate-fade-in stagger-3 border-primary-200 dark:border-primary-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-2xl">🤖</span> AI Detailed Notes Generator
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate deep, exam-focused notes for any topic and save them to your guide
              </p>
            </div>
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="btn-primary text-sm py-2 px-4"
            >
              {showAiPanel ? '✖️ Close' : '✨ Generate Notes'}
            </button>
          </div>

          {showAiPanel && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-800/50 rounded-xl border border-gray-200 dark:border-gray-700 animate-slide-down">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Topic</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder={`e.g., ${selectedSubject === 'General Awareness' ? 'Indian Polity - Fundamental Rights' : 'Percentage - Shortcuts'}`}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="input-field"
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>{allSubjects[s].icon} {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="label-text flex items-center gap-2">
                  🔑 AI API Key
                  {getActiveKey() ? (
                    <span className="badge badge-success">Using "{getActiveKey().name}" ({getProviderName(getActiveKey().provider)})</span>
                  ) : savedAiKey ? (
                    <span className="badge badge-success">Saved on device ✓</span>
                  ) : null}
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    value={aiApiKeyInput}
                    onChange={(e) => setAiApiKeyInput(e.target.value)}
                    placeholder={savedAiKey ? 'Key already saved (leave blank to reuse)' : 'Enter a new key to save...'}
                    className="input-field flex-1"
                    autoComplete="off"
                  />
                  <button
                    onClick={generateAiNotes}
                    disabled={aiGenerating}
                    className="btn-primary py-2 px-5 whitespace-nowrap"
                  >
                    {aiGenerating ? 'Generating...' : '🚀 Generate Detailed Notes'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  🔒 Keys are saved only on your device and sent directly to the AI provider. Manage multiple named keys (add / remove / switch) in the Question Bank ⚙️ settings — the active key is reused here. {aiKeySaved && <span className="text-green-600 font-medium">Key saved!</span>}
                </p>
              </div>

              {aiProgress && (
                <div className="mt-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-sm text-primary-700 dark:text-primary-300 animate-slide-down">
                  ⏳ {aiProgress.label}
                </div>
              )}
            </div>
          )}
        </div>

        {/* My AI Notes */}
        {myAiNotesForSubject.length > 0 && (
          <div className="mb-6 animate-fade-in stagger-3">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <span>📘</span> My AI Notes ({selectedSubject})
            </h2>
            <div className="space-y-4">
              {myAiNotesForSubject.map((note) => {
                const isExpanded = expandedSections[note.key];
                return (
                  <div key={note.key} className="glass-card-hover overflow-hidden border-primary-300 dark:border-primary-700">
                    <button
                      onClick={() => toggleSection(note.key)}
                      className="w-full p-5 flex items-center justify-between gap-4 text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br {subjectData.color}">
                          <span className="text-lg">✨</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{note.topic}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            AI-generated • {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this AI note?')) { removeCustomNote(note.key); } }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          aria-label="Delete note"
                        >
                          🗑️
                        </button>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 animate-slide-down border-t border-gray-100 dark:border-gray-700 max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                          {note.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes Content */}
        <h2 className="section-title mb-4 flex items-center gap-2 animate-fade-in">
          <span>📖</span> Study Notes
          {notesSource === 'folder' && <span className="badge badge-success text-xs">Rich content • {subjects.length} subjects</span>}
          {notesSource === 'mixed' && <span className="badge badge-success text-xs">Built-in + Rich content</span>}
        </h2>
        <div className="space-y-4 animate-fade-in stagger-4">
          {filteredSections.map((section) => {
            const isExpanded = expandedSections[section.title];
            return (
              <div key={section.title} className="glass-card-hover overflow-hidden">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br {subjectData.color}">
                      <span className="text-lg">{subjectData.icon}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 animate-slide-down border-t border-gray-100 dark:border-gray-700 prose prose-sm dark:prose-invert max-w-none">
                    <div className="flex justify-end mb-3 pt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ttsSection === section.title) { stopSpeech(); setTtsSection(null); }
                          else { setTtsSection(section.title); speakText(section.content); }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${ttsSection === section.title ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-200'}`}
                      >
                        {ttsSection === section.title ? '⏹️ Stop' : '🔊 Read Aloud'}
                      </button>
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none markdown-body text-gray-700 dark:text-gray-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Reference Card */}
        <div className="mt-8 glass-card p-6 animate-fade-in stagger-4">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <span>⚡</span> Quick Reference Formulas
          </h2>
          <QuickFormulas subject={selectedSubject} />
        </div>
      </main>
    </div>
  );
}

function QuickFormulas({ subject }) {
  const formulas = {
    'General Awareness': [
      { name: 'Fundamental Rights', formula: 'Articles 12-35 (6 categories)' },
      { name: 'Directive Principles', formula: 'Articles 36-51' },
      { name: 'Preamble Keywords', formula: 'Sovereign, Socialist, Secular, Democratic, Republic, Justice, Liberty, Equality, Fraternity' },
      { name: 'Parliament', formula: 'Lok Sabha (552) + Rajya Sabha (250) + President' },
    ],
    'Reasoning': [
      { name: 'Alphabet Positions', formula: 'A=1, B=2... Z=26 | Reverse: A=26... Z=1' },
      { name: 'Opposite Letters', formula: 'Sum = 27 (A+Z, B+Y, C+X...)' },
      { name: 'Series Differences', formula: 'Check: ±n, ×n, n², n³, prime, alternate' },
      { name: 'Blood Relations', formula: '+2: Grandparents | +1: Parents/Uncles | 0: Self/Siblings | -1: Children | -2: Grandchildren' },
    ],
    'Quantitative Aptitude': [
      { name: 'Percentage Change', formula: 'x% then y% = x + y + xy/100' },
      { name: 'Profit/Loss %', formula: 'P% = (P/CP)×100 | L% = (L/CP)×100' },
      { name: 'Avg Speed (equal dist)', formula: '2ab/(a+b) | (equal time): (a+b)/2' },
      { name: 'CI - SI (2 years)', formula: 'Diff = P×(R/100)²' },
      { name: 'Train Crossing', formula: 'Pole: L/S | Platform: (L+P)/S | Train: (L₁+L₂)/Relative S' },
    ],
    'English Comprehension': [
      { name: 'Active → Passive', formula: 'Object + be + V3 + by + Subject' },
      { name: 'Direct → Indirect', formula: 'Tense backshift | Pronoun change | Time/Place change' },
      { name: 'Error Spotting', formula: 'S-V agreement | Tense | Preposition | Article | Parallelism' },
      { name: 'Cloze Test', formula: 'Read full passage | Context clues | Grammar fit | Eliminate options' },
    ],
    'Current Affairs': [
      { name: 'Key 2024 Acts', formula: 'BNS, BNSS, BSA (Criminal Laws) | Women Reservation (106th)' },
      { name: 'Economy Targets', formula: 'GDP ~7% | Repo 6.5% | GST >1.5L cr/mo | Forex >$650B' },
      { name: 'Space Missions', formula: 'Chandrayaan-3 ✓ | Aditya-L1 ✓ | Gaganyaan (test) | SPADEX' },
      { name: 'Summits', formula: 'G20 India 2023 | BRICS expansion | COP28 UAE | IMEC corridor' },
    ],
  };

  const subjectFormulas = formulas[subject] || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {subjectFormulas.map((f, i) => (
        <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-dark-800/50 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{f.name}</h4>
          <p className="text-sm font-mono text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 p-2 rounded">{f.formula}</p>
        </div>
      ))}
    </div>
  );
}
