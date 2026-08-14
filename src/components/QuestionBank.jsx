import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import Navbar from './Navbar';
import { generateQuestionsWithAI, fetchSharedBank, AI_PROVIDERS, getProvider, testAIConnection } from '../services/api';

// Text-to-speech utility — preloads voices for instant playback
let cachedVoices = [];
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  cachedVoices = window.speechSynthesis.getVoices();
}
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function speakText(text) {
  if (!('speechSynthesis' in window)) { alert('Your browser does not support text-to-speech. Try Chrome or Edge.'); return; }
  window.speechSynthesis.cancel();
  if (cachedVoices.length === 0) loadVoices();
  const clean = text.replace(/[#*_`>\-]/g, '').replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();
  const u = new SpeechSynthesisUtterance(clean.slice(0, 5000));
  u.rate = 0.9;
  u.pitch = 1;
  u.lang = 'en-IN';
  const indian = cachedVoices.find((v) => v.lang.startsWith('en-IN')) || cachedVoices.find((v) => v.lang.startsWith('en'));
  if (indian) u.voice = indian;
  window.speechSynthesis.speak(u);
}
function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

const TOPICS = [
  { id: 'all', name: 'All Topics', icon: '📚' },
  { id: 'general-awareness', name: 'General Awareness', icon: '🌍', count: 25 },
  { id: 'current-affairs', name: 'Current Affairs', icon: '📰', count: 25 },
  { id: 'history', name: 'History', icon: '🏛️', count: 20 },
  { id: 'geography', name: 'Geography', icon: '🗺️', count: 20 },
  { id: 'polity', name: 'Polity & Constitution', icon: '⚖️', count: 20 },
  { id: 'economy', name: 'Economy', icon: '💰', count: 15 },
  { id: 'science', name: 'General Science', icon: '🔬', count: 15 },
  { id: 'reasoning', name: 'Reasoning', icon: '🧩', count: 25 },
  { id: 'quant', name: 'Quantitative Aptitude', icon: '🔢', count: 25 },
  { id: 'english', name: 'English Comprehension', icon: '📝', count: 25 },
];

const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', color: 'bg-green-500' },
  { id: 'medium', name: 'Medium', color: 'bg-yellow-500' },
  { id: 'hard', name: 'Hard', color: 'bg-red-500' },
];

const GENERATE_TOPICS = [
  { id: 'general-awareness', label: 'General Awareness', icon: '🌍' },
  { id: 'current-affairs', label: 'Current Affairs', icon: '📰' },
  { id: 'history', label: 'History', icon: '🏛️' },
  { id: 'geography', label: 'Geography', icon: '🗺️' },
  { id: 'polity', label: 'Polity', icon: '⚖️' },
  { id: 'economy', label: 'Economy', icon: '💰' },
  { id: 'science', label: 'General Science', icon: '🔬' },
  { id: 'reasoning', label: 'Reasoning', icon: '🧩' },
  { id: 'quant', label: 'Quantitative Aptitude', icon: '🔢' },
  { id: 'english', label: 'English', icon: '📝' },
];

export default function QuestionBank() {
  const { questions, setQuestions, setQuestionsError, userStats, updateUserStats, wrongBook, addToWrongBook, removeFromWrongBook, clearWrongBook } = useStore();
  const [activeTab, setActiveTab] = useState('dataset'); // 'dataset' | 'ai' | 'wrongbook'
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [showAnswer, setShowAnswer] = useState({});
  const [bookmarked, setBookmarked] = useState(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showExplanations, setShowExplanations] = useState({});
  const [loadingAi, setLoadingAi] = useState(false);
  const [genProgress, setGenProgress] = useState(null);
  const [genConfig, setGenConfig] = useState({ category: 'general-awareness', difficulty: 'medium', count: 25 });
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [savedKeys, setSavedKeys] = useState([]);
  const [activeKeyId, setActiveKeyId] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('nemotron');
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState(null);
  const [provider, setProvider] = useState('nemotron');
  const [bankCount, setBankCount] = useState(0);

  // Dataset MCQs from markdown files
  const [datasetMcqs, setDatasetMcqs] = useState([]);
  const [datasetTotal, setDatasetTotal] = useState(0);
  const [datasetTopics, setDatasetTopics] = useState([]);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetPage, setDatasetPage] = useState(0);
  const [ttsSpeaking, setTtsSpeaking] = useState(null);
  const MCQS_PER_PAGE = 30;

  // Load shared question bank, bookmarks, and saved API keys on mount
  useEffect(() => {
    loadSharedBank();
    loadBookmarks();
    loadSavedKeys();
  }, []);

  // Load dataset MCQs from markdown files
  useEffect(() => {
    (async () => {
      setDatasetLoading(true);
      try {
        const res = await fetch('/api/notes-mcqs');
        const data = await res.json();
        if (data.success) {
          setDatasetMcqs(data.mcqs || []);
          setDatasetTotal(data.total || 0);
          setDatasetTopics(data.topics || []);
        }
      } catch (e) {
        console.error('Failed to load dataset MCQs:', e);
      } finally {
        setDatasetLoading(false);
      }
    })();
  }, []);

  const loadSharedBank = async (silent = false) => {
    try {
      const bank = await fetchSharedBank();
      setBankCount(bank.length);
      setQuestions((prev) => {
        const existingKeys = new Set((prev || []).map((q) => ((q && q.question) || '').toLowerCase()));
        const fresh = (bank || []).filter((q) => q && q.question && !existingKeys.has(q.question.toLowerCase()));
        return [...fresh, ...(prev || [])];
      });
    } catch (error) {
      if (!silent) {
        setQuestionsError(error.message);
      }
    }
  };

  const loadBookmarks = () => {
    const saved = localStorage.getItem('prepmaster-bookmarks');
    if (saved) {
      try {
        setBookmarked(new Set(JSON.parse(saved)));
      } catch (e) {
        setBookmarked(new Set());
      }
    }
  };

  const toggleBookmark = (id) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('prepmaster-bookmarks', JSON.stringify([...next]));
      return next;
    });
  };

  const loadSavedKeys = () => {
    try {
      const keys = JSON.parse(localStorage.getItem('ai-keys') || '[]');
      setSavedKeys(keys);
      const active = localStorage.getItem('ai-active-key');
      if (active && keys.some((k) => k.id === active)) {
        setActiveKeyId(active);
      } else if (keys.length > 0) {
        setActiveKeyId(keys[0].id);
        localStorage.setItem('ai-active-key', keys[0].id);
      }
    } catch (e) {
      setSavedKeys([]);
    }
  };

  const persistKeys = (keys) => {
    localStorage.setItem('ai-keys', JSON.stringify(keys));
    setSavedKeys(keys);
  };

  const toggleTopic = (id) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const generateTopics = () => {
    return selectedTopics.length > 0 ? selectedTopics : [genConfig.category];
  };

  const addApiKey = () => {
    const key = newKeyValue.trim();
    const name = newKeyName.trim() || `${getProvider(newKeyProvider).name} Key ${savedKeys.length + 1}`;
    if (!key) {
      setApiKeyStatus('⚠️ Enter an API key to save');
      setTimeout(() => setApiKeyStatus(null), 4000);
      return;
    }
    const entry = { id: crypto.randomUUID(), name, key, provider: newKeyProvider };
    const keys = [...savedKeys, entry];
    persistKeys(keys);
    setActiveKeyId(entry.id);
    localStorage.setItem('ai-active-key', entry.id);
    setNewKeyName('');
    setNewKeyValue('');
    setApiKeyStatus(`✅ Key "${name}" saved on this device`);
    setTimeout(() => setApiKeyStatus(null), 3000);
  };

  const removeApiKey = (id) => {
    const keys = savedKeys.filter((k) => k.id !== id);
    persistKeys(keys);
    if (activeKeyId === id) {
      const next = keys.length > 0 ? keys[0].id : null;
      setActiveKeyId(next);
      if (next) localStorage.setItem('ai-active-key', next);
      else localStorage.removeItem('ai-active-key');
    }
    setApiKeyStatus('🗑️ Key removed');
    setTimeout(() => setApiKeyStatus(null), 3000);
  };

  const selectActiveKey = (id) => {
    setActiveKeyId(id);
    localStorage.setItem('ai-active-key', id);
  };

  const getActiveKey = () => {
    return savedKeys.find((k) => k.id === activeKeyId) || savedKeys[0] || null;
  };

  const getEffectiveApiKey = () => {
    const active = getActiveKey();
    return active ? active.key : '';
  };

  const getEffectiveProvider = () => {
    const active = getActiveKey();
    return active ? active.provider : provider;
  };

  const testMyAI = async () => {
    const apiKey = getEffectiveApiKey();
    const prov = getEffectiveProvider();
    if (!apiKey) {
      setApiKeyStatus('⚠️ Add an API key first');
      setTimeout(() => setApiKeyStatus(null), 4000);
      return;
    }
    setApiKeyStatus('🔄 Testing connection...');
    const result = await testAIConnection({ apiKey, provider: prov });
    if (result.success) {
      setApiKeyStatus(`✅ ${result.message} (model: ${result.model})`);
    } else {
      setApiKeyStatus(`❌ ${result.error}`);
    }
    setTimeout(() => setApiKeyStatus(null), 8000);
  };

  const generateQuestions = async () => {
    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
      setApiKeyStatus('⚠️ Add an AI API key in settings first (⚙️ button above)');
      setTimeout(() => setApiKeyStatus(null), 5000);
      return;
    }

    const topics = generateTopics();
    const topicsInfo = topics.map((id) => GENERATE_TOPICS.find((t) => t.id === id)).filter(Boolean);
    const batchCount = Math.max(1, Math.round(genConfig.count / topics.length));
    setLoadingAi(true);
    let added = 0;
    setGenProgress({ done: 0, total: topics.length, label: 'Generating from previous papers + live web sources...' });
    try {
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const topicInfo = topicsInfo[i] || { id: topic, label: topic };
        setGenProgress({ done: i, total: topics.length, label: `Generating ${topicInfo.label} (${batchCount} Qs)...` });
        try {
          const newQuestions = await generateQuestionsWithAI({
            category: topic,
            difficulty: genConfig.difficulty,
            count: batchCount,
            apiKey,
            provider: getEffectiveProvider(),
          });
          setQuestions((prev) => {
            const existingKeys = new Set(prev.map((q) => (q.question || '').toLowerCase()));
            const fresh = newQuestions.filter((q) => !existingKeys.has((q.question || '').toLowerCase()));
            return [...fresh, ...prev];
          });
          added += newQuestions.length;
        } catch (error) {
          console.error(`Generate error for ${topic}:`, error);
          alert(`Error for "${topicInfo.label}": ${error.message}`);
          break;
        }
      }
      setBankCount((prev) => prev + added);
      if (added > 0) {
        alert(`✅ Generated ${added} new questions (based on SSC CGL/CHSL previous papers + live web sources). Saved to the shared bank — visible to everyone!`);
      }
    } finally {
      setLoadingAi(false);
      setGenProgress(null);
    }
  };

  // Batch generation: create 25 questions for each selected topic
  const generateBatch = async () => {
    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
      setApiKeyStatus('⚠️ Add an AI API key in settings first (⚙️ button above)');
      setTimeout(() => setApiKeyStatus(null), 5000);
      return;
    }

    const topics = generateTopics().map((id) => GENERATE_TOPICS.find((t) => t.id === id)).filter(Boolean);
    const batchCount = 25;
    const totalBatches = topics.length;

    setLoadingAi(true);
    setGenProgress({ done: 0, total: totalBatches, label: 'Starting batch generation...' });

    let added = 0;
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      setGenProgress({ done: i, total: totalBatches, label: `Generating ${topic.label} (${batchCount} Qs) from web sources...` });
      try {
        const newQuestions = await generateQuestionsWithAI({
          category: topic.id,
          difficulty: genConfig.difficulty,
          count: batchCount,
          apiKey,
          provider: getEffectiveProvider(),
        });
        setQuestions((prev) => {
          const existingKeys = new Set(prev.map((q) => (q.question || '').toLowerCase()));
          const fresh = newQuestions.filter((q) => !existingKeys.has((q.question || '').toLowerCase()));
          return [...fresh, ...prev];
        });
        added += newQuestions.length;
      } catch (error) {
        console.error(`Batch error for ${topic.id}:`, error);
      }
    }

    setLoadingAi(false);
    setGenProgress(null);
    setBankCount((prev) => prev + added);
    alert(`✅ Batch complete! Added ${added} questions to the shared Question Bank — visible to everyone visiting this site.`);
  };

  const filteredQuestions = (questions || [])
    .filter((q) => {
      const questionText = (q && q.question ? q.question : '').toLowerCase();
      const qTopic = (q && q.topic) || (q && q.category) || 'general';
      const qDiff = (q && q.difficulty) || 'medium';
      if (selectedTopic !== 'all' && qTopic !== selectedTopic) return false;
      if (selectedDifficulty !== 'all' && qDiff !== selectedDifficulty) return false;
      if (searchQuery && !questionText.includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by topic, then difficulty (safe against missing fields)
      const topicA = (a && a.topic) || (a && a.category) || 'general';
      const topicB = (b && b.topic) || (b && b.category) || 'general';
      if (topicA !== topicB) return topicA.localeCompare(topicB);
      const diffOrder = { easy: 0, medium: 1, hard: 2 };
      return (diffOrder[(a && a.difficulty)] || 1) - (diffOrder[(b && b.difficulty)] || 1);
    });

  const getTopicInfo = (topicId) => {
    const topic = TOPICS.find(t => t.id === topicId);
    return topic ? `${topic.icon} ${topic.name}` : topicId;
  };

  const getDifficultyBadge = (difficulty) => {
    const diff = DIFFICULTIES.find(d => d.id === difficulty);
    return diff ? (
      <span className={`badge px-2 py-0.5 text-xs ${diff.color} text-white`}>{diff.name}</span>
    ) : (
      <span className="badge badge-primary">{difficulty}</span>
    );
  };

  // Dataset MCQ topic display names
  const DATASET_TOPIC_LABELS = {
    'history': '🏛️ History',
    'art-culture': '🎨 Art & Culture',
    'polity': '⚖️ Polity',
    'geography': '🗺️ Geography',
    'economics': '💰 Economics',
    'science': '🔬 Science',
    'environment': '🌿 Environment',
    'computer': '💻 Computer',
    'miscellaneous-gk': '📚 Miscellaneous GK',
    'current-affairs': '📰 Current Affairs',
  };

  // Filter dataset MCQs
  const filteredDataset = datasetMcqs
    .filter((q) => {
      if (selectedTopic !== 'all' && q.topic !== selectedTopic) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (searchQuery && !q.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  const pagedDataset = filteredDataset.slice(0, (datasetPage + 1) * MCQS_PER_PAGE);
  const hasMoreDataset = pagedDataset.length < filteredDataset.length;

  // Handle answer selection for interactive MCQs
  const handleAnswerSelect = (qId, selectedOption, correctAnswer, question) => {
    if (selectedAnswers[qId]) return; // already answered
    setSelectedAnswers((prev) => ({ ...prev, [qId]: selectedOption }));
    if (selectedOption !== correctAnswer) {
      addToWrongBook({ ...question, selectedAnswer: selectedOption, id: qId });
    }
  };

  const handleTTS = (text, qId) => {
    if (ttsSpeaking === qId) {
      stopSpeech();
      setTtsSpeaking(null);
    } else {
      setTtsSpeaking(qId);
      speakText(text);
      setTimeout(() => setTtsSpeaking(null), 5000);
    }
  };

  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Question Bank</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {datasetTotal > 0 ? `${datasetTotal} curated MCQs from SSC CGL study material` : 'Loading questions...'} • AI-generated questions from previous year patterns
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 animate-fade-in stagger-1">
          {[
            { id: 'dataset', label: '📚 Study MCQs', desc: `${datasetTotal} curated questions` },
            { id: 'ai', label: '🤖 AI Generate', desc: 'Generate new questions' },
            { id: 'wrongbook', label: `❌ Wrong Book (${wrongBook.length})`, desc: 'Review mistakes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-3 rounded-xl text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                  : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="font-semibold text-sm">{tab.label}</p>
              <p className={`text-xs ${activeTab === tab.id ? 'text-primary-100' : 'text-gray-400'}`}>{tab.desc}</p>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="glass-card p-4 mb-6 animate-fade-in stagger-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <select
              value={selectedTopic}
              onChange={(e) => { setSelectedTopic(e.target.value); setDatasetPage(0); }}
              className="input-field min-w-[180px]"
            >
              <option value="all">📚 All Topics</option>
              {datasetTopics.map((t) => (
                <option key={t} value={t}>{DATASET_TOPIC_LABELS[t] || t}</option>
              ))}
              <option disabled>──────</option>
              {TOPICS.filter((t) => t.id !== 'all' && !datasetTopics.includes(t.id)).map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.icon} {topic.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="input-field min-w-[140px]"
            >
              <option value="all">All Difficulties</option>
              {DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-xl transition-colors ${viewMode === 'card' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300'}`}
                aria-label="Card view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300'}`}
                aria-label="List view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>

          {/* AI Generate Section (only when AI tab active) */}
          {activeTab === 'ai' && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">🤖 Generate Questions:</span>
                <select
                  value={genConfig.category}
                  onChange={(e) => setGenConfig({...genConfig, category: e.target.value})}
                  className="input-field w-auto min-w-[160px] py-2 text-sm"
                >
                  {GENERATE_TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                  ))}
                </select>
                <select
                  value={genConfig.difficulty}
                  onChange={(e) => setGenConfig({...genConfig, difficulty: e.target.value})}
                  className="input-field w-auto min-w-[120px] py-2 text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={genConfig.count}
                  onChange={(e) => setGenConfig({...genConfig, count: parseInt(e.target.value) || 25})}
                  className="input-field w-auto min-w-[70px] py-2 text-sm"
                />
                <button onClick={generateQuestions} disabled={loadingAi} className="btn-primary py-2 px-4 text-sm">
                  {loadingAi ? 'Generating...' : '🎯 Generate & Save'}
                </button>
                <button onClick={generateBatch} disabled={loadingAi} className="btn-primary py-2 px-4 text-sm bg-gradient-to-r from-purple-600 to-pink-600">
                  {loadingAi ? 'Generating...' : '🚀 Batch Generate'}
                </button>
                <button onClick={() => setShowApiSettings(!showApiSettings)} className="btn-secondary py-2 px-3 text-sm">
                  ⚙️ {getActiveKey() ? getActiveKey().name : 'API Keys'}
                </button>
              </div>

              {/* Multi-topic selection */}
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">🎯 Select topics for batch generation:</p>
                <div className="flex flex-wrap gap-2">
                  {GENERATE_TOPICS.map((t) => {
                    const active = selectedTopics.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => toggleTopic(t.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${active ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:border-primary-400'}`}>
                        {t.icon} {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Settings */}
              {showApiSettings && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-dark-800/50 rounded-xl border border-gray-200 dark:border-gray-700 animate-slide-down">
                  {savedKeys.length > 0 && (
                    <div className="mb-4">
                      <label className="label-text">Saved Keys</label>
                      <div className="space-y-2 mt-2">
                        {savedKeys.map((k) => (
                          <div key={k.id} onClick={() => selectActiveKey(k.id)}
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${activeKeyId === k.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-800 hover:border-primary-300'}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${activeKeyId === k.id ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{k.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{getProvider(k.provider).name} • {k.key.slice(0, 8)}••••••••{k.key.slice(-4)}</p>
                              </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeApiKey(k.id); }} className="text-gray-400 hover:text-red-500 p-1">🗑️</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">Key Name</label>
                      <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. My Nemotron" className="input-field mt-1" />
                    </div>
                    <div>
                      <label className="label-text">AI Provider</label>
                      <select value={newKeyProvider} onChange={(e) => setNewKeyProvider(e.target.value)} className="input-field mt-1">
                        {AI_PROVIDERS.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="label-text">API Key</label>
                    <div className="flex flex-col sm:flex-row gap-3 mt-1">
                      <input type="password" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="Paste your API key..." className="input-field flex-1" />
                      <button onClick={addApiKey} className="btn-primary py-2 px-4 text-sm whitespace-nowrap">➕ Add Key</button>
                    </div>
                  </div>
                  {apiKeyStatus && <p className="text-xs text-primary-600 dark:text-primary-400 mt-2 font-medium">{apiKeyStatus}</p>}
                  <button onClick={testMyAI} className="mt-2 text-xs text-gray-500 dark:text-gray-400 underline hover:text-primary-500">🔌 Test Connection</button>
                </div>
              )}

              {genProgress && (
                <div className="mt-3 p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 animate-slide-down">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{genProgress.label}</span>
                    <span className="text-sm text-primary-600 dark:text-primary-400">{genProgress.done}/{genProgress.total}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(genProgress.done / genProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 animate-fade-in stagger-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {activeTab === 'dataset' && (
              <>
                Showing <span className="font-semibold text-primary-600 dark:text-primary-400">{filteredDataset.length}</span> of{' '}
                <span className="font-semibold">{datasetTotal}</span> curated MCQs from study material
              </>
            )}
            {activeTab === 'ai' && (
              <>
                Showing <span className="font-semibold text-primary-600 dark:text-primary-400">{filteredQuestions.length}</span> AI-generated questions
                {bankCount > 0 && <span className="ml-2">• 🌐 {bankCount} shared</span>}
              </>
            )}
            {activeTab === 'wrongbook' && (
              <>
                <span className="font-semibold text-red-600 dark:text-red-400">{wrongBook.length}</span> questions in wrong book
              </>
            )}
          </p>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'dataset' && (
          <>
            {datasetLoading ? (
              <div className="glass-card p-12 text-center animate-fade-in">
                <div className="text-6xl mb-4 animate-bounce">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading study MCQs...</h3>
                <p className="text-gray-600 dark:text-gray-400">Extracting questions from {datasetTopics.length} subject files</p>
              </div>
            ) : pagedDataset.length === 0 ? (
              <div className="glass-card p-12 text-center animate-fade-in">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No MCQs found</h3>
                <p className="text-gray-600 dark:text-gray-400">Try changing the topic or difficulty filter</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {pagedDataset.map((q, index) => (
                    <DatasetMCQCard
                      key={q.id}
                      question={q}
                      index={index}
                      selectedAnswer={selectedAnswers[q.id]}
                      onSelectAnswer={(opt) => handleAnswerSelect(q.id, opt, q.answer, q)}
                      showExplanation={showExplanations[q.id]}
                      onToggleExplanation={() => setShowExplanations((p) => ({ ...p, [q.id]: !p[q.id] }))}
                      onTTS={() => handleTTS(`${q.question}. Options: ${q.options.join('. ')}. Correct answer: ${q.answer}. ${q.explanation}`, q.id)}
                      ttsActive={ttsSpeaking === q.id}
                    />
                  ))}
                </div>
                {hasMoreDataset && (
                  <div className="text-center mt-6">
                    <button onClick={() => setDatasetPage((p) => p + 1)} className="btn-primary px-8">
                      Load More ({pagedDataset.length} of {filteredDataset.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'ai' && (
          <>
            {filteredQuestions.length === 0 ? (
              <div className="glass-card p-12 text-center animate-fade-in">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No AI questions yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Add an API key above, then generate fresh questions from live web sources</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => setShowApiSettings(true)} className="btn-primary">⚙️ Add API Key</button>
                  <button onClick={generateBatch} className="btn-primary bg-gradient-to-r from-purple-600 to-pink-600">🚀 Generate Full Bank</button>
                </div>
              </div>
            ) : (
              <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {filteredQuestions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    showAnswer={showAnswer[question.id]}
                    onToggleAnswer={() => setShowAnswer((prev) => ({ ...prev, [question.id]: !prev[question.id] }))}
                    isBookmarked={bookmarked.has(question.id)}
                    onToggleBookmark={() => toggleBookmark(question.id)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'wrongbook' && (
          <>
            {wrongBook.length === 0 ? (
              <div className="glass-card p-12 text-center animate-fade-in">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Wrong book is empty!</h3>
                <p className="text-gray-600 dark:text-gray-400">Answer questions in Study MCQs tab — wrong answers are saved here for review</p>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button onClick={clearWrongBook} className="btn-secondary text-sm text-red-600">🗑️ Clear All</button>
                </div>
                <div className="space-y-4">
                  {wrongBook.map((q, index) => (
                    <DatasetMCQCard
                      key={q.id + '-wb'}
                      question={q}
                      index={index}
                      selectedAnswer={q.selectedAnswer}
                      onSelectAnswer={() => {}}
                      showExplanation={true}
                      onToggleExplanation={() => {}}
                      onTTS={() => handleTTS(`${q.question}. The correct answer is ${q.answer}. ${q.explanation}`, q.id)}
                      ttsActive={ttsSpeaking === q.id}
                      isWrongBook
                      onRemove={() => removeFromWrongBook(q.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}

function QuestionCard({ question, index, showAnswer, onToggleAnswer, isBookmarked, onToggleBookmark, viewMode }) {
  const diffColors = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const sourceIcons = {
    notopedia: '📄',
    nemotron: '🤖',
    openai: '🤖',
    groq: '🤖',
    gemini: '🤖',
    ai: '🤖',
  };

  if (viewMode === 'list') {
    return (
      <div className="glass-card-hover p-4 flex flex-col md:flex-row md:items-center gap-4 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
            <span className={`badge px-2 py-0.5 text-xs ${diffColors[question.difficulty] || 'badge-primary'}`}>
              {question.difficulty?.charAt(0).toUpperCase() + question.difficulty?.slice(1) || 'Medium'}
            </span>
            <span className="badge badge-primary text-xs">{question.topic || 'General'}</span>
            <span className="badge badge-primary text-xs">{sourceIcons[question.source] || '📝'} {question.source}</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white line-clamp-2 md:line-clamp-none">{question.question}</p>
        </div>
        <div className="flex items-center gap-2 md:ml-auto flex-shrink-0">
          <button
            onClick={onToggleBookmark}
            className={`p-2 rounded-xl transition-colors ${isBookmarked ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'}`}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
          >
            {isBookmarked ? '🔖' : '📌'}
          </button>
          <button
            onClick={onToggleAnswer}
            className="btn-secondary text-sm px-3 py-1.5"
          >
            {showAnswer ? 'Hide' : 'Show'} Answer
          </button>
        </div>
        {showAnswer && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 animate-slide-down">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-400 mb-2">
              <span>✅</span>
              <span className="font-semibold">Correct Answer:</span>
              <span className="font-mono">{question.answer}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Explanation:</strong> {question.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card-hover p-5 flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
          <span className={`badge px-2 py-0.5 text-xs ${diffColors[question.difficulty] || 'badge-primary'}`}>
            {question.difficulty?.charAt(0).toUpperCase() + question.difficulty?.slice(1) || 'Medium'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleBookmark}
            className={`p-2 rounded-xl transition-colors ${isBookmarked ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'}`}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
          >
            {isBookmarked ? '🔖' : '📌'}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            {sourceIcons[question.source] || '📝'}
          </span>
        </div>
      </div>

      <p className="font-medium text-gray-900 dark:text-white mb-4 flex-1 line-clamp-3">{question.question}</p>

      <div className="space-y-2 mb-4">
        {question.options?.map((option, optIndex) => (
          <div
            key={optIndex}
            className={`p-3 rounded-xl text-sm transition-all ${
              showAnswer
                ? option === question.answer
                  ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                  : 'bg-gray-50 dark:bg-dark-800'
                : 'bg-gray-50 dark:bg-dark-800 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            }`}
          >
            <span className="font-medium mr-2 text-primary-600 dark:text-primary-400">{String.fromCharCode(65 + optIndex)}.</span>
            <span className={showAnswer && option === question.answer ? 'font-semibold text-green-700 dark:text-green-400' : ''}>
              {option}
            </span>
            {showAnswer && option === question.answer && <span className="ml-2 text-green-600 dark:text-green-400">✓</span>}
          </div>
        ))}
      </div>

      <button
        onClick={onToggleAnswer}
        className="w-full btn-secondary text-sm py-2"
      >
        {showAnswer ? 'Hide Answer & Explanation' : 'Show Answer & Explanation'}
      </button>

      {showAnswer && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 animate-slide-down">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-400 mb-2">
            <span>✅</span>
            <span className="font-semibold">Correct Answer:</span>
            <span className="font-mono">{question.answer}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Explanation:</strong> {question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function DatasetMCQCard({ question, index, selectedAnswer, onSelectAnswer, showExplanation, onToggleExplanation, onTTS, ttsActive, isWrongBook, onRemove }) {
  const isCorrect = selectedAnswer === question.answer;
  const isAnswered = !!selectedAnswer;

  return (
    <div className={`glass-card-hover p-5 transition-all ${isWrongBook ? 'border-red-300 dark:border-red-800' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
          <span className="badge badge-primary text-xs">{question.topic}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">📖 Study Material</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onTTS} className={`p-2 rounded-xl transition-colors ${ttsActive ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`} title="Read aloud">
            {ttsActive ? '🔊' : '🔈'}
          </button>
          {isWrongBook && onRemove && (
            <button onClick={onRemove} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove from wrong book">🗑️</button>
          )}
        </div>
      </div>

      <p className="font-medium text-gray-900 dark:text-white mb-4">{question.question}</p>

      <div className="space-y-2 mb-4">
        {question.options.map((option, optIndex) => {
          let style = 'bg-gray-50 dark:bg-dark-800';
          if (isAnswered) {
            if (option === question.answer) style = 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500';
            else if (option === selectedAnswer && !isCorrect) style = 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500';
          }
          return (
            <button
              key={optIndex}
              onClick={() => onSelectAnswer(option)}
              disabled={isAnswered}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all ${style} ${!isAnswered ? 'hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer' : 'cursor-default'}`}
            >
              <span className="font-medium mr-2 text-primary-600 dark:text-primary-400">{String.fromCharCode(65 + optIndex)}.</span>
              <span className={isAnswered && option === question.answer ? 'font-semibold text-green-700 dark:text-green-400' : isAnswered && option === selectedAnswer && !isCorrect ? 'font-semibold text-red-700 dark:text-red-400' : ''}>
                {option}
              </span>
              {isAnswered && option === question.answer && <span className="ml-2 text-green-600">✓</span>}
              {isAnswered && option === selectedAnswer && !isCorrect && <span className="ml-2 text-red-600">✗</span>}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className={`p-4 rounded-xl border animate-slide-down ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
          <div className={`flex items-center gap-2 mb-2 ${isCorrect ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
            <span>{isCorrect ? '✅' : '❌'}</span>
            <span className="font-semibold">{isCorrect ? 'Correct!' : `Wrong! Correct answer: ${question.answer}`}</span>
          </div>
          <button onClick={onToggleExplanation} className="text-sm text-primary-600 dark:text-primary-400 underline mb-2">
            {showExplanation ? 'Hide explanation' : 'Show explanation'}
          </button>
          {showExplanation && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{question.explanation}</p>
          )}
        </div>
      )}

      {!isAnswered && (
        <button onClick={onToggleExplanation} className="text-sm text-gray-500 dark:text-gray-400 underline">
          {showExplanation ? 'Hide explanation' : 'Show explanation without answering'}
        </button>
      )}
      {showExplanation && !isAnswered && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-dark-800/50 rounded-xl text-sm text-gray-700 dark:text-gray-300">
          {question.explanation}
        </div>
      )}
    </div>
  );
}
