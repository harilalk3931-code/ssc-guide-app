import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';
import Navbar from './components/Navbar';
import Home from './components/Home';
import QuestionBank from './components/QuestionBank';
import TestCreator from './components/TestCreator';
import SyllabusTracker from './components/SyllabusTracker';
import Checklist from './components/Checklist';
import DayCounter from './components/DayCounter';
import GuideNotes from './components/GuideNotes';
import './index.css';

function App() {
  const { isDarkMode } = useStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    }
  }, []);

  return (
    <div className="app min-h-screen bg-gray-50 dark:bg-dark-900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/questions" element={<QuestionBank />} />
        <Route path="/test-creator" element={<TestCreator />} />
        <Route path="/syllabus" element={<SyllabusTracker />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/day-counter" element={<DayCounter />} />
        <Route path="/guide-notes" element={<GuideNotes />} />
      </Routes>
    </div>
  );
}

export default App;