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

export async function generateQuestionsWithNemotron(category, difficulty, count, apiKey) {
  try {
    const response = await fetch('/api/nemotron/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, difficulty, count, apiKey }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate questions');
    }
    return data.questions || [];
  } catch (error) {
    console.error('Error generating questions with Nemotron:', error);
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