import { useState } from 'react';
import { useStore } from '../store';
import Navbar from './Navbar';

const SYLLABUS_DATA = {
  'General Awareness': {
    icon: '🌍',
    color: 'from-blue-500 to-cyan-500',
    topics: [
      { id: 'ga-ca', name: 'Current Affairs (National & International)', weight: 8 },
      { id: 'ga-hist', name: 'Indian History (Ancient, Medieval, Modern)', weight: 6 },
      { id: 'ga-geo', name: 'Geography (Physical, Indian, World)', weight: 6 },
      { id: 'ga-pol', name: 'Indian Polity & Constitution', weight: 8 },
      { id: 'ga-eco', name: 'Indian Economy', weight: 5 },
      { id: 'ga-sci', name: 'General Science (Physics, Chemistry, Biology)', weight: 6 },
      { id: 'ga-env', name: 'Environment & Ecology', weight: 3 },
      { id: 'ga-misc', name: 'Books, Awards, Sports, Important Days', weight: 4 },
    ],
  },
  'Reasoning': {
    icon: '🧩',
    color: 'from-purple-500 to-pink-500',
    topics: [
      { id: 'r-ana', name: 'Analogies & Similarities', weight: 3 },
      { id: 'r-cls', name: 'Classification & Odd One Out', weight: 3 },
      { id: 'r-ser', name: 'Series Completion (Number/Letter)', weight: 4 },
      { id: 'r-cod', name: 'Coding-Decoding', weight: 4 },
      { id: 'r-bld', name: 'Blood Relations', weight: 3 },
      { id: 'r-dir', name: 'Direction Sense Test', weight: 2 },
      { id: 'r-syl', name: 'Syllogism & Venn Diagrams', weight: 4 },
      { id: 'r-puz', name: 'Puzzles & Seating Arrangement', weight: 5 },
      { id: 'r-non', name: 'Non-Verbal Reasoning', weight: 3 },
      { id: 'r-stm', name: 'Statement & Arguments/Conclusions', weight: 2 },
    ],
  },
  'Quantitative Aptitude': {
    icon: '🔢',
    color: 'from-green-500 to-emerald-500',
    topics: [
      { id: 'q-num', name: 'Number System & Simplification', weight: 4 },
      { id: 'q-pct', name: 'Percentage, Profit & Loss', weight: 5 },
      { id: 'q-rat', name: 'Ratio, Proportion & Partnership', weight: 3 },
      { id: 'q-avg', name: 'Average & Mixture/Alligation', weight: 3 },
      { id: 'q-int', name: 'Simple & Compound Interest', weight: 3 },
      { id: 'q-tdw', name: 'Time & Work, Pipes & Cistern', weight: 4 },
      { id: 'q-tsd', name: 'Time, Speed & Distance', weight: 4 },
      { id: 'q-geo', name: 'Geometry & Mensuration', weight: 5 },
      { id: 'q-tri', name: 'Trigonometry & Heights/Distances', weight: 3 },
      { id: 'q-alg', name: 'Algebra & Surds/Indices', weight: 3 },
      { id: 'q-di', name: 'Data Interpretation', weight: 5 },
    ],
  },
  'English Comprehension': {
    icon: '📝',
    color: 'from-orange-500 to-red-500',
    topics: [
      { id: 'e-rc', name: 'Reading Comprehension', weight: 6 },
      { id: 'e-clo', name: 'Cloze Test', weight: 4 },
      { id: 'e-err', name: 'Error Detection & Sentence Improvement', weight: 5 },
      { id: 'e-fib', name: 'Fill in the Blanks', weight: 3 },
      { id: 'e-pj', name: 'Para Jumbles', weight: 3 },
      { id: 'e-voc', name: 'Vocabulary (Synonyms, Antonyms, Idioms)', weight: 5 },
      { id: 'e-ows', name: 'One Word Substitution', weight: 2 },
      { id: 'e-sp', name: 'Spelling Test', weight: 1 },
      { id: 'e-gr', name: 'Grammar (Voice, Speech, Tenses)', weight: 4 },
    ],
  },
};

export default function SyllabusTracker() {
  const { syllabus, updateTopicProgress, toggleTopicComplete, getSyllabusProgress } = useStore();
  const [expandedSections, setExpandedSections] = useState(['General Awareness', 'Reasoning', 'Quantitative Aptitude', 'English Comprehension']);
  const overallProgress = getSyllabusProgress();

  const toggleSection = (sectionName) => {
    setExpandedSections((prev) =>
      prev.includes(sectionName) ? prev.filter((s) => s !== sectionName) : [...prev, sectionName]
    );
  };

  const getSectionProgress = (sectionName) => {
    const section = syllabus.find((s) => s.name === sectionName);
    if (!section) return 0;
    const completed = section.topics.filter((t) => t.completed).length;
    return section.topics.length > 0 ? Math.round((completed / section.topics.length) * 100) : 0;
  };

  const getSectionTopicsDone = (sectionName) => {
    const section = syllabus.find((s) => s.name === sectionName);
    if (!section) return { done: 0, total: 0 };
    return { done: section.topics.filter((t) => t.completed).length, total: section.topics.length };
  };

  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Syllabus Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your SSC CGL Tier-I syllabus completion</p>
          </div>
          <div className="glass-card px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold">{overallProgress}%</div>
              <div>
                <div className="text-sm opacity-90">Overall Completion</div>
                <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {Object.entries(SYLLABUS_DATA).map(([sectionName, sectionData]) => {
            const progress = getSectionProgress(sectionName);
            const { done, total } = getSectionTopicsDone(sectionName);
            const isExpanded = expandedSections.includes(sectionName);

            return (
              <section key={sectionName} className="glass-card-hover animate-fade-in overflow-hidden">
                <button
                  onClick={() => toggleSection(sectionName)}
                  className="w-full p-5 flex items-center justify-between gap-4"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br {sectionData.color}">
                      {sectionData.icon}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 dark:text-white truncate">{sectionName}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="badge badge-primary text-sm">{done}/{total} topics</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{progress}% complete</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-32 hidden sm:block">
                      <div className="progress-bar h-2">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 animate-slide-down border-t border-gray-100 dark:border-gray-700">
                    <div className="space-y-3 mt-4">
                      {sectionData.topics.map((topic) => {
                        const topicState = syllabus.find((s) => s.name === sectionName)?.topics.find((t) => t.id === topic.id);
                        const completed = topicState?.completed || false;
                        const topicProgress = topicState?.progress || 0;

                        return (
                          <div
                            key={topic.id}
                            className={`p-4 rounded-xl transition-all flex items-center justify-between gap-4 ${
                              completed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-dark-800/50 hover:border-primary-200 dark:hover:border-primary-800 border'
                            }`}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <button
                                onClick={() => toggleTopicComplete(sectionName, topic.id)}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  completed
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                                }`}
                                aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
                              >
                                {completed && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                              </button>
                              <div className="min-w-0">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">{topic.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="badge badge-primary text-xs">
                                    Weight: {topic.weight}/10
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {completed ? '✅ Completed' : '⏳ Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={topicProgress}
                                onChange={(e) => updateTopicProgress(sectionName, topic.id, parseInt(e.target.value))}
                                className="w-32 h-2 appearance-none bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
                                disabled={completed}
                              />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-10 text-right">
                                {topicProgress}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          {Object.entries(SYLLABUS_DATA).map(([sectionName, sectionData]) => {
            const progress = getSectionProgress(sectionName);
            const { done, total } = getSectionTopicsDone(sectionName);
            return (
              <div key={sectionName} className="glass-card-hover p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br {sectionData.color}">
                  {sectionData.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{sectionName}</h3>
                <div className="text-2xl font-bold bg-gradient-to-r {sectionData.color} bg-clip-text text-transparent">{progress}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{done}/{total} topics</div>
              </div>
            );
          })}
        </div>

        {/* Study Priority */}
        <div className="mt-8 glass-card p-6 animate-fade-in">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <span>🎯</span> Study Priority (Based on Weight & Progress)
          </h2>
          <PriorityList />
        </div>
      </main>
    </div>
  );
}

function PriorityList() {
  const { syllabus } = useStore();

  // Flatten all topics with priority score
  const allTopics = [];
  Object.entries(SYLLABUS_DATA).forEach(([sectionName, sectionData]) => {
    sectionData.topics.forEach((topic) => {
      const topicState = syllabus.find((s) => s.name === sectionName)?.topics.find((t) => t.id === topic.id);
      const completed = topicState?.completed || false;
      const progress = topicState?.progress || 0;

      if (!completed) {
        // Priority = weight * (1 - progress/100) - higher weight + lower progress = higher priority
        const priority = topic.weight * (1 - progress / 100);
        allTopics.push({ ...topic, section: sectionName, sectionData, priority, progress });
      }
    });
  });

  // Sort by priority descending
  allTopics.sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {allTopics.slice(0, 10).map((topic, index) => (
        <div
          key={topic.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-800/50"
        >
          <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br {topic.sectionData.color} flex-shrink-0">
            {topic.sectionData.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{topic.name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="badge badge-primary">Weight: {topic.weight}/10</span>
              <span>{topic.section}</span>
              <span>{topic.progress}% done</span>
            </div>
          </div>
          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-gradient-to-r {topic.sectionData.color} rounded-full"
              style={{ width: `${Math.min(100, topic.priority * 10)}%` }}
            />
          </div>
        </div>
      ))}
      {allTopics.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          🎉 All topics completed! Great job!
        </div>
      )}
    </div>
  );
}