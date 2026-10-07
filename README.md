# HabitGrid - Desktop Habit Tracker (v1.0)

A simple, fast, offline monthly habit tracker desktop application with cumulative and daily growth graphs, built according to your PRD.

---

## Features Built

- **Box-Style Monthly Grid**:
  - Habits listed on the left column (sticky during horizontal scrolling).
  - Days 1 to $N$ across the top (sticky during vertical scrolling, handles leap years and 28/29/30/31 days).
  - Current day highlighted in blue.
  - Weekend columns lightly tinted.
  - Interactive square checkbox cells with smooth green fill on completion.
  - Future days disabled to keep tracking honest.
  - Completed counts per habit (e.g. `12/31`).

- **Habit Management**:
  - **Add Habit**: Input at the top with validation (max 40 chars, no duplicates, trim whitespace).
  - **Inline Rename**: Double-click any habit name in the table to edit in-place (Enter to save, Esc to cancel).
  - **Delete Habit**: Hover over a habit row and click the trash icon. Prompts a confirmation modal explaining that completion data will be removed.

- **Growth Graph (Chart.js)**:
  - **Cumulative Growth**: Running total completions plotted up to the current day.
  - **Daily Completion %**: Percentage of habits finished each day.
  - **Habit Filter**: View "All Habits" or filter to an individual habit.
  - Interactive tooltips showing exact day and counts.

- **Summary KPI Cards**:
  - Total active habits.
  - Completed checks this month.
  - Overall completion rate percentage.
  - Top active consecutive streak.

- **Local Persistence**:
  - Stores all data directly inside this folder in [`habitgrid-data.json`](./habitgrid-data.json).
  - Writes data atomically to prevent corruption.

---

## How to Run & Build

### Running the App:
```bash
# Launch HabitGrid in Electron desktop mode:
npm run build:react
npx electron .
```
Or for live-reload development:
```bash
npm start
```

### Packaging an Installer (.exe for Windows):
```bash
npm run build
```
*(Produces an installer executable in the `release/` directory)*
