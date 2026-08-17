import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { fetchSharedBank, fetchDatasetMCQs, shuffleArray, selectQuestions } from '../services/api';
import { jsPDF } from 'jspdf';
import Navbar from './Navbar';

const SECTIONS = [
  { id: 'general-awareness', name: 'General Awareness', icon: '🌍', color: 'from-blue-500 to-cyan-500', topicPrefixes: ['general-awareness', 'current-affairs', 'history', 'geography', 'polity', 'economy', 'science', 'art-culture', 'environment', 'computer', 'miscellaneous-gk'] },
  { id: 'reasoning', name: 'Reasoning', icon: '🧩', color: 'from-purple-500 to-pink-500', topicPrefixes: ['reasoning'] },
  { id: 'quant', name: 'Quantitative Aptitude', icon: '🔢', color: 'from-green-500 to-emerald-500', topicPrefixes: ['quant'] },
  { id: 'english', name: 'English Comprehension', icon: '📝', color: 'from-orange-500 to-red-500', topicPrefixes: ['english'] },
];

const TEST_MODES = [
  { id: 'full-mock', name: 'Full Tier-I Mock', desc: '100 questions · 60 minutes · 4 sections × 25 each', icon: '📋', questions: 100, time: 60, sections: true },
  { id: 'sectional', name: 'Sectional Test', desc: '25 questions · 15 minutes · Single section', icon: '⚡', questions: 25, time: 15, sections: false },
  { id: 'quick', name: 'Quick Practice', desc: '10 questions · 6 minutes · Mixed topics', icon: '⏱️', questions: 10, time: 6, sections: false },
  { id: 'custom', name: 'Custom Test', desc: 'Choose your own settings', icon: '⚙️', questions: 25, time: 15, sections: false },
];

export default function TestCreator() {
  const { questions, setQuestions, addTestToHistory, userStats, updateUserStats } = useStore();
  const [step, setStep] = useState('config'); // config, test, results
  const [testMode, setTestMode] = useState('sectional');
  const [selectedSection, setSelectedSection] = useState('general-awareness');
  const [customCount, setCustomCount] = useState(25);
  const [customTime, setCustomTime] = useState(15);
  const [datasetMcqs, setDatasetMcqs] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Test state
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const timerRef = useRef(null);

  // Load all questions on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bank, mcqRes] = await Promise.all([
          fetchSharedBank().catch(() => []),
          fetch('/api/notes-mcqs').then((r) => r.json()).catch(() => ({ mcqs: [] })),
        ]);
        const mcqs = mcqRes.mcqs || [];
        setDatasetMcqs(mcqs);
        // Merge: bank questions + dataset MCQs (deduplicated by question text)
        const seen = new Set();
        const merged = [];
        for (const q of [...mcqs, ...bank]) {
          const key = (q.question || '').toLowerCase().trim();
          if (key && !seen.has(key)) {
            seen.add(key);
            merged.push({
              id: q.id || `q-${merged.length}`,
              question: q.question,
              options: q.options || [],
              answer: q.answer,
              explanation: q.explanation || '',
              topic: q.topic || q.category || 'general',
              difficulty: q.difficulty || 'medium',
              source: q.source || 'bank',
            });
          }
        }
        setAllQuestions(merged);
        setQuestions(merged);
      } catch (e) {
        console.error('Failed to load questions:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Timer
  useEffect(() => {
    if (step === 'test' && timeLeft > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, submitted]);

  const getQuestionsForSection = (sectionId) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return [];
    return allQuestions.filter((q) => {
      const qTopic = (q.topic || '').toLowerCase();
      return section.topicPrefixes.some((p) => {
        const pref = p.toLowerCase();
        return qTopic === pref || qTopic.startsWith(pref + '-') || qTopic.includes(pref);
      });
    });
  };

  const findSectionForTopic = (topic) => {
    const qTopic = (topic || '').toLowerCase();
    return SECTIONS.find((s) => s.topicPrefixes.some((p) => {
      const pref = p.toLowerCase();
      return qTopic === pref || qTopic.startsWith(pref + '-') || qTopic.includes(pref);
    })) || SECTIONS[0];
  };

  const startTest = () => {
    const mode = TEST_MODES.find((m) => m.id === testMode);
    let questions = [];
    let timeMinutes = customTime;

    if (testMode === 'full-mock') {
      // 25 questions from each section
      for (const section of SECTIONS) {
        const sectionQs = getQuestionsForSection(section.id);
        questions.push(...selectQuestions(sectionQs, 25));
      }
      timeMinutes = 60;
    } else if (testMode === 'sectional') {
      const sectionQs = getQuestionsForSection(selectedSection);
      questions = selectQuestions(sectionQs, Math.min(25, sectionQs.length));
      timeMinutes = 15;
    } else if (testMode === 'quick') {
      questions = selectQuestions(allQuestions, 10);
      timeMinutes = 6;
    } else {
      // custom
      if (selectedSection === 'mixed') {
        questions = selectQuestions(allQuestions, customCount);
      } else {
        const sectionQs = getQuestionsForSection(selectedSection);
        questions = selectQuestions(sectionQs, Math.min(customCount, sectionQs.length));
      }
      timeMinutes = customTime;
    }

    if (questions.length === 0) {
      alert('No questions available for this selection. Generate questions in Question Bank first.');
      return;
    }

    setTestQuestions(questions);
    setCurrentSection(0);
    setCurrentQ(0);
    setAnswers({});
    setMarked(new Set());
    setTimeLeft(timeMinutes * 60);
    setSubmitted(false);
    setScore(null);
    setShowReview(false);
    setStep('test');
  };

  const handleAnswer = (qIndex, option) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: option }));
  };

  const toggleMark = (qIndex) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(qIndex)) next.delete(qIndex);
      else next.add(qIndex);
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    const sectionScores = {};

    SECTIONS.forEach((s) => { sectionScores[s.id] = { correct: 0, wrong: 0, total: 0 }; });

    testQuestions.forEach((q, i) => {
      const userAns = answers[i];
      const section = findSectionForTopic(q.topic);
      sectionScores[section.id].total++;

      if (!userAns) {
        unattempted++;
      } else if (userAns === q.answer) {
        correct++;
        sectionScores[section.id].correct++;
      } else {
        wrong++;
        sectionScores[section.id].wrong++;
      }
    });

    // SSC CGL marking: +2 correct, -0.5 wrong
    const marks = (correct * 2) - (wrong * 0.5);
    const maxMarks = testQuestions.length * 2;
    const percentage = ((marks / maxMarks) * 100).toFixed(1);

    const newScore = { correct, wrong, unattempted, total: testQuestions.length, marks: marks.toFixed(1), maxMarks, percentage: parseFloat(percentage), sectionScores };
    setScore(newScore);

    updateUserStats({
      totalQuestionsAttempted: userStats.totalQuestionsAttempted + testQuestions.length,
      totalCorrect: userStats.totalCorrect + correct,
      totalTestsTaken: userStats.totalTestsTaken + 1,
      averageScore: ((userStats.averageScore * userStats.totalTestsTaken) + parseFloat(percentage)) / (userStats.totalTestsTaken + 1),
    });

    addTestToHistory({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mode: testMode,
      section: selectedSection,
      questions: testQuestions.length,
      time: testMode === 'full-mock' ? 60 : testMode === 'quick' ? 6 : testMode === 'sectional' ? 15 : customTime,
      score: newScore,
      answers,
    });

    setStep('results');
  };

  const retryTest = () => {
    setAnswers({});
    setMarked(new Set());
    setSubmitted(false);
    setScore(null);
    setCurrentQ(0);
    const mode = TEST_MODES.find((m) => m.id === testMode);
    const time = testMode === 'full-mock' ? 60 : testMode === 'quick' ? 6 : testMode === 'sectional' ? 15 : customTime;
    setTimeLeft(time * 60);
    setTestQuestions(shuffleArray(testQuestions));
    setStep('test');
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getTopicLabel = (topic) => {
    const labels = {
      'general-awareness': 'GA', 'current-affairs': 'CA', 'history': 'Hist', 'geography': 'Geo',
      'polity': 'Pol', 'economy': 'Eco', 'science': 'Sci', 'art-culture': 'Art',
      'environment': 'Env', 'computer': 'Comp', 'miscellaneous-gk': 'Misc',
      'reasoning': 'Reason', 'quant': 'Quant', 'english': 'Eng',
    };
    return labels[topic] || topic.slice(0, 4);
  };

  // ========== CONFIG SCREEN ==========
  if (step === 'config') {
    const totalAvailable = allQuestions.length;
    const sectionCounts = SECTIONS.map((s) => ({
      ...s,
      count: getQuestionsForSection(s.id).length,
    }));

    return (
      <div className="min-h-screen pb-20 safe-area-inset-bottom">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Exam</h1>
            <p className="text-gray-600 dark:text-gray-400">Practice like the real SSC CGL examination</p>
          </div>

          {loading ? (
            <div className="glass-card p-12 text-center animate-fade-in">
              <div className="text-6xl mb-4 animate-bounce">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Loading question bank...</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Combining {datasetMcqs.length} study MCQs + shared bank questions</p>
            </div>
          ) : (
            <>
              {/* Question Bank Stats */}
              <div className="glass-card p-6 mb-6 animate-fade-in stagger-1">
                <h2 className="section-title mb-4">📊 Question Bank</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {sectionCounts.map((s) => (
                    <div key={s.id} className={`p-4 rounded-xl bg-gradient-to-br ${s.color} text-white text-center`}>
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-2xl font-bold">{s.count}</div>
                      <div className="text-xs opacity-80">{s.name}</div>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">Total: {totalAvailable} questions available</p>
              </div>

              {/* Test Modes */}
              <div className="glass-card p-6 mb-6 animate-fade-in stagger-2">
                <h2 className="section-title mb-4">🎯 Exam Mode</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TEST_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setTestMode(mode.id)}
                      className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left group ${
                        testMode === mode.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{mode.icon}</span>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block">{mode.name}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{mode.desc}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Selection (for sectional/custom) */}
              {testMode !== 'full-mock' && testMode !== 'quick' && (
                <div className="glass-card p-6 mb-6 animate-fade-in stagger-3">
                  <h2 className="section-title mb-4">📂 Select Section</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {testMode === 'custom' && (
                      <button
                        onClick={() => setSelectedSection('mixed')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedSection === 'mixed' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                        }`}
                      >
                        <span className="text-2xl">🎯</span>
                        <span className="font-medium text-gray-900 dark:text-white block mt-1">Mixed</span>
                      </button>
                    )}
                    {SECTIONS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSection(s.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedSection === s.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                        }`}
                      >
                        <span className="text-2xl">{s.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white block mt-1">{s.name}</span>
                        <span className="text-xs text-gray-500">{getQuestionsForSection(s.id).length} Qs</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom settings */}
              {testMode === 'custom' && (
                <div className="glass-card p-6 mb-6 animate-fade-in stagger-4">
                  <h2 className="section-title mb-4">⚙️ Custom Settings</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">Questions</label>
                      <input type="number" min="5" max="100" value={customCount} onChange={(e) => setCustomCount(Math.min(100, Math.max(5, parseInt(e.target.value) || 5)))} className="input-field" />
                    </div>
                    <div>
                      <label className="label-text">Time (minutes)</label>
                      <input type="number" min="1" max="120" value={customTime} onChange={(e) => setCustomTime(Math.min(120, Math.max(1, parseInt(e.target.value) || 1)))} className="input-field" />
                    </div>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button onClick={startTest} disabled={allQuestions.length === 0}
                className="w-full btn-primary py-4 text-lg animate-fade-in stagger-5 group">
                {allQuestions.length === 0 ? '⚠️ No questions available — go to Question Bank first' : (
                  <span className="flex items-center justify-center gap-2">
                    <span className="group-hover:scale-110 transition-transform">🚀</span>
                    Start {TEST_MODES.find((m) => m.id === testMode)?.name}
                  </span>
                )}
              </button>
            </>
          )}
        </main>
      </div>
    );
  }

  // ========== TEST SCREEN ==========
  if (step === 'test') {
    const q = testQuestions[currentQ];
    const answeredCount = Object.keys(answers).length;
    const markedCount = marked.size;
    const progress = testQuestions.length > 0 ? (answeredCount / testQuestions.length) * 100 : 0;
    const sectionInfo = q ? findSectionForTopic(q.topic) : SECTIONS[0];

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Fixed Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v2h18V7L12 2zM5 11v6h3v-6H5zm5.5 0v6h3v-6h-3zm5.5 0v6h3v-6h-3zM3 19v2h18v-2H3z"/></svg>
                </div>
                <span className="font-bold text-gray-900 dark:text-white hidden sm:block">PrepMaster</span>
                <span className="badge badge-primary">{sectionInfo.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold ${
                  timeLeft < 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse' :
                  timeLeft < 300 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  ⏱️ {formatTime(timeLeft)}
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{answeredCount}/{testQuestions.length}</div>
                  <div className="progress-bar w-32 mt-1"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-4">
          <div className="max-w-6xl mx-auto flex gap-4">
            {/* Question Navigator Sidebar */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-20 glass-card p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Question Palette</h3>
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {testQuestions.map((_, i) => (
                    <button key={i} onClick={() => setCurrentQ(i)}
                      className={`w-full aspect-square rounded-lg text-xs font-medium transition-all ${
                        i === currentQ ? 'bg-primary-500 text-white shadow-lg scale-110' :
                        answers[i] ? 'bg-green-500 text-white' :
                        marked.has(i) ? 'bg-yellow-400 text-white' :
                        'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-primary-100'
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary-500" /> Current</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /> Answered ({answeredCount})</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-400" /> Marked ({markedCount})</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" /> Unvisited ({testQuestions.length - answeredCount - markedCount})</div>
                </div>
                <button onClick={handleSubmit} className="w-full btn-primary mt-4 py-2.5 text-sm">
                  ✅ Submit Exam
                </button>
              </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 animate-slide-up">
              {q && (
                <div className="glass-card-hover p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300">
                        {currentQ + 1}
                      </span>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Question {currentQ + 1} of {testQuestions.length}</span>
                        <span className={`ml-2 badge text-xs ${q.difficulty === 'easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {typeof q.difficulty === 'string' && q.difficulty ? (q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)) : 'Medium'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => toggleMark(currentQ)}
                      className={`p-2 rounded-xl transition-all ${marked.has(currentQ) ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 dark:bg-dark-800 text-gray-400 hover:text-yellow-500'}`}>
                      {marked.has(currentQ) ? '🔖' : '📌'}
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 leading-relaxed">{q.question}</h3>

                  <div className="space-y-3">
                    {q.options.map((opt, oi) => (
                      <button key={oi} onClick={() => handleAnswer(currentQ, opt)}
                        className={`w-full p-4 rounded-xl text-left border-2 transition-all duration-200 ${
                          answers[currentQ] === opt
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-dark-800/50'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all ${
                            answers[currentQ] === opt
                              ? 'border-primary-500 bg-primary-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                          }`}>
                            {String.fromCharCode(65 + oi)}
                          </div>
                          <span className="text-gray-900 dark:text-white">{opt}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="mt-8 flex items-center justify-between">
                    <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="btn-secondary">
                      ← Previous
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => toggleMark(currentQ)} className="btn-secondary text-sm">
                        {marked.has(currentQ) ? '🔖 Unmark' : '📌 Mark'}
                      </button>
                      {currentQ < testQuestions.length - 1 ? (
                        <button onClick={() => setCurrentQ(currentQ + 1)} className="btn-primary">Next →</button>
                      ) : (
                        <button onClick={handleSubmit} className="btn-primary bg-gradient-to-r from-green-600 to-emerald-600">✅ Submit</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== RESULTS SCREEN ==========
  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16">
        <div className="animate-fade-in">
          {/* Score Card */}
          <div className="glass-card-hover p-8 text-center mb-8">
            <div className="text-7xl mb-4">{score.percentage >= 70 ? '🎉' : score.percentage >= 50 ? '👍' : '📚'}</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exam Completed!</h1>

            <div className="inline-flex items-center gap-6 my-6 p-6 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl text-white shadow-xl">
              <div className="text-center">
                <div className="text-4xl font-bold">{score.marks}</div>
                <div className="text-sm opacity-80">Marks</div>
                <div className="text-xs opacity-60">out of {score.maxMarks}</div>
              </div>
              <div className="w-px h-16 bg-white/30" />
              <div className="text-center">
                <div className="text-3xl font-bold text-green-200">{score.correct}</div>
                <div className="text-sm opacity-80">Correct</div>
              </div>
              <div className="w-px h-16 bg-white/30" />
              <div className="text-center">
                <div className="text-3xl font-bold text-red-200">{score.wrong}</div>
                <div className="text-sm opacity-80">Wrong</div>
              </div>
              <div className="w-px h-16 bg-white/30" />
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-200">{score.unattempted}</div>
                <div className="text-sm opacity-80">Skipped</div>
              </div>
            </div>

            {/* Section-wise breakdown */}
            {score.sectionScores && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {SECTIONS.map((s) => {
                  const ss = score.sectionScores[s.id];
                  if (!ss || ss.total === 0) return null;
                  return (
                    <div key={s.id} className={`p-4 rounded-xl bg-gradient-to-br ${s.color} text-white`}>
                      <div className="text-lg font-bold">{ss.correct}/{ss.total}</div>
                      <div className="text-xs opacity-80">{s.name}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={retryTest} className="btn-primary">🔄 Retry</button>
              <button onClick={() => setStep('config')} className="btn-secondary">📝 New Exam</button>
              <button onClick={() => {
                const doc = new jsPDF();
                doc.setFontSize(18); doc.text('PrepMaster - Exam Results', 20, 20);
                doc.setFontSize(12);
                doc.text(`Score: ${score.marks}/${score.maxMarks} (${score.percentage}%)`, 20, 32);
                doc.text(`Correct: ${score.correct} | Wrong: ${score.wrong} | Skipped: ${score.unattempted}`, 20, 40);
                let y = 55;
                testQuestions.forEach((q, i) => {
                  if (y > 270) { doc.addPage(); y = 20; }
                  const ua = answers[i] || 'Not answered';
                  const ok = ua === q.answer;
                  doc.setFontSize(9);
                  doc.text(`${i+1}. ${q.question.slice(0, 80)}`, 20, y); y += 6;
                  doc.text(`Your: ${ua.slice(0, 50)} ${ok ? '✓' : '✗'} | Correct: ${q.answer}`, 25, y); y += 8;
                });
                doc.save(`PrepMaster_Exam_${new Date().toISOString().split('T')[0]}.pdf`);
              }} className="btn-secondary">📄 Download PDF</button>
            </div>
          </div>

          {/* Answer Review */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-4">📋 Answer Review</h2>
            <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-2">
              {testQuestions.map((q, i) => {
                const ua = answers[i] || 'Not answered';
                const ok = ua === q.answer;
                const section = findSectionForTopic(q.topic);
                return (
                  <div key={i} className={`p-4 rounded-xl border transition-all ${ok ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">{i + 1}</span>
                      <span className={`badge text-xs ${ok ? 'badge-success' : 'badge-danger'}`}>{ok ? '✅ Correct' : '❌ Wrong'}</span>
                      <span className="badge text-xs badge-primary">{section.icon} {section.name}</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm mb-2">{q.question}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${ok ? 'bg-green-100 text-green-800 dark:bg-green-900/30' : 'bg-red-100 text-red-800 dark:bg-red-900/30'}`}>Your: {ua}</span>
                      {!ok && <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30">Correct: {q.answer}</span>}
                    </div>
                    {q.explanation && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">💡 {q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
