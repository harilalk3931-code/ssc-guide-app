import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // Theme
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      // Day Counter
      examDate: '2025-12-31',
      setExamDate: (date) => set({ examDate: date }),
      getDaysRemaining: () => {
        const { examDate } = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exam = new Date(examDate);
        exam.setHours(0, 0, 0, 0);
        const diff = exam - today;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      },

      // Syllabus Tracker
      syllabus: [
        { id: 'ga', name: 'General Awareness', topics: [
          { id: 'ga1', name: 'Current Affairs', completed: false, progress: 0 },
          { id: 'ga2', name: 'History', completed: false, progress: 0 },
          { id: 'ga3', name: 'Geography', completed: false, progress: 0 },
          { id: 'ga4', name: 'Polity', completed: false, progress: 0 },
          { id: 'ga5', name: 'Economy', completed: false, progress: 0 },
          { id: 'ga6', name: 'General Science', completed: false, progress: 0 },
        ]},
        { id: 'reasoning', name: 'Reasoning', topics: [
          { id: 'r1', name: 'Analogies', completed: false, progress: 0 },
          { id: 'r2', name: 'Classification', completed: false, progress: 0 },
          { id: 'r3', name: 'Series', completed: false, progress: 0 },
          { id: 'r4', name: 'Coding-Decoding', completed: false, progress: 0 },
          { id: 'r5', name: 'Blood Relations', completed: false, progress: 0 },
          { id: 'r6', name: 'Direction Sense', completed: false, progress: 0 },
          { id: 'r7', name: 'Syllogism', completed: false, progress: 0 },
          { id: 'r8', name: 'Puzzles', completed: false, progress: 0 },
        ]},
        { id: 'quant', name: 'Quantitative Aptitude', topics: [
          { id: 'q1', name: 'Number System', completed: false, progress: 0 },
          { id: 'q2', name: 'Simplification', completed: false, progress: 0 },
          { id: 'q3', name: 'Percentage', completed: false, progress: 0 },
          { id: 'q4', name: 'Ratio & Proportion', completed: false, progress: 0 },
          { id: 'q5', name: 'Average', completed: false, progress: 0 },
          { id: 'q6', name: 'Time & Work', completed: false, progress: 0 },
          { id: 'q7', name: 'Time & Distance', completed: false, progress: 0 },
          { id: 'q8', name: 'Profit & Loss', completed: false, progress: 0 },
          { id: 'q9', name: 'Simple & Compound Interest', completed: false, progress: 0 },
          { id: 'q10', name: 'Data Interpretation', completed: false, progress: 0 },
        ]},
        { id: 'english', name: 'English Comprehension', topics: [
          { id: 'e1', name: 'Reading Comprehension', completed: false, progress: 0 },
          { id: 'e2', name: 'Cloze Test', completed: false, progress: 0 },
          { id: 'e3', name: 'Error Spotting', completed: false, progress: 0 },
          { id: 'e4', name: 'Sentence Improvement', completed: false, progress: 0 },
          { id: 'e5', name: 'Fill in the Blanks', completed: false, progress: 0 },
          { id: 'e6', name: 'Vocabulary', completed: false, progress: 0 },
          { id: 'e7', name: 'Grammar', completed: false, progress: 0 },
        ]},
      ],
      updateTopicProgress: (sectionId, topicId, progress) =>
        set((state) => ({
          syllabus: state.syllabus.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  topics: section.topics.map((topic) =>
                    topic.id === topicId ? { ...topic, progress, completed: progress >= 100 } : topic
                  ),
                }
              : section
          ),
        })),
      toggleTopicComplete: (sectionId, topicId) =>
        set((state) => ({
          syllabus: state.syllabus.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  topics: section.topics.map((topic) =>
                    topic.id === topicId
                      ? { ...topic, completed: !topic.completed, progress: !topic.completed ? 100 : 0 }
                      : topic
                  ),
                }
              : section
          ),
        })),
      getSyllabusProgress: () => {
        const { syllabus } = get();
        let total = 0;
        let completed = 0;
        syllabus.forEach((section) => {
          section.topics.forEach((topic) => {
            total++;
            if (topic.completed) completed++;
          });
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
      },

      // Checklist
      checklist: [
        { id: 'c1', text: 'Complete General Awareness syllabus', category: 'syllabus', completed: false },
        { id: 'c2', text: 'Complete Reasoning syllabus', category: 'syllabus', completed: false },
        { id: 'c3', text: 'Complete Quant syllabus', category: 'syllabus', completed: false },
        { id: 'c4', text: 'Complete English syllabus', category: 'syllabus', completed: false },
        { id: 'c5', text: 'Take 10 full-length mock tests', category: 'practice', completed: false, target: 10, current: 0 },
        { id: 'c6', text: 'Solve 500+ practice questions', category: 'practice', completed: false, target: 500, current: 0 },
        { id: 'c7', text: 'Revise all weak topics', category: 'revision', completed: false },
        { id: 'c8', text: 'Complete previous year papers (5 years)', category: 'practice', completed: false, target: 5, current: 0 },
        { id: 'c9', text: 'Achieve 85%+ accuracy in mock tests', category: 'performance', completed: false },
        { id: 'c10', text: 'Master time management (25 min/section)', category: 'performance', completed: false },
      ],
      addChecklistItem: (item) =>
        set((state) => ({
          checklist: [...state.checklist, { ...item, id: crypto.randomUUID() }],
        })),
      toggleChecklistItem: (id) =>
        set((state) => ({
          checklist: state.checklist.map((item) =>
            item.id === id ? { ...item, completed: !item.completed } : item
          ),
        })),
      updateChecklistProgress: (id, current) =>
        set((state) => ({
          checklist: state.checklist.map((item) =>
            item.id === id ? { ...item, current, completed: current >= (item.target || 1) } : item
          ),
        })),
      deleteChecklistItem: (id) =>
        set((state) => ({
          checklist: state.checklist.filter((item) => item.id !== id),
        })),
      getChecklistProgress: () => {
        const { checklist } = get();
        if (checklist.length === 0) return 0;
        const completed = checklist.filter((item) => item.completed).length;
        return Math.round((completed / checklist.length) * 100);
      },

      // Question Bank
      questions: [],
      questionsLoading: false,
      questionsError: null,
      setQuestions: (updater) =>
        set((state) => ({
          questions: typeof updater === 'function' ? updater(state.questions) : updater,
          questionsLoading: false,
          questionsError: null,
        })),
      setQuestionsLoading: (loading) => set({ questionsLoading: loading }),
      setQuestionsError: (error) => set({ questionsError: error, questionsLoading: false }),

      // Guide Notes (AI-generated / user-updated)
      customNotes: {},
      setCustomNote: (key, note) =>
        set((state) => ({
          customNotes: { ...state.customNotes, [key]: note },
        })),
      removeCustomNote: (key) =>
        set((state) => {
          const next = { ...state.customNotes };
          delete next[key];
          return { customNotes: next };
        }),

      // Test Creator
      currentTest: null,
      testHistory: [],
      createTest: (test) => set({ currentTest: test }),
      clearCurrentTest: () => set({ currentTest: null }),
      addTestToHistory: (test) =>
        set((state) => ({
          testHistory: [test, ...state.testHistory].slice(0, 50),
        })),

      // Wrong Book (incorrectly answered questions)
      wrongBook: [],
      addToWrongBook: (question) =>
        set((state) => {
          const exists = state.wrongBook.some((q) => q.id === question.id);
          if (exists) return state;
          return { wrongBook: [...state.wrongBook, { ...question, addedAt: Date.now() }] };
        }),
      removeFromWrongBook: (id) =>
        set((state) => ({
          wrongBook: state.wrongBook.filter((q) => q.id !== id),
        })),
      clearWrongBook: () => set({ wrongBook: [] }),

      // Notopedia Data
      notopediaData: null,
      notopediaLoading: false,
      setNotopediaData: (data) => set({ notopediaData: data, notopediaLoading: false }),
      setNotopediaLoading: (loading) => set({ notopediaLoading: loading }),

      // User Stats
      userStats: {
        totalQuestionsAttempted: 0,
        totalCorrect: 0,
        totalTestsTaken: 0,
        averageScore: 0,
        streak: 0,
        lastActiveDate: null,
      },
      updateUserStats: (stats) =>
        set((state) => ({
          userStats: { ...state.userStats, ...stats },
        })),
    }),
    {
      name: 'prepmaster-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        examDate: state.examDate,
        syllabus: state.syllabus,
        checklist: state.checklist,
        testHistory: state.testHistory,
        userStats: state.userStats,
        questions: state.questions,
        customNotes: state.customNotes,
        wrongBook: state.wrongBook,
      }),
    }
  )
);
