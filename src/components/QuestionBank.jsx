import { useState, useEffect } from 'react';
import { useStore } from '../store';
import Navbar from './Navbar';

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
  const { questions, setQuestions, setQuestionsError, setNotopediaData, setNotopediaLoading, userStats, updateUserStats } = useStore();
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [showAnswer, setShowAnswer] = useState({});
  const [bookmarked, setBookmarked] = useState(new Set());
  const [loadingNotopedia, setLoadingNotopedia] = useState(false);
  const [loadingNemotron, setLoadingNemotron] = useState(false);
  const [genProgress, setGenProgress] = useState(null);
  const [nemotronConfig, setNemotronConfig] = useState({ category: 'general-awareness', difficulty: 'medium', count: 25 });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState(null);

  // Load Notopedia data on mount if no saved questions exist
  useEffect(() => {
    if (questions.length === 0) {
      loadNotopediaData();
    }
    loadBookmarks();
    const savedKey = localStorage.getItem('nemotron-api-key');
    if (savedKey) setApiKeyInput(savedKey);
  }, []);

  const loadBookmarks = () => {
    const saved = localStorage.getItem('ssc-guide-bookmarks');
    if (saved) {
      try {
        setBookmarked(new Set(JSON.parse(saved)));
      } catch (e) {
        setBookmarked(new Set());
      }
    }
  };

  const toggleBookmark = (questionId) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      localStorage.setItem('ssc-guide-bookmarks', JSON.stringify([...next]));
      return next;
    });
  };

  const saveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) {
      localStorage.removeItem('nemotron-api-key');
      setApiKeyStatus('API key removed');
      return;
    }
    localStorage.setItem('nemotron-api-key', key);
    setApiKeyStatus('API key saved on this device');
    setTimeout(() => setApiKeyStatus(null), 3000);
  };

  const loadNotopediaData = async () => {
    setLoadingNotopedia(true);
    setNotopediaLoading(true);
    try {
      const response = await fetch('/api/notopedia/questions');
      const data = await response.json();
      if (data.success) {
        setNotopediaData(data.questions);
        // Merge: keep existing (generated) questions, add notopedia ones not already present
        setQuestions((prev) => {
          const existingKeys = new Set(prev.map((q) => (q.question || '').toLowerCase()));
          const fresh = data.questions.filter((q) => !existingKeys.has((q.question || '').toLowerCase()));
          return [...prev, ...fresh];
        });
      }
    } catch (error) {
      console.error('Failed to load Notopedia data:', error);
      setQuestionsError(error.message);
    } finally {
      setLoadingNotopedia(false);
      setNotopediaLoading(false);
    }
  };

  const generateNemotronQuestions = async () => {
    const apiKey = apiKeyInput.trim() || localStorage.getItem('nemotron-api-key') || '';
    if (!apiKey) {
      setApiKeyStatus('⚠️ Add your Nemotron API key in settings first (⚙️ button above)');
      setTimeout(() => setApiKeyStatus(null), 5000);
      return;
    }

    setLoadingNemotron(true);
    setGenProgress({ done: 0, total: 1, label: 'Generating...' });
    try {
      const response = await fetch('/api/nemotron/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nemotronConfig, apiKey }),
      });
      const data = await response.json();
      if (data.success) {
        setQuestions((prev) => {
          const existingKeys = new Set(prev.map((q) => (q.question || '').toLowerCase()));
          const fresh = data.questions.filter((q) => !existingKeys.has((q.question || '').toLowerCase()));
          return [...fresh, ...prev];
        });
        alert(`✅ Generated ${data.count} new questions and added them to the Question Bank!`);
      } else {
        alert(data.error || 'Failed to generate questions');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoadingNemotron(false);
      setGenProgress(null);
    }
  };

  // Batch generation: create 25 questions for each selected topic
  const generateBatch = async () => {
    const apiKey = apiKeyInput.trim() || localStorage.getItem('nemotron-api-key') || '';
    if (!apiKey) {
      setApiKeyStatus('⚠️ Add your Nemotron API key in settings first (⚙️ button above)');
      setTimeout(() => setApiKeyStatus(null), 5000);
      return;
    }

    const topics = Object.values(GENERATE_TOPICS);
    const batchCount = 25;
    const totalBatches = topics.length;

    setLoadingNemotron(true);
    setGenProgress({ done: 0, total: totalBatches, label: 'Starting batch generation...' });

    let added = 0;
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      setGenProgress({ done: i, total: totalBatches, label: `Generating ${topic.label} (${batchCount} Qs)...` });
      try {
        const response = await fetch('/api/nemotron/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: topic.id,
            difficulty: nemotronConfig.difficulty,
            count: batchCount,
            apiKey,
          }),
        });
        const data = await response.json();
        if (data.success) {
          setQuestions((prev) => {
            const existingKeys = new Set(prev.map((q) => (q.question || '').toLowerCase()));
            const fresh = data.questions.filter((q) => !existingKeys.has((q.question || '').toLowerCase()));
            return [...fresh, ...prev];
          });
          added += data.count;
        }
      } catch (error) {
        console.error(`Batch error for ${topic.id}:`, error);
      }
    }

    setLoadingNemotron(false);
    setGenProgress(null);
    alert(`✅ Batch complete! Added ${added} questions (25 per topic) to the Question Bank.`);
  };

  const filteredQuestions = questions
    .filter((q) => {
      if (selectedTopic !== 'all' && q.topic !== selectedTopic && q.category !== selectedTopic) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (searchQuery && !q.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by topic, then difficulty
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      const diffOrder = { easy: 0, medium: 1, hard: 2 };
      return (diffOrder[a.difficulty] || 1) - (diffOrder[b.difficulty] || 1);
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

  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Question Bank</h1>
          <p className="text-gray-600 dark:text-gray-400">Notopedia + AI-generated questions • Generate unlimited questions and they get saved to your bank</p>
        </div>

        {/* Toolbar */}
        <div className="glass-card p-4 mb-6 animate-fade-in stagger-1">
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
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="input-field min-w-[180px]"
            >
              {TOPICS.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.icon} {topic.name} {topic.count && `(${topic.count})`}
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

          {/* AI Generate Section */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">🤖 Generate Questions:</span>
              <select
                value={nemotronConfig.category}
                onChange={(e) => setNemotronConfig({...nemotronConfig, category: e.target.value})}
                className="input-field w-auto min-w-[160px] py-2 text-sm"
              >
                {GENERATE_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
              <select
                value={nemotronConfig.difficulty}
                onChange={(e) => setNemotronConfig({...nemotronConfig, difficulty: e.target.value})}
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
                value={nemotronConfig.count}
                onChange={(e) => setNemotronConfig({...nemotronConfig, count: parseInt(e.target.value) || 25})}
                className="input-field w-auto min-w-[70px] py-2 text-sm"
              />
              <button
                onClick={generateNemotronQuestions}
                disabled={loadingNemotron}
                className="btn-primary py-2 px-4 text-sm"
              >
                {loadingNemotron ? 'Generating...' : '🎯 Generate & Add to Bank'}
              </button>
              <button
                onClick={generateBatch}
                disabled={loadingNemotron}
                className="btn-primary py-2 px-4 text-sm bg-gradient-to-r from-purple-600 to-pink-600"
                title="Generate 25 questions for each of the 10 topics (250 total)"
              >
                {loadingNemotron ? 'Generating...' : '🚀 Batch: 25 Qs × 10 Topics (250)'}
              </button>
              <button
                onClick={loadNotopediaData}
                disabled={loadingNotopedia}
                className="btn-secondary py-2 px-4 text-sm"
              >
                {loadingNotopedia ? 'Loading...' : '🔄 Refresh from Notopedia'}
              </button>
              <button
                onClick={() => setShowApiSettings(!showApiSettings)}
                className={`btn-secondary py-2 px-3 text-sm ${apiKeyInput ? 'border-green-400' : ''}`}
                title="API key settings"
              >
                ⚙️ {apiKeyInput ? 'Key Set ✓' : 'API Key'}
              </button>
            </div>

            {/* API Key Settings */}
            {showApiSettings && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-dark-800/50 rounded-xl border border-gray-200 dark:border-gray-700 animate-slide-down">
                <label className="label-text">Nemotron API Key</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="nvapi-..."
                    className="input-field flex-1"
                    autoComplete="off"
                  />
                  <button onClick={saveApiKey} className="btn-primary py-2 px-4 text-sm whitespace-nowrap">💾 Save Key</button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  🔒 Get a free key from <a href="https://build.nvidia.com/explore/discover" target="_blank" rel="noreferrer" className="text-primary-600 underline">build.nvidia.com</a>.
                  Your key is stored only in your browser's local storage and sent to the AI provider — never exposed publicly.
                  {apiKeyStatus && <span className="block mt-1 text-primary-600 dark:text-primary-400 font-medium">{apiKeyStatus}</span>}
                </p>
              </div>
            )}

            {/* Generation Progress */}
            {genProgress && (
              <div className="mt-3 p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 animate-slide-down">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {genProgress.label}
                  </span>
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    {genProgress.done}/{genProgress.total}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(genProgress.done / genProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 animate-fade-in stagger-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-primary-600 dark:text-primary-400">{filteredQuestions.length}</span> of{' '}
            <span className="font-semibold">{questions.length}</span> questions
            {selectedTopic !== 'all' && <span className="ml-2">(filtered by {getTopicInfo(selectedTopic)})</span>}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {GENERATE_TOPICS.slice(0, 10).map((t) => {
              const count = questions.filter((q) => q.topic === t.id || q.category === t.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${
                    selectedTopic === t.id
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                  }`}
                >
                  {t.icon} {t.label} <span className="font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions List */}
        {filteredQuestions.length === 0 ? (
          <div className="glass-card p-12 text-center animate-fade-in">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No questions found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your filters, refresh from Notopedia, or generate fresh questions with AI</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={loadNotopediaData} className="btn-primary">🔄 Load Notopedia Questions</button>
              <button onClick={generateBatch} className="btn-primary bg-gradient-to-r from-purple-600 to-pink-600">🚀 Generate Full Question Bank</button>
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

        {/* Pagination would go here for large datasets */}
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