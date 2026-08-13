const NOTOPEDIA_BASE_URL = 'https://www.notopedia.com';

export async function fetchNotopediaQuestions(url) {
  try {
    const response = await fetch(`/api/notopedia/questions?url=${encodeURIComponent(url || NOTOPEDIA_BASE_URL)}`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch questions from Notopedia');
    }
    return data.questions || [];
  } catch (error) {
    console.error('Error fetching Notopedia questions:', error);
    throw error;
  }
}

export const AI_PROVIDERS = [
  { id: 'nemotron', name: 'NVIDIA Nemotron', color: '#76B900', signup: 'https://build.nvidia.com/explore/discover' },
  { id: 'openai', name: 'OpenAI', color: '#10A37F', signup: 'https://platform.openai.com/api-keys' },
  { id: 'groq', name: 'Groq (Llama)', color: '#F55036', signup: 'https://console.groq.com/keys' },
  { id: 'gemini', name: 'Google Gemini', color: '#4285F4', signup: 'https://aistudio.google.com/apikey' },
];

export function getProvider(id) {
  return AI_PROVIDERS.find((p) => p.id === id) || AI_PROVIDERS[0];
}

export async function generateQuestionsWithAI({ category, difficulty, count, apiKey, provider }) {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, difficulty, count, apiKey, provider }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate questions');
    }
    return data.questions || [];
  } catch (error) {
    console.error('Error generating questions with AI:', error);
    throw error;
  }
}

export async function generateNotesWithAI({ subject, topic, apiKey, provider }) {
  try {
    const response = await fetch('/api/ai/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, topic, apiKey, provider }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate notes');
    }
    return data.notes || '';
  } catch (error) {
    console.error('Error generating notes with AI:', error);
    throw error;
  }
}

export async function fetchSharedBank() {
  try {
    const response = await fetch('/api/bank/questions');
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load shared question bank');
    }
    return data.questions || [];
  } catch (error) {
    console.error('Error loading shared question bank:', error);
    throw error;
  }
}

export async function saveToSharedBank(questions) {
  try {
    const response = await fetch('/api/bank/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to save to shared bank');
    }
    return data;
  } catch (error) {
    console.error('Error saving to shared bank:', error);
    throw error;
  }
}

export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectQuestions(questions, count, topic = null) {
  let filtered = questions;
  if (topic) {
    filtered = questions.filter(q => q.topic === topic || q.category === topic);
  }
  return shuffleArray(filtered).slice(0, count);
}
