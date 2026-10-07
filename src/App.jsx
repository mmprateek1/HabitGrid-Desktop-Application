import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Check,
  TrendingUp,
  Activity,
  Layers,
  Database,
  Sun,
  Moon,
  AlertCircle,
  Download,
  Upload,
  Flame,
  FileSpreadsheet,
  Grid,
  FileText,
  Sparkles,
  Edit2,
  GripVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';
import GrowthChart from './components/GrowthChart';
import YearlyHeatmap from './components/YearlyHeatmap';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All Habits', color: '#059669' },
  { id: 'health', label: 'Health & Fitness', color: '#10b981' },
  { id: 'learning', label: 'Learning & Mind', color: '#6366f1' },
  { id: 'work', label: 'Productivity & Work', color: '#f59e0b' },
  { id: 'lifestyle', label: 'Lifestyle', color: '#ec4899' }
];

export default function App() {
  const [data, setData] = useState({ habits: [], completions: {}, notes: {} });
  const [dataPath, setDataPath] = useState('');
  const [loading, setLoading] = useState(true);

  // Drag and drop habit reordering state
  const [draggedHabitIndex, setDraggedHabitIndex] = useState(null);
  const [dragOverHabitIndex, setDragOverHabitIndex] = useState(null);
  const [dragPosition, setDragPosition] = useState(null); // 'top' | 'bottom'

  // Active view: 'monthly' | 'yearly'
  const [activeTab, setActiveTab] = useState('monthly');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Dark Mode State with persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('habitgrid_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('habitgrid_theme', 'dark');
      if (window.habitAPI?.setTheme) {
        window.habitAPI.setTheme('dark');
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('habitgrid_theme', 'light');
      if (window.habitAPI?.setTheme) {
        window.habitAPI.setTheme('light');
      }
    }
  }, [isDarkMode]);

  // Month navigation state
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Habit input
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('health');
  const [habitInputError, setHabitInputError] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Delete confirmation modal state
  const [deletingHabit, setDeletingHabit] = useState(null);

  // Note editor modal state
  const [activeNoteModal, setActiveNoteModal] = useState(null); // { habitId, habitName, dayNum, text }

  // Chart view state
  const [chartViewMode, setChartViewMode] = useState('cumulative'); // 'cumulative' | 'daily'
  const [selectedChartHabit, setSelectedChartHabit] = useState('all');

  // Keyboard navigation focus state: { habitIndex: 0, dayNum: 1 }
  const [focusedCell, setFocusedCell] = useState(null);

  // Input ref
  const addInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Key for the current month: YYYY-MM
  const currentMonthKey = useMemo(() => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  }, [currentYear, currentMonth]);

  // Is viewing today's current actual month
  const isActualCurrentMonth = 
    today.getFullYear() === currentYear && today.getMonth() === currentMonth;
  const currentDayNum = today.getDate();

  // Number of days in current viewing month (handles leap years)
  const totalDaysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // Days array
  const daysInMonthList = useMemo(() => {
    const list = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = isActualCurrentMonth && d === currentDayNum;
      const isFuture = 
        (currentYear > today.getFullYear()) ||
        (currentYear === today.getFullYear() && currentMonth > today.getMonth()) ||
        (isActualCurrentMonth && d > currentDayNum);

      list.push({
        dayNum: d,
        dayName: DAY_NAMES[dayOfWeek],
        isWeekend,
        isToday,
        isFuture
      });
    }
    return list;
  }, [currentYear, currentMonth, totalDaysInMonth, isActualCurrentMonth, currentDayNum, today]);

  // Load data from Electron or LocalStorage fallback
  useEffect(() => {
    async function loadInitial() {
      try {
        if (window.habitAPI?.loadData) {
          const loaded = await window.habitAPI.loadData();
          setData(loaded);
          const p = await window.habitAPI.getDataPath();
          setDataPath(p);
        } else {
          const saved = localStorage.getItem('habitgrid_data');
          if (saved) {
            setData(JSON.parse(saved));
          } else {
            const initial = {
              habits: [
                { id: 'h1', name: 'Exercise & Stretching', category: 'health', createdAt: new Date().toISOString() },
                { id: 'h2', name: 'Read 20 mins', category: 'learning', createdAt: new Date().toISOString() },
                { id: 'h3', name: 'Drink 2.5L Water', category: 'health', createdAt: new Date().toISOString() },
                { id: 'h4', name: 'Deep Work (2 hrs)', category: 'work', createdAt: new Date().toISOString() }
              ],
              completions: {
                [currentMonthKey]: {
                  h1: [1, 2, Math.min(currentDayNum, 3)].filter(d => d <= currentDayNum),
                  h2: [1, 2, 4].filter(d => d <= currentDayNum),
                  h3: [1, 3, currentDayNum].filter(d => d <= currentDayNum),
                  h4: [2, 3, currentDayNum].filter(d => d <= currentDayNum)
                }
              },
              notes: {}
            };
            setData(initial);
          }
          setDataPath('Browser LocalStorage (Dev)');
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [currentMonthKey, currentDayNum]);

  // Save data helper with atomic autosave
  const persistData = async (newData) => {
    setData(newData);
    try {
      if (window.habitAPI?.saveData) {
        await window.habitAPI.saveData(newData);
      } else {
        localStorage.setItem('habitgrid_data', JSON.stringify(newData));
      }
    } catch (err) {
      console.error('Failed to persist data:', err);
    }
  };

  // Filtered habits by active category
  const filteredHabits = useMemo(() => {
    if (selectedCategory === 'all') return data.habits || [];
    return (data.habits || []).filter(h => h.category === selectedCategory);
  }, [data.habits, selectedCategory]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Streak calculations (Current Streak and Best Streak)
  const habitStreaks = useMemo(() => {
    const streaks = {};
    (data.habits || []).forEach(habit => {
      // Calculate current streak backwards from today
      let currentStreak = 0;
      let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      while (true) {
        const y = checkDate.getFullYear();
        const mKey = `${y}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
        const day = checkDate.getDate();
        const monthComps = data.completions?.[mKey]?.[habit.id] || [];

        if (monthComps.includes(day)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // If today is not ticked yet, check if yesterday was ticked so streak isn't lost mid-day
          if (currentStreak === 0 && checkDate.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
            checkDate.setDate(checkDate.getDate() - 1);
            const prevMKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
            const prevComps = data.completions?.[prevMKey]?.[habit.id] || [];
            if (prevComps.includes(checkDate.getDate())) {
              currentStreak = 1;
              checkDate.setDate(checkDate.getDate() - 1);
              continue;
            }
          }
          break;
        }
      }

      streaks[habit.id] = currentStreak;
    });
    return streaks;
  }, [data.habits, data.completions, today]);

  // Habit management
  const handleAddHabit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setHabitInputError('');

    const trimmed = newHabitName.trim();
    if (!trimmed) {
      setHabitInputError('Please enter a habit name.');
      addInputRef.current?.focus();
      return;
    }
    if (trimmed.length > 40) {
      setHabitInputError('Habit name must be 40 characters or fewer.');
      return;
    }
    const duplicate = (data.habits || []).some(
      h => h.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setHabitInputError('A habit with this name already exists.');
      return;
    }

    const newHabit = {
      id: 'h_' + Date.now(),
      name: trimmed,
      category: newHabitCategory,
      createdAt: new Date().toISOString()
    };

    const nextHabits = [...(data.habits || []), newHabit];
    persistData({ ...data, habits: nextHabits });
    setNewHabitName('');
    setHabitInputError('');
    setTimeout(() => {
      addInputRef.current?.focus();
    }, 50);
  };

  const handleStartRename = (habit) => {
    setEditingHabitId(habit.id);
    setEditingName(habit.name);
  };

  const handleSaveRename = (habitId) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingHabitId(null);
      return;
    }
    if (trimmed.length > 40) {
      alert('Habit name must be 40 characters or fewer.');
      return;
    }
    const duplicate = data.habits.some(
      h => h.id !== habitId && h.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      alert('A habit with this name already exists.');
      return;
    }

    const nextHabits = data.habits.map(h => 
      h.id === habitId ? { ...h, name: trimmed } : h
    );
    persistData({ ...data, habits: nextHabits });
    setEditingHabitId(null);
  };

  const confirmDeleteHabit = () => {
    if (!deletingHabit) return;
    const habitId = deletingHabit.id;
    const nextHabits = data.habits.filter(h => h.id !== habitId);
    
    const nextCompletions = { ...data.completions };
    Object.keys(nextCompletions).forEach(mKey => {
      if (nextCompletions[mKey][habitId]) {
        const copyMonth = { ...nextCompletions[mKey] };
        delete copyMonth[habitId];
        nextCompletions[mKey] = copyMonth;
      }
    });

    persistData({ ...data, habits: nextHabits, completions: nextCompletions });
    if (selectedChartHabit === habitId) {
      setSelectedChartHabit('all');
    }
    setDeletingHabit(null);
  };

  // Checkbox toggle with Confetti on milestones!
  const handleToggleDay = (habitId, dayNum, isFuture) => {
    if (isFuture) return;

    const monthComps = data.completions[currentMonthKey] || {};
    const habitComps = monthComps[habitId] || [];

    let nextHabitComps;
    const isNowTicked = !habitComps.includes(dayNum);

    if (!isNowTicked) {
      nextHabitComps = habitComps.filter(d => d !== dayNum);
    } else {
      nextHabitComps = [...habitComps, dayNum].sort((a, b) => a - b);
      
      // Check for streak milestone celebration
      const curr = (habitStreaks[habitId] || 0) + 1;
      if (curr === 7 || curr === 14 || curr === 21 || curr === 30 || curr % 50 === 0) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    }

    const nextData = {
      ...data,
      completions: {
        ...data.completions,
        [currentMonthKey]: {
          ...monthComps,
          [habitId]: nextHabitComps
        }
      }
    };

    persistData(nextData);
  };

  // Note management for cells
  const handleOpenNoteModal = (habit, dayNum) => {
    const noteKey = `${currentMonthKey}-${dayNum}-${habit.id}`;
    const existing = data.notes?.[noteKey] || '';
    setActiveNoteModal({
      habitId: habit.id,
      habitName: habit.name,
      dayNum,
      noteKey,
      text: existing
    });
  };

  const handleSaveNote = () => {
    if (!activeNoteModal) return;
    const nextNotes = { ...(data.notes || {}) };
    if (activeNoteModal.text.trim()) {
      nextNotes[activeNoteModal.noteKey] = activeNoteModal.text.trim();
    } else {
      delete nextNotes[activeNoteModal.noteKey];
    }
    persistData({ ...data, notes: nextNotes });
    setActiveNoteModal(null);
  };

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        addInputRef.current?.focus();
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        handleJumpToToday();
        return;
      }

      if (!focusedCell && (data.habits || []).length > 0) {
        if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
          setFocusedCell({ habitIndex: 0, dayNum: isActualCurrentMonth ? currentDayNum : 1 });
          return;
        }
      }

      if (focusedCell) {
        const { habitIndex, dayNum } = focusedCell;
        const totalH = filteredHabits.length;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (dayNum < totalDaysInMonth) setFocusedCell({ habitIndex, dayNum: dayNum + 1 });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (dayNum > 1) setFocusedCell({ habitIndex, dayNum: dayNum - 1 });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (habitIndex < totalH - 1) setFocusedCell({ habitIndex: habitIndex + 1, dayNum });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (habitIndex > 0) setFocusedCell({ habitIndex: habitIndex - 1, dayNum });
        } else if (e.key === ' ') {
          e.preventDefault();
          const targetHabit = filteredHabits[habitIndex];
          if (targetHabit) {
            const isFuture = isActualCurrentMonth && dayNum > currentDayNum;
            handleToggleDay(targetHabit.id, dayNum, isFuture);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCell, filteredHabits, totalDaysInMonth, isActualCurrentMonth, currentDayNum]);

  // Export / Backup functions
  const handleExportCSV = () => {
    let csv = `Habit,Category,Month,${daysInMonthList.map(d => d.dayNum).join(',')},Total\n`;
    (data.habits || []).forEach(h => {
      const monthComps = data.completions?.[currentMonthKey]?.[h.id] || [];
      const row = [
        `"${h.name}"`,
        h.category || 'health',
        currentMonthKey,
        ...daysInMonthList.map(d => monthComps.includes(d.dayNum) ? '1' : '0'),
        monthComps.length
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HabitGrid_${currentMonthKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HabitGrid_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (parsed.habits && parsed.completions) {
          persistData(parsed);
          alert('Habit data restored successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Completions map for active month
  const activeMonthCompletions = data.completions?.[currentMonthKey] || {};

  // Summary stats computation
  const summaryStats = useMemo(() => {
    const habitCount = (data.habits || []).length;
    let totalCompletions = 0;
    
    (data.habits || []).forEach(h => {
      const comps = activeMonthCompletions[h.id] || [];
      totalCompletions += comps.length;
    });

    const evaluatedDays = isActualCurrentMonth 
      ? Math.max(1, currentDayNum) 
      : ((currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth())) 
          ? totalDaysInMonth 
          : 0);

    const totalPossibleSlots = habitCount * (evaluatedDays || totalDaysInMonth);
    const overallRate = totalPossibleSlots > 0 
      ? Math.round((totalCompletions / totalPossibleSlots) * 100) 
      : 0;

    let bestStreak = 0;
    Object.values(habitStreaks).forEach(s => {
      if (s > bestStreak) bestStreak = s;
    });

    return {
      totalCompletions,
      overallRate,
      bestHabitStreak: bestStreak
    };
  }, [data.habits, activeMonthCompletions, isActualCurrentMonth, currentDayNum, currentYear, currentMonth, today, totalDaysInMonth, habitStreaks]);

  const getCategoryColor = (catId) => {
    return DEFAULT_CATEGORIES.find(c => c.id === catId)?.color || '#10b981';
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ height: '100vh' }}>
        <p>Loading HabitGrid...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Native Desktop Window Drag Bar matching active theme */}
      <div className="window-titlebar-area">
        <div className="window-titlebar-title">
          <span>HabitGrid</span>
          <span className="window-titlebar-version">v1.2.0</span>
        </div>
      </div>

      <div className="app-container">
        {/* Top Header & Navigation */}
        <header className="top-bar">
          <div className="brand-section">
            <div className="logo-badge">HG</div>
            <div>
              <h1 className="app-title">HabitGrid</h1>
              <p className="app-subtitle">Daily Tracker, Streaks & Insights</p>
            </div>
          </div>

        {/* Month Navigator */}
        <div className="nav-controls">
          <button 
            type="button" 
            className="nav-btn" 
            onClick={handlePrevMonth}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="current-month-display">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <button 
            type="button" 
            className="nav-btn" 
            onClick={handleNextMonth}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>

          <button 
            type="button" 
            className="nav-btn btn-today" 
            onClick={handleJumpToToday}
            title="Jump to Current Month [Hotkey: T]"
          >
            <Calendar size={14} /> Today
          </button>
        </div>

        {/* Top Right Actions */}
        <div className="top-right-actions">
          <form className="add-habit-wrapper" onSubmit={handleAddHabit}>
            <input
              ref={addInputRef}
              type="text"
              className="input-habit"
              placeholder="New habit... [N]"
              value={newHabitName}
              maxLength={40}
              onChange={(e) => {
                setNewHabitName(e.target.value);
                if (habitInputError) setHabitInputError('');
              }}
            />
            <select
              className="select-category-mini"
              value={newHabitCategory}
              onChange={(e) => setNewHabitCategory(e.target.value)}
              title="Habit Category"
            >
              <option value="health">Health</option>
              <option value="learning">Learning</option>
              <option value="work">Work</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
            <button 
              type="submit" 
              className="btn-primary" 
              onClick={handleAddHabit}
              title="Add habit to checklist"
            >
              <Plus size={16} /> Add Habit
            </button>
          </form>

          {/* Backup & CSV Buttons */}
          <button
            type="button"
            className="action-square-btn"
            onClick={handleExportCSV}
            title="Export Monthly Sheet to CSV"
          >
            <FileSpreadsheet size={16} />
          </button>

          <button
            type="button"
            className="action-square-btn"
            onClick={handleExportJSON}
            title="Backup Data (JSON)"
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            className="action-square-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Restore Data from Backup JSON"
          >
            <Upload size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleImportJSON} 
          />

          {/* Dark Mode Toggle Button */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setIsDarkMode(prev => !prev)}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Inline Warning for Add Habit */}
      {habitInputError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--danger)',
          fontSize: '13px',
          fontWeight: 500,
          padding: '2px 14px',
          marginTop: '-8px'
        }}>
          <AlertCircle size={14} />
          <span>{habitInputError}</span>
        </div>
      )}

      {/* View Switcher Bar & Category Filter Pills */}
      <div className="view-bar">
        <div className="view-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            <Grid size={15} /> Monthly Grid
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'yearly' ? 'active' : ''}`}
            onClick={() => setActiveTab('yearly')}
          >
            <Sparkles size={15} /> Yearly Consistency Matrix
          </button>
        </div>

        {activeTab === 'monthly' && (
          <div className="filter-category-pills">
            {DEFAULT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Habits</span>
          <span className="stat-value">{(data.habits || []).length}</span>
          <span className="stat-helper">Active tracking items</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Completed Checks</span>
          <span className="stat-value">{summaryStats.totalCompletions}</span>
          <span className="stat-helper">In {MONTH_NAMES[currentMonth]} {currentYear}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Completion Rate</span>
          <span className="stat-value">{summaryStats.overallRate}%</span>
          <span className="stat-helper">Based on elapsed days</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Top Streak</span>
          <span className="stat-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Flame size={18} color="#ea580c" />
            {summaryStats.bestHabitStreak} {summaryStats.bestHabitStreak === 1 ? 'day' : 'days'}
          </span>
          <span className="stat-helper">Consecutive consistent days</span>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'yearly' ? (
        <YearlyHeatmap
          year={currentYear}
          habits={data.habits || []}
          completions={data.completions || {}}
          isDark={isDarkMode}
        />
      ) : (
        /* Main Monthly Grid View */
        <div className="grid-card">
          <div className="grid-card-header">
            <div className="grid-card-title">
              Monthly Checklist ({MONTH_NAMES[currentMonth]} {currentYear})
            </div>
            <div className="grid-legend">
              <div className="legend-item">
                <div className="legend-box done"></div>
                <span>Completed</span>
              </div>
              <div className="legend-item">
                <div className="legend-box today"></div>
                <span>Today</span>
              </div>
              <div className="legend-item">
                <div className="legend-box" style={{ background: 'var(--weekend-bg)' }}></div>
                <span>Weekend</span>
              </div>
              <div className="legend-item">
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                <span>Note attached</span>
              </div>
            </div>
          </div>

          <div className="grid-scroll-container">
            {filteredHabits.length === 0 ? (
              <div className="empty-state">
                <Layers size={36} color="var(--text-muted)" />
                <div className="empty-state-title">No habits found</div>
                <p>Add a new habit using the bar above or change category filter.</p>
              </div>
            ) : (
              <table className="habit-table">
                <thead>
                  <tr>
                    <th className="col-habit">Habit ({filteredHabits.length})</th>
                    {daysInMonthList.map(d => (
                      <th 
                        key={d.dayNum} 
                        className={`day-header ${d.isWeekend ? 'is-weekend' : ''} ${d.isToday ? 'is-today' : ''}`}
                      >
                        <span className="day-name">{d.dayName}</span>
                        <span className="day-num">{d.dayNum}</span>
                      </th>
                    ))}
                    <th className="col-streak">Streak</th>
                    <th className="col-stat">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHabits.map((habit, hIdx) => {
                    const habitComps = activeMonthCompletions[habit.id] || [];
                    const doneCount = habitComps.length;
                    const isEditing = editingHabitId === habit.id;
                    const streakCount = habitStreaks[habit.id] || 0;
                    const habitColor = getCategoryColor(habit.category);

                    return (
                      <tr 
                        key={habit.id} 
                        className={`habit-row ${draggedHabitIndex === hIdx ? 'is-dragging' : ''} ${dragOverHabitIndex === hIdx ? (dragPosition === 'top' ? 'drag-over-top' : 'drag-over-bottom') : ''}`}
                        draggable={!editingHabitId}
                        onDragStart={(e) => {
                          setDraggedHabitIndex(hIdx);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedHabitIndex === null || draggedHabitIndex === hIdx) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          const pos = e.clientY < midY ? 'top' : 'bottom';
                          setDragOverHabitIndex(hIdx);
                          setDragPosition(pos);
                        }}
                        onDragLeave={() => {
                          setDragOverHabitIndex(null);
                          setDragPosition(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedHabitIndex === null || dragOverHabitIndex === null || draggedHabitIndex === dragOverHabitIndex) {
                            setDraggedHabitIndex(null);
                            setDragOverHabitIndex(null);
                            setDragPosition(null);
                            return;
                          }
                          const updated = [...(data.habits || [])];
                          const [moved] = updated.splice(draggedHabitIndex, 1);
                          let insertIndex = dragOverHabitIndex;
                          if (dragPosition === 'bottom' && draggedHabitIndex < dragOverHabitIndex) {
                            // Already shifted
                          } else if (dragPosition === 'bottom') {
                            insertIndex += 1;
                          }
                          updated.splice(insertIndex, 0, moved);
                          persistData({ ...data, habits: updated });
                          setDraggedHabitIndex(null);
                          setDragOverHabitIndex(null);
                          setDragPosition(null);
                        }}
                        onDragEnd={() => {
                          setDraggedHabitIndex(null);
                          setDragOverHabitIndex(null);
                          setDragPosition(null);
                        }}
                      >
                        {/* Fixed Habit Name Column */}
                        <td className="habit-cell-name">
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              className="inline-edit-input"
                              value={editingName}
                              maxLength={40}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => handleSaveRename(habit.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(habit.id);
                                if (e.key === 'Escape') setEditingHabitId(null);
                              }}
                            />
                          ) : (
                            <div className="habit-name-wrapper">
                              <div className="habit-title-container">
                                <span 
                                  className="drag-grip-icon" 
                                  title="Drag to reorder priority"
                                >
                                  <GripVertical size={13} />
                                </span>
                                <span 
                                  className="category-tag-badge" 
                                  style={{ backgroundColor: `${habitColor}22`, color: habitColor }}
                                >
                                  {habit.category || 'health'}
                                </span>
                                <span 
                                  className="habit-text-title"
                                  title="Double click to rename [Drag handle on left to reorder priority]"
                                  onDoubleClick={() => handleStartRename(habit)}
                                >
                                  {habit.name}
                                </span>
                              </div>
                              <div className="habit-row-actions">
                                <button
                                  type="button"
                                  className="btn-icon-action edit-action"
                                  title="Rename habit"
                                  onClick={() => handleStartRename(habit)}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon-action"
                                  title="Delete habit"
                                  onClick={() => setDeletingHabit(habit)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Day Checkbox Cells */}
                        {daysInMonthList.map(d => {
                          const isChecked = habitComps.includes(d.dayNum);
                          const noteKey = `${currentMonthKey}-${d.dayNum}-${habit.id}`;
                          const hasNote = Boolean(data.notes?.[noteKey]);
                          const isFocused = focusedCell?.habitIndex === hIdx && focusedCell?.dayNum === d.dayNum;

                          return (
                            <td 
                              key={d.dayNum} 
                              className={`box-cell ${d.isWeekend ? 'is-weekend' : ''} ${d.isToday ? 'is-today' : ''} ${d.isFuture ? 'is-future' : ''}`}
                            >
                              <button
                                type="button"
                                className={`habit-check-btn ${isChecked ? 'checked' : ''} ${hasNote ? 'has-note' : ''}`}
                                style={
                                  isChecked 
                                    ? { backgroundColor: habitColor, borderColor: habitColor } 
                                    : (isFocused ? { outline: '2px solid var(--primary)' } : {})
                                }
                                disabled={d.isFuture}
                                title={
                                  hasNote 
                                    ? `Note: "${data.notes[noteKey]}" (Right-click to edit)`
                                    : (d.isFuture ? 'Future day' : `${habit.name} - Day ${d.dayNum} (Right-click to add note)`)
                                }
                                onClick={() => handleToggleDay(habit.id, d.dayNum, d.isFuture)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  handleOpenNoteModal(habit, d.dayNum);
                                }}
                              >
                                {isChecked && <Check size={16} strokeWidth={3} />}
                              </button>
                            </td>
                          );
                        })}

                        {/* Streak Column */}
                        <td className="habit-cell-streak">
                          {streakCount > 0 ? (
                            <span title={`${streakCount} consecutive active days`}>
                              🔥 {streakCount}d
                            </span>
                          ) : (
                            <span style={{ opacity: 0.4 }}>-</span>
                          )}
                        </td>

                        {/* Stat Column: Done count */}
                        <td className="habit-cell-stat">
                          {doneCount}/{totalDaysInMonth}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Growth Graph Section */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title-group">
            <TrendingUp size={18} color="var(--primary)" />
            <h2 className="chart-title">Growth Graph ({MONTH_NAMES[currentMonth]} {currentYear})</h2>
          </div>

          <div className="chart-controls">
            {/* Toggle: Cumulative vs Daily % */}
            <div className="toggle-group">
              <button 
                type="button"
                className={`toggle-btn ${chartViewMode === 'cumulative' ? 'active' : ''}`}
                onClick={() => setChartViewMode('cumulative')}
              >
                Cumulative Growth
              </button>
              <button 
                type="button"
                className={`toggle-btn ${chartViewMode === 'daily' ? 'active' : ''}`}
                onClick={() => setChartViewMode('daily')}
              >
                Daily Completion %
              </button>
            </div>

            {/* Filter Dropdown */}
            <select
              className="select-filter"
              value={selectedChartHabit}
              onChange={(e) => setSelectedChartHabit(e.target.value)}
            >
              <option value="all">All Habits</option>
              {(data.habits || []).map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>

        {(data.habits || []).length === 0 ? (
          <div className="empty-state" style={{ height: '220px' }}>
            <Activity size={32} color="var(--text-muted)" />
            <p>Add habits to see your progress graph</p>
          </div>
        ) : (
          <GrowthChart
            habits={data.habits}
            completionsForMonth={activeMonthCompletions}
            totalDaysInMonth={totalDaysInMonth}
            isCurrentMonth={isActualCurrentMonth}
            currentDayNum={currentDayNum}
            viewMode={chartViewMode}
            selectedHabitId={selectedChartHabit}
            isDark={isDarkMode}
          />
        )}
      </div>

      {/* Footer Info */}
      <footer className="app-footer">
        <span>HabitGrid v1.2.0 &bull; Local & Offline &bull; Hotkeys: [Arrow Keys / Spacebar] [N: New Habit] [T: Today]</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={13} />
          <span>Storage:</span>
          <span className="data-path-badge" title={dataPath}>{dataPath || 'habitgrid-data.json'}</span>
        </div>
      </footer>

      {/* Delete Confirmation Modal */}
      {deletingHabit && (
        <div className="modal-overlay" onClick={() => setDeletingHabit(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Habit</h3>
            <p className="modal-body">
              Are you sure you want to delete <strong>"{deletingHabit.name}"</strong>?
              <br />
              This will permanently remove all completion records across all months for this habit.
            </p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setDeletingHabit(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-danger" 
                onClick={confirmDeleteHabit}
              >
                Delete Habit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Cell Note Modal */}
      {activeNoteModal && (
        <div className="modal-overlay" onClick={() => setActiveNoteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              Day {activeNoteModal.dayNum} Note: {activeNoteModal.habitName}
            </h3>
            <p className="modal-body">Add a note or log entry for this day (e.g. distance ran, pages read, reflection):</p>
            <textarea
              autoFocus
              className="note-textarea"
              placeholder="e.g. Completed 5km in 25 mins feeling great..."
              value={activeNoteModal.text}
              onChange={(e) => setActiveNoteModal({ ...activeNoteModal, text: e.target.value })}
            />
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setActiveNoteModal(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleSaveNote}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
