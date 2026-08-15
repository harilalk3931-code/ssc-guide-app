import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

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

// --- Guide Notes (markdown files in content/guide-notes) ---
const NOTES_DIR = path.join(__dirname, 'content', 'guide-notes');

const SUBJECT_META = {
  'history': { name: 'History', icon: '📜', color: 'from-amber-500 to-orange-500' },
  'art-culture': { name: 'Art & Culture', icon: '🎭', color: 'from-pink-500 to-rose-500' },
  'polity': { name: 'Polity', icon: '⚖️', color: 'from-indigo-500 to-blue-500' },
  'geography': { name: 'Geography', icon: '🗺️', color: 'from-green-500 to-teal-500' },
  'economics': { name: 'Economics', icon: '💹', color: 'from-cyan-500 to-sky-500' },
  'science': { name: 'Science', icon: '🔬', color: 'from-violet-500 to-purple-500' },
  'environment': { name: 'Environment', icon: '🌿', color: 'from-emerald-500 to-lime-500' },
  'computer': { name: 'Computer', icon: '💻', color: 'from-slate-500 to-gray-600' },
  'miscellaneous-gk': { name: 'Miscellaneous GK', icon: '📚', color: 'from-fuchsia-500 to-pink-600' },
  'current-affairs': { name: 'Current Affairs', icon: '📰', color: 'from-red-500 to-orange-500' },
  'current-affairs-2026': { name: 'Current Affairs 2026', icon: '📰', color: 'from-red-500 to-orange-500' },
  'science': { name: 'Science', icon: '🔬', color: 'from-violet-500 to-purple-500' },
  'english-grammar': { name: 'English Grammar', icon: '📝', color: 'from-orange-500 to-red-500' },
  'english-comprehension': { name: 'English Comprehension', icon: '📝', color: 'from-orange-500 to-red-500' },
  'english-idioms': { name: 'English Idioms & Phrases', icon: '📝', color: 'from-orange-500 to-red-500' },
  'english-vocabulary': { name: 'English Vocabulary', icon: '📝', color: 'from-orange-500 to-red-500' },
  'english-voice-narration': { name: 'English Voice & Narration', icon: '📝', color: 'from-orange-500 to-red-500' },
  'quant-number-system': { name: 'Quant - Number System', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-arithmetic-1': { name: 'Quant - Arithmetic I', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-arithmetic-2': { name: 'Quant - Arithmetic II', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-interest-work-speed': { name: 'Quant - Interest, Work & Speed', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-algebra': { name: 'Quant - Algebra', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-geometry': { name: 'Quant - Geometry', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-mensuration': { name: 'Quant - Mensuration', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-trigonometry': { name: 'Quant - Trigonometry', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'quant-statistics-di': { name: 'Quant - Statistics & DI', icon: '🔢', color: 'from-green-500 to-emerald-500' },
  'reasoning-verbal': { name: 'Reasoning - Verbal', icon: '🧩', color: 'from-purple-500 to-pink-500' },
  'reasoning-logical': { name: 'Reasoning - Logical', icon: '🧩', color: 'from-purple-500 to-pink-500' },
  'reasoning-arrangement': { name: 'Reasoning - Arrangement', icon: '🧩', color: 'from-purple-500 to-pink-500' },
  'reasoning-analytical': { name: 'Reasoning - Analytical', icon: '🧩', color: 'from-purple-500 to-pink-500' },
  'reasoning-nonverbal': { name: 'Reasoning - Non Verbal', icon: '🧩', color: 'from-purple-500 to-pink-500' },
};

// Parse a guide-notes markdown file into { title, sections: [{ title, content }] }
function parseGuideNotesFile(filename, raw) {
  const lines = raw.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), content: '' };
      continue;
    }
    if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);

  // Strip MCQ practice blocks from note content — guide notes show study material only
  const stripPracticeBlocks = (content) => {
    if (!content) return '';
    return content
      .replace(/\n?###\s+Quick Practice[\s\S]*$/i, '')
      .replace(/\n?\d+\.\s+\*\*[^\n]*\*\*\s*\n(?:\s*-\s+[A-D]\)\s+.+\n?)+/g, '')
      .trim();
  };

  const base = path.basename(filename, '.md').toLowerCase();
  const meta = SUBJECT_META[base] || { name: base, icon: '📘', color: 'from-blue-500 to-cyan-500' };
  return {
    id: base,
    name: meta.name,
    icon: meta.icon,
    color: meta.color,
    sections: sections
      .filter((s) => s.title && s.content.trim())
      .map((s) => ({ ...s, content: stripPracticeBlocks(s.content) })),
    totalMCQs: sections.reduce((acc, s) => acc + (s.content.match(/^\s*- \*\*Answer:/gm) || []).length, 0),
  };
}

app.get('/api/guide-notes', (req, res) => {
  try {
    if (!fs.existsSync(NOTES_DIR)) {
      return res.json({ success: true, subjects: [], source: 'folder' });
    }
    const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith('.md'));
    const subjects = files
      .map((f) => {
        const raw = fs.readFileSync(path.join(NOTES_DIR, f), 'utf8');
        return parseGuideNotesFile(f, raw);
      })
      .filter((s) => s.sections.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, subjects, source: 'folder' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// --- Extract MCQs from markdown files for the question bank ---
function extractMCQsFromMarkdown(filename, content) {
  const base = filename.replace('.md', '');
  const topic = base.toLowerCase().replace(/\s+/g, '-');
  const mcqs = [];
  const blocks = content.split(/\n(?=\d+\.\s+\*\*)/);
  for (const block of blocks) {
    const match = block.match(
      /^\d+\.\s+\*\*(.+?)\*\*\s*\n((?:\s*-\s+[A-D]\)\s+.+\n?)+)\s*-\s+\*\*Answer:\s*([A-D])\*\*\s*\n\s*-\s+Explanation:\s*(.+)/
    );
    if (match) {
      const [, question, optionsBlock, answerLetter, explanation] = match;
      const options = [];
      const optionRegex = /- ([A-D]\)\s+.+)/g;
      let optMatch;
      while ((optMatch = optionRegex.exec(optionsBlock)) !== null) {
        options.push(optMatch[1].replace(/^[A-D]\)\s*/, '').trim());
      }
      if (options.length === 4) {
        const answerIndex = answerLetter.charCodeAt(0) - 65;
        mcqs.push({
          id: `${topic}-${mcqs.length + 1}`,
          question: question.trim(),
          options,
          answer: options[answerIndex] || options[0],
          answerLetter,
          explanation: explanation.trim(),
          topic,
          difficulty: 'medium',
          source: 'dataset',
        });
      }
    }
  }
  return mcqs;
}

let cachedMCQs = null;
function getAllMCQs() {
  if (cachedMCQs) return cachedMCQs;
  const all = [];
  if (fs.existsSync(NOTES_DIR)) {
    const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith('.md'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(NOTES_DIR, f), 'utf8');
      all.push(...extractMCQsFromMarkdown(f, content));
    }
  }
  cachedMCQs = all;
  console.log(`📚 Extracted ${all.length} MCQs from markdown files`);
  return all;
}

app.get('/api/notes-mcqs', (req, res) => {
  try {
    const { topic, difficulty, search, limit } = req.query;
    let mcqs = getAllMCQs();
    if (topic && topic !== 'all') {
      mcqs = mcqs.filter((q) => q.topic === topic);
    }
    if (difficulty && difficulty !== 'all') {
      mcqs = mcqs.filter((q) => q.difficulty === difficulty);
    }
    if (search) {
      const s = search.toLowerCase();
      mcqs = mcqs.filter((q) => q.question.toLowerCase().includes(s) || q.explanation.toLowerCase().includes(s));
    }
    if (limit) {
      mcqs = mcqs.slice(0, parseInt(limit));
    }
    const topics = [...new Set(getAllMCQs().map((q) => q.topic))];
    res.json({ success: true, mcqs, total: getAllMCQs().length, topics });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Content addition helper — shows format and current files
app.get('/api/content-guide', (req, res) => {
  const files = fs.existsSync(NOTES_DIR) ? fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith('.md')) : [];
  res.json({
    success: true,
    currentFiles: files,
    format: `# Subject Name

<!-- icon: 📘 | color: from-blue-500 to-cyan-500 -->

> Brief description of this subject for SSC CGL

## Chapter/Topic Name

1. **Question text here?**
   - A) Option A
   - B) Option B
   - C) Option C
   - D) Option D
   - **Answer: C**
   - Explanation: Detailed explanation (4-6 sentences). First explain why C is correct with specific facts. Then explain why A is wrong, why B is wrong, and why D is wrong with correct facts for each.

2. **Next question?**
   ...`,
    instructions: [
      '1. Create a .md file named after the subject (e.g., Reasoning.md, English.md, Maths.md)',
      '2. First line: # Subject Name',
      '3. Second line: <!-- icon: 📘 | color: from-blue-500 to-cyan-500 -->',
      '4. Sections start with ## (these become chapter tabs)',
      '5. MCQs start with N. **Question?** followed by options and answer',
      '6. Upload the file to content/guide-notes/ folder on GitHub',
      '7. The server auto-reads all .md files from that folder',
      '8. No server restart needed — just push to GitHub and Render redeploys',
    ],
    tips: [
      'Use ## for chapter headings (these appear as expandable sections)',
      'Each MCQ needs exactly 4 options (A, B, C, D)',
      'Put **Answer: X** on its own line after the options',
      'Explanation should be 4-6 sentences: state correct fact, explain why wrong options are wrong',
      'The file is automatically merged with existing subjects',
    ],
  });
});

// --- Shared Question Bank (JSON file store) ---
const BANK_FILE = path.join(__dirname, 'data', 'questions-bank.json');

function loadBank() {
  try {
    if (fs.existsSync(BANK_FILE)) {
      return JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Bank load error:', e.message);
  }
  return [];
}

function saveBank(questions) {
  try {
    fs.mkdirSync(path.dirname(BANK_FILE), { recursive: true });
    fs.writeFileSync(BANK_FILE, JSON.stringify(questions, null, 2));
  } catch (e) {
    console.error('Bank save error:', e.message);
  }
}

function appendToBank(newQuestions) {
  const bank = loadBank();
  const existing = new Set(bank.map((q) => (q.question || '').toLowerCase()));
  const seen = new Set();
  const fresh = newQuestions
    .filter((q) => q && q.question)
    .filter((q) => {
      const k = (q.question || '').toLowerCase();
      if (existing.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((q, i) => ({
      ...q,
      id: q.id || `bank-${Date.now()}-${i}`,
      source: q.source || 'ai',
    }));
  const next = [...fresh, ...bank];
  saveBank(next);
  return { added: fresh.length, total: next.length, questions: next };
}

// Get all shared questions
app.get('/api/bank/questions', (req, res) => {
  const bank = loadBank();
  res.json({ success: true, questions: bank, count: bank.length });
});

// Save questions to the shared bank
app.post('/api/bank/questions', (req, res) => {
  const { questions } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'No questions provided' });
  }
  const result = appendToBank(questions);
  res.json({ success: true, added: result.added, total: result.total });
});

// Test AI connectivity — returns which provider/model works
app.post('/api/ai/test', async (req, res) => {
  try {
    const { apiKey, provider } = req.body;
    const key = apiKey || process.env.NEMOTRON_API_KEY;
    if (!key) return res.json({ success: false, error: 'No API key provided. Add one in Settings.' });
    const prov = provider || 'nemotron';
    const cfg = AI_PROVIDERS[prov];
    if (!cfg) return res.json({ success: false, error: `Unknown provider: ${prov}` });

    let lastError = '';
    for (const model of cfg.models) {
      try {
        let ok = false;
        if (cfg.type === 'gemini') {
          const url = `${cfg.endpoint}/${model}:generateContent?key=${key}`;
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say "hello" in one word.' }] }], generationConfig: { maxOutputTokens: 10 } }),
          });
          ok = r.ok;
          if (!ok) lastError = `${model}: ${r.status}`;
        } else {
          const r = await fetch(cfg.endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say "hello" in one word.' }], max_tokens: 10 }),
          });
          ok = r.ok;
          if (!ok) lastError = `${model}: ${r.status} ${(await r.text()).slice(0, 200)}`;
        }
        if (ok) return res.json({ success: true, provider: prov, model, message: `✅ ${cfg.name} is working` });
      } catch (e) { lastError = `${model}: ${e.message}`; }
    }
    res.json({ success: false, error: `${cfg.name} failed: ${lastError}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// --- Generate questions with AI (multi-provider)
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { category, difficulty, count, apiKey, provider } = req.body;

    if (!category || !difficulty || !count) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: category, difficulty, count',
      });
    }

    const key = apiKey || process.env.NEMOTRON_API_KEY;
    if (!key) {
      return res.status(500).json({
        success: false,
        error: 'AI API key not configured. Add one in Settings.',
      });
    }

    const questions = await generateQuestionsWithAI(provider || 'nemotron', key, category, difficulty, count, true);

    // Auto-save generated questions to the shared bank
    const bankResult = appendToBank(questions);

    res.json({ success: true, questions, count: questions.length, bankTotal: bankResult.total });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({
      success: false,
      error: `AI generation failed: ${error.message}. Make sure your API key is valid and the provider is reachable.`,
      details: error.message,
    });
  }
});

// Generate detailed guide notes with AI (multi-provider)
app.post('/api/ai/notes', async (req, res) => {
  try {
    const { subject, topic, apiKey, provider } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: subject, topic',
      });
    }

    const key = apiKey || process.env.NEMOTRON_API_KEY;
    if (!key) {
      return res.status(500).json({
        success: false,
        error: 'No API key found. Click ⚙️ in Question Bank, add a free key from build.nvidia.com (Nemotron) or aistudio.google.com (Gemini), then try again.',
      });
    }

    const notes = await generateDetailedNotesWithAI(provider || 'nemotron', key, subject, topic);

    res.json({ success: true, notes, subject, topic });
  } catch (error) {
    console.error('AI notes generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate notes with AI',
      details: error.message,
    });
  }
});

// Backward-compatible aliases (Nemotron = default provider)
app.post('/api/nemotron/generate', (req, res) => {
  req.body.provider = req.body.provider || 'nemotron';
  handleGenerate(res, req.body);
});

app.post('/api/nemotron/notes', (req, res) => {
  req.body.provider = req.body.provider || 'nemotron';
  handleNotes(res, req.body);
});

async function handleGenerate(res, { category, difficulty, count, apiKey, provider }) {
  try {
    if (!category || !difficulty || !count) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: category, difficulty, count' });
    }
    const key = apiKey || process.env.NEMOTRON_API_KEY;
    if (!key) {
      return res.status(500).json({ success: false, error: 'AI API key not configured. Add one in Settings.' });
    }
    const questions = await generateQuestionsWithAI(provider || 'nemotron', key, category, difficulty, count);
    const bankResult = appendToBank(questions);
    res.json({ success: true, questions, count: questions.length, bankTotal: bankResult.total });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate questions with AI', details: error.message });
  }
}

async function handleNotes(res, { subject, topic, apiKey, provider }) {
  try {
    if (!subject || !topic) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: subject, topic' });
    }
    const key = apiKey || process.env.NEMOTRON_API_KEY;
    if (!key) {
      return res.status(500).json({ success: false, error: 'AI API key not configured. Add one in Settings.' });
    }
    const notes = await generateDetailedNotesWithAI(provider || 'nemotron', key, subject, topic);
    res.json({ success: true, notes, subject, topic });
  } catch (error) {
    console.error('AI notes generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate notes with AI', details: error.message });
  }
}

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

// --- AI Provider Integration ---
const AI_PROVIDERS = {
  nemotron: {
    name: 'NVIDIA Nemotron',
    type: 'openai',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    models: [
      'nvidia/llama-3.3-nemotron-super-49b-v1',
      'meta/llama-3.1-70b-instruct',
      'nvidia/nemotron-4-340b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct',
    ],
    color: '#76B900',
  },
  openai: {
    name: 'OpenAI',
    type: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini'],
    color: '#10A37F',
  },
  groq: {
    name: 'Groq (Llama)',
    type: 'openai',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.3-70b-versatile'],
    color: '#F55036',
  },
  gemini: {
    name: 'Google Gemini',
    type: 'gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-1.5-flash'],
    color: '#4285F4',
  },
};

async function callAIProvider(provider, apiKey, systemPrompt, userPrompt, { maxTokens = 4000, temperature = 0.7 } = {}) {
  const cfg = AI_PROVIDERS[provider] || AI_PROVIDERS.nemotron;
  let lastError = '';

  for (const model of cfg.models) {
    try {
      if (cfg.type === 'gemini') {
        const url = `${cfg.endpoint}/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              topP: 0.9,
            },
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          lastError = `${model}: ${response.status} - ${errText}`;
          continue;
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        return text.trim();
      }

      // OpenAI-compatible (Nemotron, OpenAI, Groq)
      const response = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: 0.9,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return content.trim();
      }

      const errText = await response.text();
      lastError = `${model}: ${response.status} - ${errText}`;
    } catch (e) {
      lastError = `${model}: ${e.message}`;
    }
  }

  throw new Error(`${cfg.name} API error: ${lastError || 'All models failed'}`);
}

async function generateQuestionsWithAI(provider, apiKey, category, difficulty, count, useWebSources = true) {
  const difficultyMap = {
    easy: 'Basic recall of facts, straightforward questions with obvious distractors',
    medium: 'Require moderate understanding, including connections between concepts, with plausible distractors',
    hard: 'In-depth analysis, nuanced details, or application-based questions, with closely related distractors that test deep knowledge',
  };

  // Gather real reference material from public web sources (Wikipedia + current news)
  let webContext = '';
  if (useWebSources) {
    try {
      webContext = await fetchWebContextForCategory(category);
    } catch (e) {
      console.error('Web context fetch failed (continuing without it):', e.message);
    }
  }

  const prompt = `
Generate ${count} multiple-choice questions for SSC CGL Tier-I exam preparation on ${category}.
Difficulty: ${difficulty} - ${difficultyMap[difficulty] || difficultyMap.medium}

Requirements:
- Each question must have exactly 4 options
- One correct answer that exactly matches one option
- For each question, write a DETAILED explanation (4-6 sentences minimum):
  1. First sentence: state the correct answer clearly
  2. Explain WHY the correct answer is correct with specific facts, dates, names, or details
  3. Then explain WHY each wrong option is wrong, with the correct fact for that option
  4. Add any related exam tips or mnemonics if relevant
- Questions should be India-centric and relevant to SSC CGL exam pattern
- Base questions ONLY on real facts found in the "REFERENCE MATERIAL" below and on standard SSC CGL / CHSL previous-year question paper topics
- For Current Affairs: use the latest real news headlines provided below
- For Static GK: use the Wikipedia facts provided below
- Make questions clear, concise, and unambiguous
- Distractors must be plausible based on common misconceptions
- Never invent facts, dates, or names that are not supported by the reference material or well-known public knowledge

${webContext}

Return ONLY a valid JSON array in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "explanation": "Correct answer is Option A because [detailed reason with facts]. Option B is wrong because [reason]. Option C is wrong because [reason]. Option D is wrong because [reason]."
  }
]
`;

  const content = await callAIProvider(
    provider,
    apiKey,
    'You are an expert SSC CGL exam question generator. Generate high-quality, exam-oriented multiple choice questions in valid JSON format only. Base every question strictly on real facts from the provided reference material and known SSC CGL/CHSL previous-year paper topics.',
    prompt,
    { maxTokens: 6000, temperature: 0.7 }
  );

  // Parse JSON robustly: the model may wrap the array in prose like
  // "Here are questions generated from wikipedia..." — extract the array.
  const raw = extractJsonArray(content);
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    throw new Error('No valid JSON found in AI response. The model returned prose instead of JSON.');
  }

  // Validate each item — the model sometimes returns strings or malformed objects
  const questions = raw
    .filter((q) => q && typeof q === 'object')
    .filter((q) => {
      const hasText = typeof q.question === 'string' && q.question.trim().length > 5;
      const hasOptions = Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => typeof o === 'string' && o.trim().length > 0);
      const hasAnswer = typeof q.answer === 'string' && q.answer.trim().length > 0;
      const hasExpl = typeof q.explanation === 'string' && q.explanation.trim().length > 10;
      return hasText && hasOptions && hasAnswer && hasExpl;
    })
    .map((q, i) => ({
      ...q,
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      answer: q.answer.trim(),
      explanation: q.explanation.trim(),
      id: `${provider}-${Date.now()}-${i}`,
      source: provider,
      topic: category,
      category,
      difficulty,
    }))
    .slice(0, count);

  if (questions.length === 0) {
    throw new Error('AI response did not contain any valid questions. The model returned malformed JSON. Please try again.');
  }

  return questions;
}

// Extract a JSON array from a possibly prose-wrapped AI response
function extractJsonArray(content) {
  if (!content) return null;

  // Try parsing the whole content directly first
  try {
    const direct = JSON.parse(content);
    if (Array.isArray(direct)) return direct;
  } catch (e) { /* fall through */ }

  // Try each '[' occurrence until one forms a valid top-level array
  let searchFrom = 0;
  while (searchFrom < content.length) {
    let start = content.indexOf('[', searchFrom);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let i = start; i < content.length; i++) {
      const ch = content[i];
      if (inString) {
        if (escaped) { escaped = false; }
        else if (ch === '\\') { escaped = true; }
        else if (ch === '"') { inString = false; }
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) return null;

    try {
      const parsed = JSON.parse(content.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* try next '[' */ }

    searchFrom = start + 1;
  }

  return null;
}

// --- Fetch real reference material from public web sources ---
const TOPIC_SEARCH_TERMS = {
  'general-awareness': 'India general knowledge facts',
  'current-affairs': 'India current affairs latest news',
  'history': 'History of India freedom struggle',
  'geography': 'Geography of India rivers mountains',
  'polity': 'Constitution of India polity',
  'economy': 'Economy of India budget GDP',
  'science': 'Science and technology in India ISRO',
  'reasoning': 'Logical reasoning aptitude',
  'quant': 'Quantitative aptitude mathematics formulas',
  'english': 'English grammar vocabulary',
};

async function fetchWebContextForCategory(category) {
  const searchTerm = TOPIC_SEARCH_TERMS[category] || 'India general knowledge';
  const parts = [];

  // 1. Wikipedia summary (public REST API, no key needed)
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm.split(' ')[0] || 'India')}`,
      { headers: { 'User-Agent': 'SSCGuideApp/1.0 (educational)' } }
    );
    if (wikiRes.ok) {
      const wiki = await wikiRes.json();
      if (wiki && wiki.extract) {
        parts.push(`[Wikipedia - ${wiki.title}]\n${wiki.extract.slice(0, 800)}`);
      }
    }
  } catch (e) {
    console.error('Wikipedia fetch failed:', e.message);
  }

  // 2. Latest news headlines (Google News RSS - public, no key needed)
  try {
    const newsRes = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent('current affairs India 2026')}&hl=en-IN&gl=IN&ceid=IN:en`,
      { headers: { 'User-Agent': 'SSCGuideApp/1.0 (educational)' } }
    );
    if (newsRes.ok) {
      const rss = await newsRes.text();
      const titles = [...rss.matchAll(/<title>(.*?)<\/title>/g)]
        .map((m) => m[1].replace(/&amp;/g, '&').trim())
        .filter((t) => t && !t.includes('Google News'))
        .slice(0, 12);
      if (titles.length > 0) {
        parts.push(`[Latest News Headlines - ${new Date().toLocaleDateString('en-IN')}]\n${titles.join('\n')}`);
      }
    }
  } catch (e) {
    console.error('News fetch failed:', e.message);
  }

  // 3. Wikipedia search for the full topic term
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=3`,
      { headers: { 'User-Agent': 'SSCGuideApp/1.0 (educational)' } }
    );
    if (searchRes.ok) {
      const search = await searchRes.json();
      const snippets = (search.query?.search || []).map((s) => `• ${s.title}: ${s.snippet.replace(/<[^>]+>/g, '').slice(0, 200)}`);
      if (snippets.length > 0) {
        parts.push(`[Wikipedia search results for "${searchTerm}"]\n${snippets.join('\n')}`);
      }
    }
  } catch (e) {
    console.error('Wikipedia search failed:', e.message);
  }

  if (parts.length === 0) {
    return '';
  }

  return `REFERENCE MATERIAL (use these real facts for question generation):\n${parts.join('\n\n')}\n\n`;
}

// --- Generate detailed study notes with AI ---
async function generateDetailedNotesWithAI(provider, apiKey, subject, topic) {
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

  const content = await callAIProvider(
    provider,
    apiKey,
    'You are an expert SSC CGL exam mentor who writes clear, accurate, detailed study notes.',
    prompt,
    { maxTokens: 3000, temperature: 0.5 }
  );

  if (!content.trim()) {
    throw new Error('Empty response from AI provider');
  }

  return content.trim();
}

// Curated SSC CGL sample questions used to seed the shared bank (always gives visitors content)
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
    source: 'bank',
    topic: q.topic,
    difficulty: q.difficulty,
  }));
}

// Seed the shared bank with fallback questions on first run (so visitors always have content)
function seedBankIfEmpty() {
  const bank = loadBank();
  if (bank.length === 0) {
    const seed = getFallbackQuestions();
    saveBank(seed);
    console.log(`🌱 Seeded shared question bank with ${seed.length} questions`);
  }
}

seedBankIfEmpty();

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
