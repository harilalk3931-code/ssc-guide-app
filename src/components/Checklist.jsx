import { useState } from 'react';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import Navbar from './Navbar';

const DEFAULT_CHECKLIST = [
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
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '📋', color: 'from-gray-500 to-gray-600' },
  { id: 'syllabus', name: 'Syllabus', icon: '📚', color: 'from-blue-500 to-blue-600' },
  { id: 'practice', name: 'Practice', icon: '🧪', color: 'from-green-500 to-green-600' },
  { id: 'revision', name: 'Revision', icon: '🔄', color: 'from-orange-500 to-orange-600' },
  { id: 'performance', name: 'Performance', icon: '📈', color: 'from-purple-500 to-purple-600' },
];

export default function Checklist() {
  const { checklist, addChecklistItem, toggleChecklistItem, updateChecklistProgress, deleteChecklistItem, getChecklistProgress, userStats, updateUserStats } = useStore();
  const [filter, setFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('syllabus');
  const [newItemTarget, setNewItemTarget] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const progress = getChecklistProgress();

  const filteredChecklist = filter === 'all'
    ? checklist
    : checklist.filter((item) => item.category === filter);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    addChecklistItem({
      text: newItemText.trim(),
      category: newItemCategory,
      completed: false,
      target: newItemTarget ? parseInt(newItemTarget) : undefined,
      current: 0,
    });

    setNewItemText('');
    setNewItemTarget('');
    setShowAddForm(false);
  };

  const handleToggle = (id) => {
    toggleChecklistItem(id);
    const item = checklist.find((i) => i.id === id);
    if (item && !item.target) {
      updateUserStats({
        totalTestsTaken: userStats.totalTestsTaken + (item.category === 'practice' ? 1 : 0),
      });
    }
  };

  const handleProgressChange = (id, value) => {
    const numValue = Math.max(0, Math.min(parseInt(value) || 0, checklist.find(i => i.id === id)?.target || 100));
    updateChecklistProgress(id, numValue);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this item?')) {
      deleteChecklistItem(id);
    }
  };

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleEditSave = (id) => {
    if (!editText.trim()) return;
    // We need to update the item text - since we don't have direct update, we'll need to add to store
    // For now, just close edit mode
    setEditingId(null);
    setEditText('');
  };

  const categoryStats = CATEGORIES.slice(1).map((cat) => {
    const items = checklist.filter((i) => i.category === cat.id);
    const done = items.filter((i) => i.completed).length;
    return { ...cat, total: items.length, done };
  });

  return (
    <div className="min-h-screen pb-20 safe-area-inset-bottom">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Checklist & Progress</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your SSC CGL preparation tasks</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? '✖️ Cancel' : '➕ Add Task'}
          </button>
        </div>

        {/* Overall Progress */}
        <div className="glass-card-hover p-6 mb-6 animate-fade-in stagger-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Overall Progress</h2>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
              {progress}%
            </span>
          </div>
          <div className="progress-bar h-4 mb-4">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
              <div className="font-bold text-gray-900 dark:text-white">{checklist.length}</div>
              <div className="text-gray-500 dark:text-gray-400">Total Tasks</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
              <div className="font-bold text-green-600 dark:text-green-400">{checklist.filter(i => i.completed).length}</div>
              <div className="text-gray-500 dark:text-gray-400">Completed</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
              <div className="font-bold text-orange-600 dark:text-orange-400">{checklist.filter(i => !i.completed).length}</div>
              <div className="text-gray-500 dark:text-gray-400">Pending</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-dark-800/50 rounded-xl">
              <div className="font-bold text-blue-600 dark:text-blue-400">{checklist.filter(i => i.target).length}</div>
              <div className="text-gray-500 dark:text-gray-400">With Targets</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="glass-card p-4 mb-6 animate-fade-in stagger-2">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === cat.id
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span>{cat.icon}</span>
                  {cat.name}
                  {cat.id !== 'all' && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20 dark:bg-white/10">
                      {cat.done}/{cat.total}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAddItem} className="glass-card p-5 mb-6 animate-slide-down">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Add New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="label-text">Task Description</label>
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="e.g., Complete History syllabus"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Category</label>
                  <select value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} className="input-field">
                    {CATEGORIES.slice(1).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">Target Count (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newItemTarget}
                    onChange={(e) => setNewItemTarget(e.target.value)}
                    placeholder="e.g., 10"
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">Add Task</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </form>
        )}

        {/* Checklist Items */}
        <div className="animate-fade-in stagger-3">
          {filteredChecklist.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">{filter === 'all' ? '📝' : CATEGORIES.find(c => c.id === filter)?.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {filter === 'all' ? 'No tasks yet' : `No ${CATEGORIES.find(c => c.id === filter)?.name.toLowerCase()} tasks`}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {filter === 'all' ? 'Add your first task to get started!' : 'Add a task in this category'}
              </p>
              <button onClick={() => setShowAddForm(true)} className="btn-primary">➕ Add Task</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChecklist.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  editingId={editingId}
                  editText={editText}
                  onToggle={handleToggle}
                  onProgressChange={handleProgressChange}
                  onDelete={handleDelete}
                  onEditStart={handleEditStart}
                  onEditSave={handleEditSave}
                  setEditingId={setEditingId}
                  setEditText={setEditText}
                />
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="mt-8 animate-fade-in stagger-4">
          <h2 className="section-title mb-4">Category Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoryStats.map((cat) => (
              <div key={cat.id} className="glass-card-hover p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br {cat.color}">
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{cat.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{cat.done}/{cat.total} done</p>
                  </div>
                </div>
                <div className="progress-bar h-2 mb-2">
                  <div className="progress-fill bg-gradient-to-r {cat.color}" style={{ width: `${cat.total > 0 ? (cat.done / cat.total) * 100 : 0}%` }} />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  {cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0}% complete
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 glass-card p-6 animate-fade-in stagger-5">
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => {
                checklist.filter(i => !i.completed).forEach(i => toggleChecklistItem(i.id));
              }}
              className="btn-secondary text-sm"
              disabled={checklist.every(i => i.completed)}
            >
              ✅ Complete All
            </button>
            <button
              onClick={() => {
                checklist.filter(i => i.completed).forEach(i => toggleChecklistItem(i.id));
              }}
              className="btn-secondary text-sm"
              disabled={checklist.every(i => !i.completed)}
            >
              ↩️ Reset All
            </button>
            <button
              onClick={() => {
                checklist.filter(i => i.category === 'practice' && !i.completed).forEach(i => toggleChecklistItem(i.id));
              }}
              className="btn-primary text-sm"
            >
              🧪 Complete Practice
            </button>
            <button
              onClick={() => {
                checklist.filter(i => i.category === 'syllabus' && !i.completed).forEach(i => toggleChecklistItem(i.id));
              }}
              className="btn-secondary text-sm"
            >
              📚 Complete Syllabus
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ChecklistItem({ item, editingId, editText, onToggle, onProgressChange, onDelete, onEditStart, onEditSave, setEditingId, setEditText }) {
  const isEditing = editingId === item.id;
  const hasTarget = item.target && item.target > 0;
  const progress = hasTarget ? Math.min(100, Math.round((item.current || 0) / item.target * 100)) : (item.completed ? 100 : 0);

  const categoryStyles = {
    syllabus: 'from-blue-500 to-blue-600',
    practice: 'from-green-500 to-green-600',
    revision: 'from-orange-500 to-orange-600',
    performance: 'from-purple-500 to-purple-600',
  };

  const cat = CATEGORIES.find(c => c.id === item.category);

  if (isEditing) {
    return (
      <div className="glass-card p-4 animate-slide-down border-primary-200 dark:border-primary-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onEditSave(item.id)}
            onBlur={() => onEditSave(item.id)}
            className="flex-1 input-field"
            autoFocus
          />
          <button onClick={() => onEditSave(item.id)} className="btn-primary px-4">Save</button>
          <button onClick={() => setEditingId(null)} className="btn-secondary px-4">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card-hover p-4 transition-all ${item.completed ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item.id)}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            item.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
          }`}
          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {cat && <span className="badge px-2 py-0.5 text-xs bg-gradient-to-r {cat.color} text-white">{cat.icon} {cat.name}</span>}
            {hasTarget && (
              <span className="badge badge-primary text-xs">
                Target: {item.current}/{item.target}
              </span>
            )}
          </div>

          <p className={`text-gray-900 dark:text-white ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
            {item.text}
          </p>

          {hasTarget && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 progress-bar h-2">
                  <div
                    className="progress-fill bg-gradient-to-r {categoryStyles[item.category] || 'from-primary-500 to-primary-600'}"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max={item.target}
                  value={item.current || 0}
                  onChange={(e) => onProgressChange(item.id, e.target.value)}
                  className="w-16 input-field text-center py-1 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => onEditStart(item)}
            className="p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            aria-label="Edit task"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}