/**
 * TaskFlow - productivity.js
 * Productivity metrics, completion rates, 7-day completion breakdown,
 * and project/priority distribution calculation.
 */

export const Productivity = {
  /**
   * Calculates overall metrics and statistics.
   */
  calculateMetrics(tasks) {
    const todayStr = new Date().toISOString().split('T')[0];
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    // Completed today
    const completedToday = tasks.filter(t => {
      if (!t.completed || !t.completedAt) return false;
      return t.completedAt.startsWith(todayStr);
    }).length;

    // Overdue tasks: dueDate < today and not completed
    const overdue = tasks.filter(t => {
      return !t.completed && t.dueDate && t.dueDate < todayStr;
    }).length;

    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      completedToday,
      overdue,
      completionRate
    };
  },

  /**
   * Generates 7-day completion history for the native chart.
   */
  getSevenDayHistory(tasks) {
    const days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' });

      // Count tasks completed on this date
      const count = tasks.filter(t => {
        return t.completed && t.completedAt && t.completedAt.startsWith(dateStr);
      }).length;

      days.push({
        date: dateStr,
        label: weekday.charAt(0).toUpperCase() + weekday.slice(1, 3),
        count
      });
    }

    const maxCount = Math.max(...days.map(d => d.count), 1);

    return days.map(d => ({
      ...d,
      percentage: Math.round((d.count / maxCount) * 100)
    }));
  },

  /**
   * Distribution by priority.
   */
  getPriorityDistribution(tasks) {
    const total = tasks.length || 1;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    tasks.forEach(t => {
      if (counts[t.priority] !== undefined) {
        counts[t.priority]++;
      }
    });

    return [
      { priority: 1, label: 'P1 - Urgente', count: counts[1], percentage: Math.round((counts[1] / total) * 100), color: '#F43F5E' },
      { priority: 2, label: 'P2 - Alta', count: counts[2], percentage: Math.round((counts[2] / total) * 100), color: '#F59E0B' },
      { priority: 3, label: 'P3 - Média', count: counts[3], percentage: Math.round((counts[3] / total) * 100), color: '#64748B' },
      { priority: 4, label: 'P4 - Normal', count: counts[4], percentage: Math.round((counts[4] / total) * 100), color: '#94A3B8' }
    ];
  },

  /**
   * Distribution by project.
   */
  getProjectDistribution(tasks, projects) {
    const total = tasks.length || 1;
    return projects.map(proj => {
      const count = tasks.filter(t => t.projectId === proj.id).length;
      return {
        id: proj.id,
        name: proj.name,
        color: proj.color,
        count,
        percentage: Math.round((count / total) * 100)
      };
    });
  }
};
