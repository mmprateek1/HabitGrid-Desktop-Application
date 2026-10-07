import React, { useMemo } from 'react';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function YearlyHeatmap({
  year,
  habits,
  completions,
  isDark
}) {
  // Build a map of "YYYY-MM-DD" -> count of completed habits
  const heatMapData = useMemo(() => {
    const counts = {};
    const habitCount = habits.length;

    // Iterate through all 12 months for this year
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      const mKey = `${year}-${mStr}`;
      const monthComps = completions[mKey] || {};

      const daysInMonth = new Date(year, m, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = String(d).padStart(2, '0');
        const dateKey = `${year}-${mStr}-${dStr}`;

        let doneForDay = 0;
        habits.forEach(h => {
          const habitDone = monthComps[h.id] || [];
          if (habitDone.includes(d)) {
            doneForDay++;
          }
        });

        counts[dateKey] = {
          count: doneForDay,
          total: habitCount,
          pct: habitCount > 0 ? (doneForDay / habitCount) : 0
        };
      }
    }
    return counts;
  }, [year, habits, completions]);

  // Generate calendar days for the entire year organized into weeks
  const calendarWeeks = useMemo(() => {
    const weeks = [];
    let currentWeek = new Array(7).fill(null);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay(); // 0 is Sunday
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${mStr}-${dStr}`;

      const cellInfo = heatMapData[dateKey] || { count: 0, total: habits.length, pct: 0 };

      currentWeek[dayOfWeek] = {
        dateKey,
        dayNum: d.getDate(),
        month: d.getMonth(),
        dayOfWeek,
        count: cellInfo.count,
        total: cellInfo.total,
        pct: cellInfo.pct
      };

      if (dayOfWeek === 6 || d.getTime() === endDate.getTime()) {
        weeks.push([...currentWeek]);
        currentWeek = new Array(7).fill(null);
      }
    }

    return weeks;
  }, [year, heatMapData, habits.length]);

  // Color helper based on completion percentage
  const getCellColor = (cell) => {
    if (!cell) return 'transparent';
    if (cell.count === 0) return isDark ? '#1e293b' : '#f1f5f9';

    if (cell.pct <= 0.25) return isDark ? '#064e3b' : '#a7f3d0';
    if (cell.pct <= 0.50) return isDark ? '#047857' : '#34d399';
    if (cell.pct <= 0.75) return isDark ? '#059669' : '#10b981';
    return isDark ? '#10b981' : '#059669';
  };

  return (
    <div className="yearly-heatmap-wrapper">
      <div className="heatmap-header">
        <h3 className="heatmap-title">{year} Yearly Consistency Matrix</h3>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-swatch" style={{ background: isDark ? '#1e293b' : '#f1f5f9' }} />
          <div className="heatmap-swatch" style={{ background: isDark ? '#064e3b' : '#a7f3d0' }} />
          <div className="heatmap-swatch" style={{ background: isDark ? '#047857' : '#34d399' }} />
          <div className="heatmap-swatch" style={{ background: isDark ? '#059669' : '#10b981' }} />
          <div className="heatmap-swatch" style={{ background: isDark ? '#10b981' : '#059669' }} />
          <span>More</span>
        </div>
      </div>

      <div className="heatmap-scroll-area">
        <div className="heatmap-grid">
          {calendarWeeks.map((week, wIdx) => (
            <div key={wIdx} className="heatmap-col">
              {week.map((cell, dIdx) => (
                <div
                  key={dIdx}
                  className={`heatmap-cell ${cell ? 'active-cell' : 'empty-cell'}`}
                  style={{ backgroundColor: getCellColor(cell) }}
                  title={
                    cell 
                      ? `${cell.dateKey}: ${cell.count} / ${cell.total} habits completed (${Math.round(cell.pct * 100)}%)` 
                      : ''
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-months-row">
        {MONTH_NAMES.map(m => (
          <span key={m} className="heatmap-month-label">{m}</span>
        ))}
      </div>
    </div>
  );
}
