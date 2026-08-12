import { Link } from 'react-router-dom';
import { useStore } from '../store';
import Navbar from './Navbar';

export default function Home() {
  const { getDaysRemaining, getSyllabusProgress, getChecklistProgress, userStats, examDate } = useStore();
  const daysRemaining = getDaysRemaining();
  const syllabusProgress = getSyllabusProgress();
  const checklistProgress = getChecklistProgress();

  const stats = [
    {
      label: 'Days Remaining',
      value: daysRemaining,
      icon: '📅',
      color: 'from-red-500 to-orange-500',
      trend: daysRemaining > 60 ? 'Good time to prepare' : daysRemaining > 30 ? 'Accelerate preparation' : 'Final revision phase',
      trendColor: daysRemaining > 60 ? 'text-green-600' : daysRemaining > 30 ? 'text-yellow-600' : 'text-red-600',
    },
    {
      label: 'Syllabus Progress',
      value: `${syllabusProgress}%`,
      icon: '📋',
      color: 'from-blue-500 to-cyan-500',
      trend: `${syllabusProgress}% of topics covered`,
      trendColor: 'text-blue-600',
    },
    {
      label: 'Checklist Done',
      value: `${checklistProgress}%`,
      icon: '✅',
      color: 'from-green-500 to-emerald-500',
      trend: `${checklistProgress}% tasks completed`,
      trendColor: 'text-green-600',
    },
    {
      label: 'Questions Solved',
      value: userStats.totalQuestionsAttempted.toLocaleString(),
      icon: '🧠',
      color: 'from-purple-500 to-pink-500',
      trend: `${userStats.averageScore.toFixed(1)}% accuracy`,
      trendColor: 'text-purple-600',
    },
  ];

  const quickActions = [
    { path: '/test-creator', label: 'Create Test', desc: '25 questions • 15 min', icon: '📝', color: 'from-primary-500 to-primary-600' },
    { path: '/questions', label: 'Question Bank', desc: 'Browse by topic', icon: '📚', color: 'from-blue-500 to-blue-600' },
    { path: '/syllabus', label: 'Syllabus Tracker', desc: 'Track topic progress', icon: '📋', color: 'from-green-500 to-green-600' },
    { path: '/checklist', label: 'Daily Checklist', desc: 'Track your tasks', icon: '✅', color: 'from-orange-500 to-orange-600' },
    { path: '/guide-notes', label: 'Study Notes', desc: 'Key concepts & formulas', icon: '📖', color: 'from-indigo-500 to-indigo-600' },
    { path: '/day-counter', label: 'Exam Countdown', desc: 'Days until SSC CGL', icon: '📅', color: 'from-red-500 to-red-600' },
  ];

  const examInfo = [
    { label: 'Exam', value: 'SSC CGL Tier-I' },
    { label: 'Date', value: new Date(examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
    { label: 'Duration', value: '60 minutes' },
    { label: 'Questions', value: '100 (25 each section)' },
    { label: 'Marks', value: '200 (2 per question)' },
    { label: 'Negative Marking', value: '0.50 per wrong answer' },
  ];

  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <section className="mb-8 animate-fade-in">
          <div className="glass-card-hover p-6 md:p-8 bg-gradient-to-br from-primary-600/10 to-primary-500/5 dark:from-primary-900/20 dark:to-primary-900/10 border-primary-500/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome back, <span className="text-gradient">Aspirant!</span>
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Your SSC CGL Tier-I preparation companion. Stay consistent, crack the exam.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/test-creator" className="btn-primary">
                  <span>🚀</span> Start 15-min Test
                </Link>
                <Link to="/questions" className="btn-secondary">
                  <span>📚</span> Browse Questions
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Exam Countdown Banner */}
        <section className="mb-8 animate-fade-in stagger-1">
          <div className="glass-card-hover p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500">
                  <span className="text-3xl">⏳</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Exam Countdown</h2>
                  <p className="text-gray-600 dark:text-gray-400">SSC CGL Tier-I 2025</p>
                </div>
              </div>
              <div className="flex items-center gap-6 md:gap-8">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                    {daysRemaining}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Days Left</div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-gray-200 to-transparent dark:from-gray-700" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.streak}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Day Streak</div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-gray-200 to-transparent dark:from-gray-700" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.totalTestsTaken}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Tests Taken</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 animate-fade-in stagger-2">
          <h2 className="section-title mb-4">Your Progress Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Link key={stat.label} to={stat.label === 'Days Remaining' ? '/day-counter' : stat.label === 'Syllabus Progress' ? '/syllabus' : stat.label === 'Checklist Done' ? '/checklist' : '/questions'} className="glass-card-hover p-5 group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-3xl mb-2">{stat.icon}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                    <div className={`${stat.trendColor} text-xs mt-1`}>{stat.trend}</div>
                  </div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8 animate-fade-in stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Quick Actions</h2>
          </div>
          <div className="card-grid">
            {quickActions.map((action) => (
              <Link key={action.path} to={action.path} className="glass-card-hover p-5 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br {action.color} bg-opacity-10 group-hover:bg-opacity-20 transition-all">
                    <span className="text-2xl">{action.icon}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{action.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{action.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Exam Info */}
        <section className="mb-8 animate-fade-in stagger-4">
          <h2 className="section-title mb-4">Exam Pattern Overview</h2>
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {examInfo.map((info, index) => (
                <div key={index} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-dark-800/50">
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">{info.value}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{info.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Activity / Tips */}
        <section className="animate-fade-in stagger-5">
          <h2 className="section-title mb-4">Study Tips for Today</h2>
          <div className="card-grid">
            {[
              { title: 'Focus on Weak Areas', desc: 'Spend 70% time on topics you score <60% in', icon: '🎯', color: 'from-red-500 to-red-600' },
              { title: 'Daily Current Affairs', desc: 'Read 15 min daily - high ROI for GA section', icon: '📰', color: 'from-blue-500 to-blue-600' },
              { title: 'Mock Test Analysis', desc: 'Review every wrong answer, not just score', icon: '🔍', color: 'from-purple-500 to-purple-600' },
              { title: 'Formula Revision', desc: 'Keep a formula notebook for Quant - revise weekly', icon: '📐', color: 'from-green-500 to-green-600' },
            ].map((tip, index) => (
              <div key={index} className="glass-card-hover p-5">
                <div className="p-3 rounded-xl bg-gradient-to-br {tip.color} bg-opacity-10 mb-3">
                  <span className="text-2xl">{tip.icon}</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{tip.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tip.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer / Creator Credit */}
        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Made with ❤️ by <span className="font-semibold text-gray-900 dark:text-white">Harilal K</span>
            </p>
            <a
              href="mailto:harilalk.931@gmail.com"
              className="text-primary-600 dark:text-primary-400 text-sm hover:underline"
            >
              ✉️ harilalk.931@gmail.com
            </a>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              🎯 SSC CGL Guide • Question Bank • Test Creator • Syllabus Tracker • Day Counter • Checklist
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}