import { useState, useEffect } from 'react';
import { useStore } from '../store';
import Navbar from './Navbar';

export default function DayCounter() {
  const { examDate, setExamDate, getDaysRemaining } = useStore();
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [targetDate, setTargetDate] = useState(examDate);
  const [milestones, setMilestones] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const target = new Date(targetDate);
      target.setHours(23, 59, 59, 999);

      const diff = target - now;
      if (diff <= 0) {
        setDaysRemaining(0);
        setHoursRemaining(0);
        setMinutesRemaining(0);
        setSecondsRemaining(0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDaysRemaining(days);
      setHoursRemaining(hours);
      setMinutesRemaining(minutes);
      setSecondsRemaining(seconds);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Generate milestones
  useEffect(() => {
    const now = new Date();
    const target = new Date(targetDate);
    const totalDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

    const newMilestones = [
      { label: 'Exam Day', days: 0, color: 'from-red-500 to-red-600', icon: '🎯' },
      { label: 'Final Revision', days: 7, color: 'from-orange-500 to-orange-600', icon: '📝' },
      { label: 'Mock Tests Phase', days: 14, color: 'from-yellow-500 to-yellow-600', icon: '🧪' },
      { label: 'Weak Areas Focus', days: 30, color: 'from-blue-500 to-blue-600', icon: '🎯' },
      { label: 'Syllabus Completion', days: 60, color: 'from-green-500 to-green-600', icon: '✅' },
      { label: 'Foundation Building', days: 90, color: 'from-indigo-500 to-indigo-600', icon: '🏗️' },
    ].filter(m => m.days <= totalDays)
      .map(m => ({
        ...m,
        date: new Date(target.getTime() - m.days * 24 * 60 * 60 * 1000),
        passed: m.days > totalDays,
        current: m.days <= totalDays && m.days > totalDays - 7,
      }));

    setMilestones(newMilestones);
  }, [targetDate]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setTargetDate(newDate);
    setExamDate(newDate);
    setShowDatePicker(false);
  };

  const getPhase = (days) => {
    if (days <= 0) return { label: 'Exam Day!', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' };
    if (days <= 7) return { label: 'Final Week - Revision Only', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' };
    if (days <= 14) return { label: 'Mock Test Phase', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' };
    if (days <= 30) return { label: 'Intensive Practice', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    if (days <= 60) return { label: 'Core Preparation', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    if (days <= 90) return { label: 'Foundation Building', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' };
    return { label: 'Long-term Preparation', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' };
  };

  const phase = getPhase(daysRemaining);

  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exam Countdown</h1>
            <p className="text-gray-600 dark:text-gray-400">Track days until SSC CGL Tier-I</p>
          </div>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="btn-secondary"
          >
            📅 Change Date
          </button>
        </div>

        {showDatePicker && (
          <div className="glass-card p-4 mb-6 animate-slide-down">
            <label className="label-text mb-2 block">Select Exam Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={handleDateChange}
              min={new Date().toISOString().split('T')[0]}
              className="input-field max-w-xs"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Current: {new Date(examDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        )}

        {/* Main Countdown */}
        <div className="glass-card-hover p-8 mb-8 animate-fade-in stagger-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-600/5" />
          <div className="relative text-center">
            <div className="inline-flex items-center gap-3 mb-4 px-6 py-2 rounded-full bg-gradient-to-r {phase.bg} text-primary-700 dark:text-primary-300">
              <span className="text-2xl">🎯</span>
              <span className="font-semibold text-lg">{phase.label}</span>
            </div>

            <div className="grid grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto mb-6">
              <CountdownUnit label="Days" value={daysRemaining} icon="📅" color="from-red-500 to-orange-500" />
              <CountdownUnit label="Hours" value={hoursRemaining} icon="🕐" color="from-blue-500 to-cyan-500" />
              <CountdownUnit label="Minutes" value={minutesRemaining} icon="⏱️" color="from-green-500 to-emerald-500" />
              <CountdownUnit label="Seconds" value={secondsRemaining} icon="⏰" color="from-purple-500 to-pink-500" />
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              Exam Date: <span className="font-semibold text-gray-900 dark:text-white">
                {new Date(targetDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="glass-card p-6 mb-8 animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Preparation Progress</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.min(100, Math.max(0, Math.round((1 - daysRemaining / 180) * 100)))}% through prep period
            </span>
          </div>
          <div className="progress-bar h-3 mb-4">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, (1 - daysRemaining / 180) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Start</span>
            <span>{daysRemaining} days left</span>
            <span>Exam Day</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="glass-card p-6 mb-8 animate-fade-in stagger-3">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <span>🏁</span> Key Milestones
          </h2>
          <div className="space-y-3">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  milestone.current ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' : 'bg-gray-50 dark:bg-dark-800/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br {milestone.color}">
                  {milestone.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{milestone.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {milestone.days === 0 ? 'Exam Day!' : `${milestone.days} days before exam`}
                    {' | '}
                    {milestone.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {milestone.passed && (
                  <span className="badge badge-success">✅ Passed</span>
                )}
                {milestone.current && (
                  <span className="badge badge-primary animate-pulse">🔥 Current Phase</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Study Plan Suggestion */}
        <div className="glass-card p-6 animate-fade-in stagger-4">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <span>📋</span> Suggested Study Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Daily Routine', items: ['2 hrs Quant', '1.5 hrs Reasoning', '1 hr English', '1 hr GA/Current Affairs', '30 min Revision'] },
              { title: 'Weekly Goals', items: ['2 Full Mock Tests', '1 Sectional Test each', 'Error Analysis Session', 'Formula Revision', 'Current Affairs Weekly'] },
              { title: `Phase: ${phase.label}`, items: phase.label.includes('Final') ? ['Revise formulas & tricks', 'Solve PYQs only', 'Light mock tests', 'Relax & sleep well'] : phase.label.includes('Mock') ? ['Alternate day mocks', 'Analyze every test', 'Focus on weak topics', 'Time management practice'] : ['Complete syllabus topics', 'Build concept clarity', 'Practice 50 Qs daily', 'Weekly revision'] },
              { title: 'Important Reminders', items: ['Admit card download date', 'Exam center location', 'Required documents', 'Reach 1 hour early', 'Stay hydrated & calm'] },
            ].map((card, index) => (
              <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-dark-800/50">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">📌</span> {card.title}
                </h3>
                <ul className="space-y-2">
                  {card.items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in stagger-5">
          <StatCard label="Weeks Left" value={Math.ceil(daysRemaining / 7)} icon="📆" color="from-blue-500 to-blue-600" />
          <StatCard label="Weekends Left" value={Math.ceil(daysRemaining / 7) * 2} icon="🏖️" color="from-green-500 to-green-600" />
          <StatCard label="Study Hours @ 4h/day" value={daysRemaining * 4} icon="⏳" color="from-orange-500 to-orange-600" />
          <StatCard label="Mock Tests Possible" value={Math.floor(daysRemaining / 3)} icon="🧪" color="from-purple-500 to-purple-600" />
        </div>
      </main>
    </div>
  );
}

function CountdownUnit({ label, value, icon, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center bg-gradient-to-br {color} text-white shadow-lg shadow-primary-500/25">
        <span className="text-3xl md:text-4xl font-bold font-mono">{value.toString().padStart(2, '0')}</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-gray-600 dark:text-gray-400">
        <span className="text-lg">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass-card-hover p-5 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold bg-gradient-to-r {color} bg-clip-text text-transparent">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}