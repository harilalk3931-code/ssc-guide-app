import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import * as cheerio from 'cheerio';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fetch and parse questions from Notopedia
app.get('/api/notopedia/questions', async (req, res) => {
  try {
    const { url } = req.query;
    const targetUrl = url || process.env.NOTOPEDIA_URL || 'https://www.notopedia.com/sarkari-job-exams/SSC-CGL-%3E/Tier-I/5/32/200302/35/142/Tier-I';

    const questions = await fetchNotopediaQuestions(targetUrl);
    res.json({ success: true, questions, count: questions.length });
  } catch (error) {
    console.error('Notopedia fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions from Notopedia',
      details: error.message,
    });
  }
});

// Generate questions with Nemotron API
app.post('/api/nemotron/generate', async (req, res) => {
  try {
    const { category, difficulty, count, apiKey } = req.body;

    if (!category || !difficulty || !count) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: category, difficulty, count',
      });
    }

    const nemotronKey = apiKey || process.env.NEMOTRON_API_KEY;
    if (!nemotronKey) {
      return res.status(500).json({
        success: false,
        error: 'Nemotron API key not configured',
      });
    }

    const questions = await generateQuestionsWithNemotron(category, difficulty, count, nemotronKey);

    res.json({ success: true, questions, count: questions.length });
  } catch (error) {
    console.error('Nemotron generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate questions with Nemotron',
      details: error.message,
    });
  }
});

// Generate detailed guide notes with Nemotron API
app.post('/api/nemotron/notes', async (req, res) => {
  try {
    const { subject, topic, apiKey } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: subject, topic',
      });
    }

    const nemotronKey = apiKey || process.env.NEMOTRON_API_KEY;
    if (!nemotronKey) {
      return res.status(500).json({
        success: false,
        error: 'Nemotron API key not configured',
      });
    }

    const notes = await generateDetailedNotes(subject, topic, nemotronKey);

    res.json({ success: true, notes, subject, topic });
  } catch (error) {
    console.error('Nemotron notes generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate notes with Nemotron',
      details: error.message,
    });
  }
});

// Get SSC CGL syllabus structure
app.get('/api/syllabus', (req, res) => {
  const syllabus = {
    'General Awareness': [
      'Current Affairs (National & International)',
      'Indian History (Ancient, Medieval, Modern)',
      'Geography (Physical, Indian, World)',
      'Indian Polity & Constitution',
      'Indian Economy',
      'General Science (Physics, Chemistry, Biology)',
      'Environment & Ecology',
      'Books & Authors',
      'Awards & Honors',
      'Sports',
      'Important Days & Dates',
    ],
    'Reasoning': [
      'Analogies',
      'Classification',
      'Series Completion',
      'Coding-Decoding',
      'Blood Relations',
      'Direction Sense Test',
      'Syllogism',
      'Puzzles & Seating Arrangement',
      'Venn Diagrams',
      'Non-Verbal Reasoning',
      'Statement & Arguments',
      'Statement & Conclusions',
    ],
    'Quantitative Aptitude': [
      'Number System',
      'Simplification & Approximation',
      'Percentage',
      'Ratio & Proportion',
      'Average',
      'Profit & Loss',
      'Simple & Compound Interest',
      'Time & Work',
      'Time, Speed & Distance',
      'Mixture & Alligation',
      'Partnership',
      'Algebra',
      'Geometry',
      'Mensuration',
      'Trigonometry',
      'Data Interpretation',
    ],
    'English Comprehension': [
      'Reading Comprehension',
      'Cloze Test',
      'Error Detection',
      'Sentence Improvement',
      'Fill in the Blanks',
      'Para Jumbles',
      'Vocabulary (Synonyms, Antonyms, Idioms)',
      'One Word Substitution',
      'Spelling Test',
      'Active/Passive Voice',
      'Direct/Indirect Speech',
    ],
  };

  res.json({ success: true, syllabus });
});

// --- Notopedia Scraper ---
async function fetchNotopediaQuestions(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const html = await response.text();
  return parseNotopediaHTML(html);
}

function parseNotopediaHTML(html) {
  const $ = cheerio.load(html);

  const questions = [];
  const seen = new Set();

  const pushQuestion = (q) => {
    if (!q.question || q.options.length < 2) return;
    const key = q.question.toLowerCase().slice(0, 80);
    if (seen.has(key)) return;
    seen.add(key);
    questions.push(q);
  };

  // Strategy 1: Look for structured question blocks with options
  $('div, section, article, li').each((i, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (!text || text.length < 40) return;

    // Skip huge blocks
    if (text.length > 3000) return;

    const questionMatch = text.match(/^[\d.()\s]*([^\n]+?\?)/);
    if (!questionMatch) return;

    // Find options within this element - look for A/B/C/D patterns
    const optionMatches = text.match(/(?:^|\n)\s*(?:\(?[a-dA-D]\)?|[a-dA-D][.\.)])\s*(.+?)(?=(?:\n\s*(?:\(?[a-dA-D]\)?|[a-dA-D][.\.)])\s*)|$)/gs);

    if (!optionMatches || optionMatches.length < 4) return;

    const options = optionMatches
      .map((m) => m.replace(/^\s*(?:\(?[a-dA-D]\)?|[a-dA-D][.\.)])\s*/, '').trim())
      .filter((o) => o);

    if (options.length < 4) return;

    const question = questionMatch[1].replace(/^\d+[.)]\s*/, '').trim();

    // Try to find answer - look for patterns like "Answer: X" or correct answer marker
    const answerMatch = text.match(/(?:Answer|Ans|Correct Answer)\s*[:\-]?\s*(?:\(?([a-dA-D])\)?|(.+))/i);
    const answerText = answerMatch ? answerMatch[1]?.trim() : null;
    const answer = answerText
      ? options[answerText.toLowerCase().charCodeAt(0) - 97]
      : null;

    pushQuestion({
      id: `notopedia-${i}-${questions.length}`,
      question,
      options,
      answer: answer || options[0],
      explanation: 'Source: Notopedia SSC CGL Tier-I Sample Paper',
      source: 'notopedia',
      topic: extractTopic(question),
      difficulty: 'medium',
    });
  });

  // Strategy 2: Fallback - look for numbered questions followed by option-like lines
  if (questions.length === 0) {
    const blocks = html
      .split(/\n{2,}/)
      .map((b) => cheerio.load(b).text().trim())
      .filter((b) => b.length > 10);

    blocks.forEach((block, i) => {
      const questionMatch = block.match(/^\s*\d+[.)]\s*([^\n]+?\?)/);
      if (!questionMatch) return;

      const optionMatches = block.match(/(?:^|\n)\s*(?:\(?[a-dA-D]\)?|[a-dA-D][.\.)])\s*([^\n]+)/g);
      if (!optionMatches || optionMatches.length < 4) return;

      const options = optionMatches.map((m) => m.replace(/^\s*(?:\(?[a-dA-D]\)?|[a-dA-D][.\.)])\s*/, '').trim());
      const question = questionMatch[1].replace(/^\d+[.)]\s*/, '').trim();

      pushQuestion({
        id: `notopedia-fallback-${i}`,
        question,
        options: options.slice(0, 4),
        answer: options[0],
        explanation: 'Source: Notopedia SSC CGL Tier-I',
        source: 'notopedia',
        topic: extractTopic(question),
        difficulty: 'medium',
      });
    });
  }

  // If parsing still fails, return curated sample questions so the app always has content
  if (questions.length === 0) {
    return getFallbackQuestions();
  }

  return questions;
}

function extractTopic(questionText) {
  const topics = {
    'current-affairs': ['current affair', 'news', 'recent', 'appointment', 'award', 'summit', 'minister', 'scheme'],
    'history': ['history', 'ancient', 'medieval', 'modern', 'battle', 'dynasty', 'emperor', 'freedom', 'independence', 'mohan', 'gandhi', 'nehru'],
    'geography': ['geography', 'river', 'mountain', 'state', 'capital', 'climate', 'soil', 'agriculture', 'mineral', 'coast'],
    'polity': ['polity', 'constitution', 'article', 'amendment', 'parliament', 'president', 'supreme court', 'fundamental right', 'governor'],
    'economy': ['economy', 'gdp', 'inflation', 'budget', 'tax', 'bank', 'rbi', 'finance', 'market', 'trade', 'fiscal'],
    'science': ['science', 'physics', 'chemistry', 'biology', 'space', 'isro', 'drdo', 'technology', 'invention', 'discovery', 'study'],
    'reasoning': ['analogy', 'series', 'coding', 'decoding', 'blood relation', 'direction', 'syllogism', 'puzzle', 'pattern', 'odd'],
    'quant': ['percentage', 'ratio', 'average', 'profit', 'loss', 'interest', 'time', 'work', 'distance', 'speed', 'number', 'simplification', 'area', 'volume'],
    'english': ['grammar', 'vocabulary', 'comprehension', 'cloze', 'error', 'sentence', 'fill', 'blank', 'synonym', 'antonym', 'spelling'],
  };

  const lowerText = ` ${questionText.toLowerCase()} `;
  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return topic;
    }
  }
  return 'general-awareness';
}

// --- Nemotron API Integration ---
async function generateQuestionsWithNemotron(category, difficulty, count, apiKey) {
  const difficultyMap = {
    easy: 'Basic recall of facts, straightforward questions with obvious distractors',
    medium: 'Require moderate understanding, including connections between concepts, with plausible distractors',
    hard: 'In-depth analysis, nuanced details, or application-based questions, with closely related distractors that test deep knowledge',
  };

  const prompt = `
Generate ${count} multiple-choice questions for SSC CGL Tier-I exam preparation on ${category}.
Difficulty: ${difficulty} - ${difficultyMap[difficulty] || difficultyMap.medium}

Requirements:
- Each question must have exactly 4 options
- One correct answer that exactly matches one option
- Detailed explanation (2-3 sentences) for each question
- Questions should be India-centric and relevant to SSC CGL exam pattern
- For Current Affairs: Use events up to 2024
- For Static GK: Focus on Indian History, Geography, Polity, Economy, Science
- Make questions clear, concise, and unambiguous
- Distractors must be plausible based on common misconceptions

Return ONLY a valid JSON array in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "explanation": "Explanation why Option A is correct and others are not."
  }
]
`;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra',
      messages: [
        { role: 'system', content: 'You are an expert SSC CGL exam question generator. Generate high-quality, exam-oriented multiple choice questions in valid JSON format only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Nemotron API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Nemotron response');
  }

  const questions = JSON.parse(jsonMatch[0]);

  return questions.map((q, i) => ({
    ...q,
    id: `nemotron-${Date.now()}-${i}`,
    source: 'nemotron',
    category,
    difficulty,
  }));
}

// --- Generate detailed study notes with Nemotron ---
async function generateDetailedNotes(subject, topic, apiKey) {
  const prompt = `
You are an expert SSC CGL Tier-I exam mentor. Write DEEP, detailed, exam-focused study notes for the following topic.

Subject: ${subject}
Topic: ${topic}

Requirements:
- Write at least 1500-2000 words of comprehensive, accurate notes
- Cover ALL key concepts, definitions, formulas, dates, names, and facts
- Include exam-specific high-yield points that frequently appear in SSC CGL
- Use clear headings and bullet points
- Add a "Trick to Remember" or mnemonic section
- Add a "Common Mistakes" section
- Add 5 quick revision MCQs at the end with answers
- Write ONLY the notes text (plain text with markdown headings/bullets). No preamble, no JSON.

Structure the notes exactly like this:
# ${topic} - Detailed Notes

## Overview
...

## Key Concepts
...

## Important Facts & Figures
...

## Formulas / Rules (if applicable)
...

## Trick to Remember
...

## Common Mistakes
...

## Quick Revision MCQs
1. Question? (a) ... (b) ... (c) ... (d) ...
Answer: ...

Return only the notes text.
`;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra',
      messages: [
        { role: 'system', content: 'You are an expert SSC CGL exam mentor who writes clear, accurate, detailed study notes.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Nemotron API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (!content.trim()) {
    throw new Error('Empty response from Nemotron API');
  }

  return content.trim();
}

// Fallback questions if Notopedia parsing fails (ensures the app always has content)
function getFallbackQuestions() {  const all = [
    // General Awareness
    { topic: 'current-affairs', question: 'Who is the current President of India?', answer: 'Droupadi Murmu', options: ['Ram Nath Kovind', 'Droupadi Murmu', 'Pranab Mukherjee', 'L.K. Advani'], difficulty: 'easy', explanation: 'Droupadi Murmu was sworn in as the 15th President of India on 25 July 2022.' },
    { topic: 'polity', question: 'Article 21 of the Indian Constitution deals with which right?', answer: 'Protection of life and personal liberty', options: ['Right to equality', 'Protection of life and personal liberty', 'Right to freedom of religion', 'Right to constitutional remedies'], difficulty: 'easy', explanation: 'Article 21 states that no person shall be deprived of his life or personal liberty except according to procedure established by law.' },
    { topic: 'polity', question: 'Which Fundamental Right abolishes untouchability?', answer: 'Article 17', options: ['Article 14', 'Article 15', 'Article 17', 'Article 19'], difficulty: 'medium', explanation: 'Article 17 abolishes untouchability and forbids its practice in any form.' },
    { topic: 'history', question: 'The Quit India Movement was launched in which year?', answer: '1942', options: ['1930', '1935', '1942', '1947'], difficulty: 'easy', explanation: 'The Quit India Movement was launched by Mahatma Gandhi on 8 August 1942 during World War II.' },
    { topic: 'history', question: 'Who founded the Indian National Congress in 1885?', answer: 'A.O. Hume', options: ['A.O. Hume', 'Dadabhai Naoroji', 'Surendranath Banerjee', 'Bal Gangadhar Tilak'], difficulty: 'easy', explanation: 'A.O. Hume, a retired British civil servant, founded the INC in 1885 with help from Indian leaders.' },
    { topic: 'geography', question: 'Which is the longest river in India?', answer: 'Ganga', options: ['Yamuna', 'Brahmaputra', 'Ganga', 'Godavari'], difficulty: 'easy', explanation: 'The Ganga (2,525 km) is the longest river flowing through India.' },
    { topic: 'geography', question: 'The highest peak in India is:', answer: 'Kangchenjunga', options: ['K2', 'Kangchenjunga', 'Nanda Devi', 'Nanga Parbat'], difficulty: 'medium', explanation: 'Kangchenjunga (8,586 m) is the highest peak in India, the third highest in the world.' },
    { topic: 'economy', question: 'Which body is the apex bank of India?', answer: 'Reserve Bank of India', options: ['SBI', 'Reserve Bank of India', 'NABARD', 'SEBI'], difficulty: 'easy', explanation: 'RBI was established in 1935 and nationalized in 1949; it is the central banking institution.' },
    { topic: 'economy', question: 'GST was introduced in India in which year?', answer: '2017', options: ['2014', '2015', '2017', '2019'], difficulty: 'easy', explanation: 'Goods and Services Tax (GST) was rolled out on 1 July 2017, replacing multiple indirect taxes.' },
    { topic: 'science', question: 'Chandrayaan-3 successfully landed near which lunar region?', answer: 'Lunar South Pole', options: ['Lunar North Pole', 'Lunar South Pole', 'Mare Imbrium', 'Mare Tranquillitatis'], difficulty: 'medium', explanation: 'Chandrayaan-3 landed near the lunar South Pole on 23 August 2023, a historic first.' },
    { topic: 'science', question: 'Which gas is most abundant in Earth\'s atmosphere?', answer: 'Nitrogen', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Argon'], difficulty: 'easy', explanation: 'Nitrogen makes up about 78% of Earth\'s atmosphere by volume.' },
    { topic: 'science', question: 'Full form of DNA is:', answer: 'Deoxyribonucleic acid', options: ['Deoxyribonucleic acid', 'Dinucleic acid', 'Deoxyrebonucleic acid', 'Dioxyribonucleic acid'], difficulty: 'easy', explanation: 'DNA stands for Deoxyribonucleic acid, the molecule carrying genetic information.' },
    // Reasoning
    { topic: 'reasoning', question: 'Find the odd one out: 121, 144, 169, 190', answer: '190', options: ['121', '144', '169', '190'], difficulty: 'easy', explanation: '121=11², 144=12², 169=13², but 190 is not a perfect square.' },
    { topic: 'reasoning', question: 'In a certain code, "CAT" is written as "DBU". How is "DOG" written?', answer: 'EPH', options: ['EPH', 'FPH', 'EPI', 'EPG'], difficulty: 'easy', explanation: 'Each letter is shifted forward by 1: C→D, A→B, T→U. So D→E, O→P, G→H → EPH.' },
    { topic: 'reasoning', question: 'Find the next number in the series: 2, 6, 12, 20, 30, ?', answer: '42', options: ['36', '40', '42', '48'], difficulty: 'medium', explanation: 'Pattern: +4, +6, +8, +10, +12. So 30 + 12 = 42.' },
    { topic: 'reasoning', question: 'If A is the father of B, and B is the sister of C, how is C related to A?', answer: 'Son or daughter', options: ['Son', 'Daughter', 'Son or daughter', 'Nephew'], difficulty: 'medium', explanation: 'Since B is sister of C, both are children of A. C could be male or female, so son or daughter.' },
    { topic: 'reasoning', question: 'All cats are animals. Some animals are pets. Which conclusion follows?', answer: 'No definite conclusion', options: ['All cats are pets', 'Some pets are cats', 'No definite conclusion', 'No cats are pets'], difficulty: 'hard', explanation: 'The middle term "animals" is not distributed, so no definite conclusion can be drawn about cats and pets.' },
    // Quant
    { topic: 'quant', question: 'What is 25% of 480?', answer: '120', options: ['100', '110', '120', '130'], difficulty: 'easy', explanation: '25% of 480 = (25/100) × 480 = 120.' },
    { topic: 'quant', question: 'If a shirt costs ₹800 after a 20% discount, find the original price.', answer: '₹1000', options: ['₹1000', '₹960', '₹1040', '₹980'], difficulty: 'medium', explanation: 'Let original = x. 80% of x = 800 → x = 800/0.8 = ₹1000.' },
    { topic: 'quant', question: 'A train 200 m long crosses a pole in 20 seconds. Find its speed.', answer: '36 km/hr', options: ['30 km/hr', '36 km/hr', '40 km/hr', '45 km/hr'], difficulty: 'medium', explanation: 'Speed = 200/20 = 10 m/s = 10 × 18/5 = 36 km/hr.' },
    { topic: 'quant', question: 'Find the average of first 10 natural numbers.', answer: '5.5', options: ['5', '5.5', '6', '4.5'], difficulty: 'easy', explanation: 'Sum 1to 10 = 55; average = 55/10 = 5.5.' },
    { topic: 'quant', question: 'Simple interest on ₹5000 at 10% per annum for 2 years is:', answer: '₹1000', options: ['₹1000', '₹1100', '₹850', '₹900'], difficulty: 'easy', explanation: 'SI = P×R×T/100 = (5000×10×2)/100 = ₹1000.' },
    // English
    { topic: 'english', question: 'Choose the correctly spelled word:', answer: 'Accommodation', options: ['Accomodation', 'Accommodation', 'Acommodation', 'Accomodattion'], difficulty: 'easy', explanation: 'Accommodation has double c and double m.' },
    { topic: 'english', question: 'Synonym of "Benevolent":', answer: 'Kind', options: ['Cruel', 'Kind', 'Stingy', 'Angry'], difficulty: 'easy', explanation: 'Benevolent means well-meaning and kind.' },
    { topic: 'english', question: 'Choose the correct sentence:', answer: 'Neither of them was present.', options: ['Neither of them were present.', 'Neither of them was present.', 'Neither of them is present.', 'Neither of them are present.'], difficulty: 'medium', explanation: 'Neither is singular and takes a singular verb "was".' },
    { topic: 'english', question: 'Idiom "Hit the nail on the head" means:', answer: 'To be exactly right', options: ['To hit something hard', 'To be exactly right', 'To make a mistake', 'To delay work'], difficulty: 'medium', explanation: 'It means to describe exactly what is causing a situation or problem.' },
    { topic: 'english', question: 'One word for "one who writes about his own life":', answer: 'Autobiographer', options: ['Biographer', 'Autobiographer', 'Calligrapher', 'Cartographer'], difficulty: 'medium', explanation: 'Autobiographer writes one\'s own life story; biographer writes another\'s.' },
  ];

  return all.map((q, i) => ({
    id: `fallback-${i}`,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    source: 'notopedia',
    topic: q.topic,
    difficulty: q.difficulty,
  }));
}

// Serve built files in production
if (process.env.NODE_ENV === 'production') {
  const possibleDist = [
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), '..', 'dist'),
  ];
  const distPath = possibleDist.find((p) => fs.existsSync(p));

  if (distPath) {
    app.use(express.static(distPath));

    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Only listen when run directly as the main module (node server.js).
// When imported (e.g. by a serverless function on Vercel), skip app.listen.
const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`✅ Server running on PORT: ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

export default app;