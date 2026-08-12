import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { selectQuestions, shuffleArray } from '../services/api';
import { jsPDF } from 'jspdf';
import Navbar from './Navbar';

const TEST_TOPICS = [
  { id: 'mixed', name: 'Full Syllabus (Mixed)', icon: '🎯', sections: ['general-awareness', 'reasoning', 'quant', 'english'] },
  { id: 'general-awareness', name: 'General Awareness', icon: '🌍', sections: ['general-awareness', 'current-affairs', 'history', 'geography', 'polity', 'economy', 'science'] },
  { id: 'reasoning', name: 'Reasoning', icon: '🧩', sections: ['reasoning'] },
  { id: 'quant', name: 'Quantitative Aptitude', icon: '🔢', sections: ['quant'] },
  { id: 'english', name: 'English Comprehension', icon: '📝', sections: ['english'] },
];

const TEST_CONFIGS = [
  { id: 'tier1-full', name: 'Full Tier-I Mock (100 Q, 60 min)', questions: 100, time: 60, icon: '📋' },
  { id: 'tier1-section', name: 'Sectional Test (25 Q, 15 min)', questions: 25, time: 15, icon: '⚡' },
  { id: 'quick', name: 'Quick Practice (10 Q, 6 min)', questions: 10, time: 6, icon: '⏱️' },
  { id: 'custom', name: 'Custom Test', questions: 25, time: 15, icon: '⚙️' },
];

export default function TestCreator() {
  const { questions, currentTest, setCurrentTest, clearCurrentTest, addTestToHistory, userStats, updateUserStats } = useStore();
  const [step, setStep] = useState('config'); // config, test, results
  const [selectedTopic, setSelectedTopic] = useState('mixed');
  const [selectedConfig, setSelectedConfig] = useState('tier1-section');
  const [customQuestions, setCustomQuestions] = useState(25);
  const [customTime, setCustomTime] = useState(15);
  const [testQuestions, setTestQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [showReview, setShowReview] = useState(false);

  // Timer effect
  useEffect(() => {
    if (step === 'test' && timeLeft > 0 && !submitted) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    }
    if (timerInterval) clearInterval(timerInterval);
  }, [timeLeft, submitted, step]);

  const generateTest = () => {
    let config = TEST_CONFIGS.find(c => c.id === selectedConfig);
    if (!config) config = TEST_CONFIGS[1];

    const qCount = selectedConfig === 'custom' ? customQuestions : config.questions;
    const time = selectedConfig === 'custom' ? customTime : config.time;

    let filteredQuestions = questions;
    if (selectedTopic !== 'mixed') {
      const topicConfig = TEST_TOPICS.find(t => t.id === selectedTopic);
      if (topicConfig) {
        filteredQuestions = questions.filter(q => topicConfig.sections.includes(q.topic || q.category));
      }
    }

    if (filteredQuestions.length < qCount) {
      alert(`Not enough questions available. Only ${filteredQuestions.length} questions for this topic.`);
      return;
    }

    const selected = selectQuestions(filteredQuestions, qCount);
    setTestQuestions(selected);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeLeft(time * 60);
    setSubmitted(false);
    setScore(null);
    setShowReview(false);
    setCurrentTest({ topic: selectedTopic, config: selectedConfig, questions: selected });
    setStep('test');
  };

  const handleAnswer = (questionIndex, option) => {
    if (!submitted) {
      setAnswers((prev) => ({ ...prev, [questionIndex]: option }));
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (timerInterval) clearInterval(timerInterval);

    let correct = 0;
    testQuestions.forEach((q, i) => {
      if (answers[i] && answers[i].toLowerCase() === q.answer.toLowerCase()) {
        correct++;
      }
    });

    const percentage = ((correct / testQuestions.length) * 100).toFixed(1);
    const newScore = { correct, total: testQuestions.length, percentage: parseFloat(percentage) };
    setScore(newScore);

    // Update user stats
    updateUserStats({
      totalQuestionsAttempted: userStats.totalQuestionsAttempted + testQuestions.length,
      totalCorrect: userStats.totalCorrect + correct,
      totalTestsTaken: userStats.totalTestsTaken + 1,
      averageScore: ((userStats.averageScore * userStats.totalTestsTaken) + parseFloat(percentage)) / (userStats.totalTestsTaken + 1),
    });

    // Save to history
    addTestToHistory({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      topic: selectedTopic,
      config: selectedConfig,
      questions: testQuestions.length,
      time: selectedConfig === 'custom' ? customTime : TEST_CONFIGS.find(c => c.id === selectedConfig)?.time || 15,
      score: newScore,
      answers,
    });

    setShowReview(true);
  };

  const retryTest = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setShowReview(false);
    setCurrentQuestionIndex(0);
    const config = TEST_CONFIGS.find(c => c.id === selectedConfig);
    setTimeLeft((config?.time || 15) * 60);
    setTestQuestions(shuffleArray(testQuestions));
  };

  const newTest = () => {
    clearCurrentTest();
    setStep('config');
    setTestQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSubmitted(false);
    setScore(null);
    setShowReview(false);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('SSC CGL Test Results', 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Topic: ${TEST_TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic}`, 20, 38);
    doc.text(`Score: ${score?.percentage}% (${score?.correct}/${score?.total})`, 20, 46);
    doc.text(`Time: ${Math.floor((selectedConfig === 'custom' ? customTime : TEST_CONFIGS.find(c => c.id === selectedConfig)?.time || 15) * 60 - timeLeft) / 60} min`, 20, 54);

    let y = 70;
    testQuestions.forEach((q, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const userAns = answers[i] || 'Not answered';
      const isCorrect = userAns.toLowerCase() === q.answer.toLowerCase();
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${q.question}`, 20, y);
      y += 8;
      doc.text(`Your Answer: ${userAns} ${isCorrect ? '✓' : '✗'}`, 25, y);
      y += 6;
      doc.text(`Correct: ${q.answer}`, 25, y);
      y += 6;
      if (q.explanation) {
        const lines = doc.splitTextToSize(`Explanation: ${q.explanation}`, 170);
        doc.text(lines, 25, y);
        y += lines.length * 5;
      }
      y += 5;
    });

    doc.save(`SSC_CGL_Test_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = testQuestions.length > 0 ? (Object.keys(answers).length / testQuestions.length) * 100 : 0;

  if (step === 'config') {
    return (
      <div className="min-h-screen pb-20 safe-area-inset-bottom">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Test</h1>
            <p className="text-gray-600 dark:text-gray-400">Generate topic-wise tests for SSC CGL Tier-I preparation</p>
          </div>

          <div className="glass-card p-6 animate-fade-in stagger-1">
            <h2 className="section-title mb-4">Select Test Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {TEST_CONFIGS.map((config) => (
                <button
                  key={config.id}
                  onClick={() => setSelectedConfig(config.id)}
                  className={`p-5 rounded-2xl border-2 transition-all text-left ${
                    selectedConfig === config.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{config.icon}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{config.name}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>📝 {config.questions} Questions</span>
                    <span>⏱️ {config.time} Minutes</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedConfig === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
                <div>
                  <label className="label-text">Number of Questions</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={customQuestions}
                    onChange={(e) => setCustomQuestions(Math.min(100, Math.max(5, parseInt(e.target.value) || 5)))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text">Time (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={customTime}
                    onChange={(e) => setCustomTime(Math.min(120, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="input-field"
                  />
                </div>
              </div>
            )}

            <h2 className="section-title mb-4">Select Topic</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {TEST_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedTopic === topic.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{topic.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{topic.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {topic.id === 'mixed' ? 'All sections combined' : `${topic.sections.length} sub-topics`}
                  </p>
                </button>
              ))}
            </div>

            <div className="glass-card p-4 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 border-primary-200">
              <h3 className="font-semibold text-primary-800 dark:text-primary-300 mb-2">Available Questions</h3>
              <p className="text-sm text-primary-700 dark:text-primary-400">
                {(() => {
                  let filtered = questions;
                  if (selectedTopic !== 'mixed') {
                    const topicConfig = TEST_TOPICS.find(t => t.id === selectedTopic);
                    if (topicConfig) filtered = questions.filter(q => topicConfig.sections.includes(q.topic || q.category));
                  }
                  return `${filtered.length} questions available for "${TEST_TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic}"`;
                })()}
              </p>
            </div>

            <button
              onClick={generateTest}
              disabled={questions.length === 0}
              className="w-full btn-primary py-4 text-lg"
            >
              {questions.length === 0 ? 'Load Questions First' : `Start ${TEST_CONFIGS.find(c => c.id === selectedConfig)?.name || 'Test'}`}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'test') {
    const currentQuestion = testQuestions[currentQuestionIndex];
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="min-h-screen pb-20 safe-area-inset-bottom">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  {TEST_CONFIGS.find(c => c.id === selectedConfig)?.name || 'Test'}
                </h2>
                <span className="badge badge-primary">{TEST_TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg ${
                  timeLeft < 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse' :
                  timeLeft < 300 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  ⏱️ {formatTime(timeLeft)}
                </div>
                <div className="hidden sm:block">
                  <div className="progress-bar w-48">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">{answeredCount}/{testQuestions.length} answered</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-20 pb-8 px-4">
          {/* Question Navigator */}
          <div className="max-w-3xl mx-auto mb-6 glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900 dark:text-white">Question Palette</span>
              <button
                onClick={() => setShowReview(!showReview)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                {showReview ? 'Hide' : 'Show'} Review
              </button>
            </div>
            <div className="grid grid-cols-10 gap-2" role="tablist" aria-label="Question navigator">
              {testQuestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  role="tab"
                  aria-selected={i === currentQuestionIndex}
                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                    i === currentQuestionIndex
                      ? 'bg-primary-500 text-white shadow-lg'
                      : answers[i]
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Question Card */}
          <div className="max-w-3xl mx-auto animate-slide-up">
            {currentQuestion && (
              <div className="glass-card-hover p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="badge badge-primary mb-2">Q{currentQuestionIndex + 1} of {testQuestions.length}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{currentQuestion.question}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge px-2 py-1 ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' : currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {currentQuestion.difficulty?.charAt(0).toUpperCase() + currentQuestion.difficulty?.slice(1) || 'Medium'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {currentQuestion.options?.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => handleAnswer(currentQuestionIndex, option)}
                      disabled={submitted}
                      className={`w-full p-4 rounded-xl text-left border-2 transition-all ${
                        submitted
                          ? option === currentQuestion.answer
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : answers[currentQuestionIndex] === option
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          : answers[currentQuestionIndex] === option
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium ${
                          submitted
                            ? option === currentQuestion.answer
                              ? 'border-green-500 bg-green-500 text-white'
                              : answers[currentQuestionIndex] === option
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-gray-300 dark:border-gray-600'
                            : answers[currentQuestionIndex] === option
                              ? 'border-primary-500 bg-primary-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {String.fromCharCode(65 + optIndex)}
                        </div>
                        <span className="text-gray-900 dark:text-white">{option}</span>
                        {submitted && option === currentQuestion.answer && (
                          <span className="ml-auto text-green-600 dark:text-green-400 font-semibold">✓ Correct</span>
                        )}
                        {submitted && answers[currentQuestionIndex] === option && option !== currentQuestion.answer && (
                          <span className="ml-auto text-red-600 dark:text-red-400 font-semibold">✗ Your Answer</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {submitted && currentQuestion.explanation && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 mb-2">
                      <span>💡</span>
                      <span className="font-semibold">Explanation</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{currentQuestion.explanation}</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0 || submitted}
                    className="btn-secondary"
                  >
                    ← Previous
                  </button>
                  <div className="flex gap-2">
                    {currentQuestionIndex < testQuestions.length - 1 ? (
                      <button
                        onClick={() => goToQuestion(currentQuestionIndex + 1)}
                        disabled={submitted}
                        className="btn-primary"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={submitted ? retryTest : handleSubmit}
                        className={submitted ? 'btn-secondary' : 'btn-primary'}
                      >
                        {submitted ? '🔄 Retry Test' : '✅ Submit Test'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Results Step
  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16">
        <div className="animate-fade-in">
          <div className="glass-card-hover p-8 text-center mb-8">
            <div className="text-6xl mb-4">{score.percentage >= 70 ? '🎉' : score.percentage >= 50 ? '👍' : '📚'}</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Test Completed!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{TEST_CONFIGS.find(c => c.id === selectedConfig)?.name} • {TEST_TOPICS.find(t => t.id === selectedTopic)?.name}</p>

            <div className="inline-flex items-center gap-4 mb-6 p-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl text-white">
              <div className="text-center">
                <div className="text-4xl font-bold">{score.percentage}%</div>
                <div className="text-sm opacity-90">Score</div>
              </div>
              <div className="w-px h-16 bg-white/30" />
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-green-100">{score.correct}</div>
                <div className="text-sm opacity-90">Correct</div>
              </div>
              <div className="w-px h-16 bg-white/30" />
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-red-100">{score.total - score.correct}</div>
                <div className="text-sm opacity-90">Wrong</div>
              </div>
              <div className="w-px h-16 bg-white/30" />
              <div className="text-center px-6">
                <div className="text-3xl font-bold">{score.total}</div>
                <div className="text-sm opacity-90">Total</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={retryTest} className="btn-primary">🔄 Retry Test</button>
              <button onClick={newTest} className="btn-secondary">📝 New Test</button>
              <button onClick={downloadPDF} className="btn-secondary">📄 Download PDF</button>
            </div>
          </div>

          {/* Question Review */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-4">Answer Review</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {testQuestions.map((q, i) => {
                const userAnswer = answers[i] || 'Not answered';
                const isCorrect = userAnswer.toLowerCase() === q.answer.toLowerCase();
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border ${
                      isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="badge badge-primary">Q{i + 1}</span>
                      <span className={`badge ${isCorrect ? 'badge-success' : 'badge-danger'}`}>
                        {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                      </span>
                      <span className="badge badge-primary text-xs">{q.topic || 'General'}</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white mb-3">{q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div className={`p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <span className="font-medium">Your Answer:</span> {userAnswer}
                      </div>
                      <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
                        <span className="font-medium">Correct:</span> {q.answer}
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-dark-800">
                        <span className="font-medium">Source:</span> {q.source === 'notopedia' ? '📄 Notopedia' : '🤖 AI Generated'}
                      </div>
                    </div>
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                        <strong className="text-blue-800 dark:text-blue-400">💡 Explanation:</strong> {q.explanation}
                      </div>
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