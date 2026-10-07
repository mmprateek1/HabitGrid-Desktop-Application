import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function GrowthChart({
  habits,
  completionsForMonth,
  totalDaysInMonth,
  isCurrentMonth,
  currentDayNum,
  viewMode, // 'cumulative' | 'daily'
  selectedHabitId, // 'all' | habitId
  isDark = false
}) {
  // Determine cutoff day: if selected month is current month, line stops at today (G6)
  const maxPlottableDay = isCurrentMonth ? currentDayNum : totalDaysInMonth;

  // Labels for days 1 to totalDaysInMonth
  const labels = Array.from({ length: totalDaysInMonth }, (_, i) => `Day ${i + 1}`);

  // Calculate values
  const dataPoints = [];
  let runningCumulative = 0;

  for (let day = 1; day <= totalDaysInMonth; day++) {
    if (day > maxPlottableDay) {
      dataPoints.push(null);
      continue;
    }

    let dailyCount = 0;
    const relevantHabits = selectedHabitId === 'all' 
      ? habits 
      : habits.filter(h => h.id === selectedHabitId);

    relevantHabits.forEach(h => {
      const habitComps = completionsForMonth[h.id] || [];
      if (habitComps.includes(day)) {
        dailyCount++;
      }
    });

    if (viewMode === 'cumulative') {
      runningCumulative += dailyCount;
      dataPoints.push(runningCumulative);
    } else {
      // Daily completion percentage
      const totalPossible = relevantHabits.length || 1;
      const pct = Math.round((dailyCount / totalPossible) * 100);
      dataPoints.push(pct);
    }
  }

  const habitName = selectedHabitId === 'all'
    ? 'All Habits'
    : habits.find(h => h.id === selectedHabitId)?.name || 'Selected Habit';

  const datasetLabel = viewMode === 'cumulative' 
    ? `${habitName} (Cumulative Done)`
    : `${habitName} (Daily Completion %)`;

  const primaryColor = isDark ? '#10b981' : '#059669';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const chartData = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data: dataPoints,
        borderColor: primaryColor,
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.25,
        pointBackgroundColor: primaryColor,
        pointBorderColor: isDark ? '#1e293b' : '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#334155',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            if (val === null) return 'Future day';
            return viewMode === 'cumulative' 
              ? ` Total completed: ${val}` 
              : ` Completion: ${val}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: gridColor
        },
        ticks: {
          font: { size: 11 },
          color: textColor,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 16
        }
      },
      y: {
        beginAtZero: true,
        suggestedMax: viewMode === 'daily' ? 100 : Math.max(5, habits.length * 3),
        ticks: {
          stepSize: viewMode === 'cumulative' ? (habits.length > 5 ? 5 : 1) : 25,
          font: { size: 11 },
          color: textColor,
          callback: (value) => (viewMode === 'daily' ? `${value}%` : value)
        },
        grid: {
          color: gridColor
        }
      }
    }
  };

  return (
    <div className="chart-container-box">
      <Line data={chartData} options={options} />
    </div>
  );
}
