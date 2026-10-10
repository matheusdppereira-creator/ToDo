/**
 * TaskFlow - ui.js
 * Reactive DOM rendering, modal handling, toast alerts, Lucide SVG icons, and productivity visuals.
 */

// Native Clean Lucide SVG Icons Dictionary
export const Icons = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  calendarClock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  listCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 12H3"/><path d="M16 6H3"/><path d="M10 18H3"/><path d="m21 18-3-3-3 3"/><path d="m18 15v6"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
};

export const UI = {
  /**
   * Safe HTML Escaping for security.
   */
  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Render Toast notification
   */
  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.innerHTML = `<span>${this.escapeHTML(message)}</span>`;
    container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(10px)';
      toastEl.style.transition = 'all 200ms ease';
      setTimeout(() => toastEl.remove(), 250);
    }, 2800);
  },

  /**
   * Formats a date string (YYYY-MM-DD) to friendly local display
   */
  formatDueDate(dateStr) {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const isOverdue = dateStr < today;

    let label = '';
    if (dateStr === today) {
      label = 'Hoje';
    } else if (dateStr === tomorrow) {
      label = 'Amanhã';
    } else if (dateStr === yesterday) {
      label = 'Ontem';
    } else {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        label = `${parts[2]}/${parts[1]}`;
      } else {
        label = dateStr;
      }
    }

    return { label, isOverdue };
  },

  /**
   * Renders sidebar project items list.
   */
  renderSidebarProjects(projects, activeView, taskCounts) {
    const list = document.getElementById('projects-nav-list');
    if (!list) return;

    list.innerHTML = projects.map(proj => {
      const count = taskCounts[proj.id] || 0;
      const isActive = activeView === proj.id;
      return `
        <li>
          <button class="nav-item-btn ${isActive ? 'active' : ''}" data-view="${proj.id}">
            <div class="nav-item-left">
              <span class="project-bullet" style="background-color: ${proj.color};"></span>
              <span class="truncate">${this.escapeHTML(proj.name)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.25rem;">
              ${count > 0 ? `<span class="nav-badge">${count}</span>` : ''}
              ${!proj.isDefault ? `
                <span class="btn-ghost" data-action="delete-project" data-project-id="${proj.id}" title="Excluir Projeto" style="padding: 2px 4px;">
                  <span style="width:14px; height:14px; display:inline-block;">${Icons.trash}</span>
                </span>
              ` : ''}
            </div>
          </button>
        </li>
      `;
    }).join('');
  },

  /**
   * Render priority pill badge HTML
   */
  getPriorityBadge(priority) {
    switch (Number(priority)) {
      case 1:
        return `<span class="pill priority-p1"><span style="width:12px;height:12px;">${Icons.flag}</span> Urgente</span>`;
      case 2:
        return `<span class="pill priority-p2"><span style="width:12px;height:12px;">${Icons.flag}</span> Alta</span>`;
      case 3:
        return `<span class="pill priority-p3">Média</span>`;
      case 4:
      default:
        return `<span class="pill priority-p4">Normal</span>`;
    }
  },

  /**
   * Renders the Task List items.
   */
  renderTaskList(tasks, projects, container) {
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          ${Icons.sparkle}
          <p class="empty-state-title">Nenhuma tarefa encontrada</p>
          <p class="empty-state-subtitle">Você está com tudo em ordem ou nenhum item corresponde aos filtros selecionados.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(task => {
      const proj = projects.find(p => p.id === task.projectId) || { name: 'Geral', color: '#6366F1' };
      const dueInfo = this.formatDueDate(task.dueDate);

      return `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
          <button class="task-checkbox-btn" data-action="toggle-task" data-task-id="${task.id}" title="${task.completed ? 'Desmarcar' : 'Concluir'}">
            ${Icons.check}
          </button>
          
          <div class="task-content">
            <div class="task-header-row">
              <span class="task-title">${this.escapeHTML(task.title)}</span>
              <div class="task-actions">
                <button class="btn-ghost" data-action="edit-task" data-task-id="${task.id}" title="Editar">
                  <span style="width:15px; height:15px; display:inline-block;">${Icons.edit}</span>
                </button>
                <button class="btn-ghost" data-action="delete-task" data-task-id="${task.id}" title="Excluir">
                  <span style="width:15px; height:15px; display:inline-block;">${Icons.trash}</span>
                </button>
              </div>
            </div>

            ${task.description ? `<p class="task-desc">${this.escapeHTML(task.description)}</p>` : ''}

            <div class="task-meta-row">
              <span class="pill project-pill">
                <span class="project-bullet" style="background-color: ${proj.color}; width:7px; height:7px;"></span>
                ${this.escapeHTML(proj.name)}
              </span>

              ${dueInfo ? `
                <span class="pill due-pill ${(!task.completed && dueInfo.isOverdue) ? 'overdue' : ''}">
                  <span style="width:12px; height:12px;">${Icons.calendar}</span>
                  ${dueInfo.label}
                </span>
              ` : ''}

              ${this.getPriorityBadge(task.priority)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Renders the Native Productivity Dashboard.
   */
  renderProductivityDashboard(metrics, history7Days, priorityDist, projectDist, container) {
    if (!container) return;

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Painel de Produtividade</h1>
          <p class="view-subtitle">Acompanhe seu fluxo de trabalho, entregas diárias e eficiência geral.</p>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total de Tarefas</span>
          <span class="stat-value">${metrics.total}</span>
        </div>
        <div class="stat-card accent-emerald">
          <span class="stat-label">Concluídas</span>
          <span class="stat-value">${metrics.completed}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Pendentes</span>
          <span class="stat-value">${metrics.pending}</span>
        </div>
        <div class="stat-card accent-indigo">
          <span class="stat-label">Hoje</span>
          <span class="stat-value">${metrics.completedToday}</span>
        </div>
        <div class="stat-card accent-rose">
          <span class="stat-label">Vencidas</span>
          <span class="stat-value">${metrics.overdue}</span>
        </div>
        <div class="stat-card accent-emerald">
          <span class="stat-label">Taxa Conclusão</span>
          <span class="stat-value">${metrics.completionRate}%</span>
        </div>
      </div>

      <!-- 7-Day Completion Bar Chart (Pure CSS) -->
      <div class="chart-card">
        <div class="chart-header">
          <h2 class="chart-title">Conclusões nos Últimos 7 Dias</h2>
          <span style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">Entregas diárias</span>
        </div>
        <div class="bar-chart-container">
          ${history7Days.map(item => `
            <div class="bar-col">
              <div class="bar-pill" style="height: ${Math.max(item.percentage, 8)}%;">
                <span class="bar-value-tooltip">${item.count}</span>
              </div>
              <span class="bar-label">${item.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Distributions -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
        <!-- Priority Distribution -->
        <div class="chart-card">
          <div class="chart-header">
            <h2 class="chart-title">Distribuição por Prioridade</h2>
          </div>
          <div class="progress-bar-group">
            ${priorityDist.map(item => `
              <div class="progress-item">
                <div class="progress-info">
                  <span>${item.label}</span>
                  <span style="font-weight:600;">${item.count} (${item.percentage}%)</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width: ${item.percentage}%; background-color: ${item.color};"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Project Distribution -->
        <div class="chart-card">
          <div class="chart-header">
            <h2 class="chart-title">Distribuição por Projeto</h2>
          </div>
          <div class="progress-bar-group">
            ${projectDist.map(item => `
              <div class="progress-item">
                <div class="progress-info">
                  <span style="display:flex; align-items:center; gap:0.4rem;">
                    <span class="project-bullet" style="background-color: ${item.color}; width:8px; height:8px;"></span>
                    ${this.escapeHTML(item.name)}
                  </span>
                  <span style="font-weight:600;">${item.count} (${item.percentage}%)</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width: ${item.percentage}%; background-color: ${item.color};"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
};
