/**
 * TaskFlow - app.js
 * Main entrypoint: orchestrates modules, event listeners, view routing, modals, and reactivity.
 * Migrated to Cloud Firestore for task management with real-time sync.
 */

import { Storage } from './storage.js';
import { Tasks } from './tasks.js';
import { Projects } from './projects.js';
import { Productivity } from './productivity.js';
import { UI, Icons } from './ui.js';

class App {
  constructor() {
    this.state = {
      theme: 'light',
      currentView: 'inbox', // 'inbox', 'today', 'upcoming', 'all', 'productivity', or 'proj-<id>'
      searchQuery: '',
      filterPriority: 'all',
      filterStatus: 'all',
      sortBy: 'dueDate',
      editingTaskId: null,
      projects: [],
      tasks: [],
      isLoadingTasks: true,
      tasksLoadError: null
    };

    this.unsubscribeTasks = null;
  }

  init() {
    // 1. Load initial user preferences (theme and projects from Storage)
    const loadedData = Storage.load();
    this.state.projects = loadedData.projects || [];
    this.state.theme = loadedData.theme || 'light';

    // 2. Apply theme
    this.applyTheme(this.state.theme);

    // 3. Bind UI Events
    this.bindGlobalEvents();

    // 4. Initial Render (with loading spinner on tasks)
    this.render();

    // 5. Connect to Firestore real-time listener
    this.initFirestoreSync();
  }

  initFirestoreSync() {
    this.state.isLoadingTasks = true;
    this.state.tasksLoadError = null;
    this.renderTasks();

    this.unsubscribeTasks = Tasks.subscribe(
      (tasks) => {
        this.state.tasks = tasks;
        this.state.isLoadingTasks = false;
        this.state.tasksLoadError = null;
        this.render();
      },
      (error) => {
        this.state.isLoadingTasks = false;
        this.state.tasksLoadError = error.message || 'Erro ao carregar tarefas do Firestore.';
        UI.toast('Erro ao conectar com o Firestore: ' + error.message, 'error');
        this.render();
      }
    );
  }

  savePreferences() {
    Storage.save({
      projects: this.state.projects,
      theme: this.state.theme
    });
  }

  applyTheme(theme) {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const themeIconBtn = document.getElementById('theme-toggle-btn');
    if (themeIconBtn) {
      themeIconBtn.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
      themeIconBtn.title = theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro';
    }
  }

  toggleTheme() {
    const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    this.savePreferences();
    UI.toast(`Modo ${nextTheme === 'dark' ? 'Escuro' : 'Claro'} ativado`);
  }

  bindGlobalEvents() {
    // Navigation items (Sidebar + Mobile Bottom Nav)
    document.addEventListener('click', (e) => {
      // Nav View click
      const navBtn = e.target.closest('[data-view]');
      if (navBtn && !e.target.closest('[data-action="delete-project"]')) {
        const view = navBtn.getAttribute('data-view');
        this.setView(view);
        this.closeMobileDrawer();
        return;
      }

      // Action triggers
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.getAttribute('data-action');
        this.handleAction(action, actionEl);
      }
    });

    // Search bar input
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value;
        this.renderTasks();
      });
    }

    // Quick Add input form in main area
    const quickAddForm = document.getElementById('quick-add-form');
    if (quickAddForm) {
      quickAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('quick-add-input');
        if (!input || !input.value.trim()) return;

        const originalValue = input.value;
        try {
          let assignedProj = 'proj-inbox';
          if (this.state.currentView.startsWith('proj-')) {
            assignedProj = this.state.currentView;
          }

          let dueDate = '';
          if (this.state.currentView === 'today') {
            dueDate = new Date().toISOString().split('T')[0];
          }

          input.value = '';
          await Tasks.create({
            title: originalValue,
            projectId: assignedProj,
            dueDate: dueDate,
            priority: 4
          });

          UI.toast('Tarefa adicionada no Firestore!');
        } catch (err) {
          console.error(err);
          input.value = originalValue;
          UI.toast(err.message, 'error');
        }
      });
    }

    // Filter controls
    const filterPrioritySelect = document.getElementById('filter-priority');
    if (filterPrioritySelect) {
      filterPrioritySelect.addEventListener('change', (e) => {
        this.state.filterPriority = e.target.value;
        this.renderTasks();
      });
    }

    const filterStatusSelect = document.getElementById('filter-status');
    if (filterStatusSelect) {
      filterStatusSelect.addEventListener('change', (e) => {
        this.state.filterStatus = e.target.value;
        this.renderTasks();
      });
    }

    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.renderTasks();
      });
    }

    // Modal forms submission
    const taskModalForm = document.getElementById('task-modal-form');
    if (taskModalForm) {
      taskModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveTaskModal();
      });
    }

    const projectModalForm = document.getElementById('project-modal-form');
    if (projectModalForm) {
      projectModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveProjectModal();
      });
    }

    // Sidebar drawer toggles
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => this.toggleMobileDrawer());
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeMobileDrawer());
    }

    // Theme toggle button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }
  }

  toggleMobileDrawer() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && backdrop) {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('active');
    }
  }

  closeMobileDrawer() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && backdrop) {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    }
  }

  setView(view) {
    this.state.currentView = view;
    this.render();
  }

  async handleAction(action, element) {
    switch (action) {
      case 'open-add-task-modal':
        this.openTaskModal();
        break;

      case 'open-add-project-modal':
        this.openProjectModal();
        break;

      case 'toggle-task': {
        const taskId = element.getAttribute('data-task-id');
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
          await Tasks.toggleComplete(taskId, task.completed);
          // UI updates automatically via onSnapshot
        } catch (err) {
          console.error(err);
          UI.toast('Erro ao atualizar tarefa: ' + err.message, 'error');
        }
        break;
      }

      case 'edit-task': {
        const taskId = element.getAttribute('data-task-id');
        this.openTaskModal(taskId);
        break;
      }

      case 'delete-task': {
        const taskId = element.getAttribute('data-task-id');
        if (confirm('Deseja realmente excluir esta tarefa?')) {
          try {
            await Tasks.remove(taskId);
            UI.toast('Tarefa removida com sucesso.');
          } catch (err) {
            console.error(err);
            UI.toast('Erro ao excluir tarefa: ' + err.message, 'error');
          }
        }
        break;
      }

      case 'delete-project': {
        const projectId = element.getAttribute('data-project-id');
        this.promptDeleteProject(projectId);
        break;
      }

      case 'close-modal': {
        const modal = element.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
        break;
      }
    }
  }

  async promptDeleteProject(projectId) {
    const project = Projects.getById(this.state.projects, projectId);
    if (!project) return;

    const taskCount = this.state.tasks.filter(t => t.projectId === projectId).length;
    let message = `Excluir o projeto "${project.name}"?`;

    if (taskCount > 0) {
      message += `\n\nEste projeto possui ${taskCount} tarefas cadastradas.\n\nClique em [OK] para mover as tarefas para a Caixa de Entrada.\nClique em [Cancelar] para cancelar a exclusão.`;
      if (confirm(message)) {
        try {
          await Tasks.handleProjectDeletion(this.state.tasks, projectId, 'move');
          this.state.projects = Projects.remove(this.state.projects, projectId);
          if (this.state.currentView === projectId) {
            this.state.currentView = 'inbox';
          }
          this.savePreferences();
          this.render();
          UI.toast('Projeto excluído e tarefas transferidas para a Caixa de Entrada.');
        } catch (err) {
          console.error(err);
          UI.toast('Erro ao processar tarefas do projeto: ' + err.message, 'error');
        }
      }
    } else {
      if (confirm(message)) {
        this.state.projects = Projects.remove(this.state.projects, projectId);
        if (this.state.currentView === projectId) {
          this.state.currentView = 'inbox';
        }
        this.savePreferences();
        this.render();
        UI.toast('Projeto excluído.');
      }
    }
  }

  openTaskModal(taskId = null) {
    this.state.editingTaskId = taskId;
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('task-modal-title');
    const inputTitle = document.getElementById('modal-task-title');
    const inputDesc = document.getElementById('modal-task-desc');
    const selectProject = document.getElementById('modal-task-project');
    const selectPriority = document.getElementById('modal-task-priority');
    const inputDueDate = document.getElementById('modal-task-due');

    // Populate projects dropdown
    if (selectProject) {
      selectProject.innerHTML = this.state.projects.map(p => `
        <option value="${p.id}">${UI.escapeHTML(p.name)}</option>
      `).join('');
    }

    if (taskId) {
      modalTitle.textContent = 'Editar Tarefa';
      const task = this.state.tasks.find(t => t.id === taskId);
      if (task) {
        inputTitle.value = task.title;
        inputDesc.value = task.description || '';
        selectProject.value = task.projectId;
        selectPriority.value = task.priority;
        inputDueDate.value = task.dueDate || '';
      }
    } else {
      modalTitle.textContent = 'Nova Tarefa';
      inputTitle.value = '';
      inputDesc.value = '';
      selectProject.value = this.state.currentView.startsWith('proj-') ? this.state.currentView : 'proj-inbox';
      selectPriority.value = '4';
      inputDueDate.value = this.state.currentView === 'today' ? new Date().toISOString().split('T')[0] : '';
    }

    modal.classList.add('active');
    setTimeout(() => inputTitle.focus(), 100);
  }

  async handleSaveTaskModal() {
    const inputTitle = document.getElementById('modal-task-title');
    const inputDesc = document.getElementById('modal-task-desc');
    const selectProject = document.getElementById('modal-task-project');
    const selectPriority = document.getElementById('modal-task-priority');
    const inputDueDate = document.getElementById('modal-task-due');
    const submitBtn = document.getElementById('task-modal-submit-btn');

    const title = inputTitle.value.trim();
    if (!title) {
      alert('Por favor, digite o título da tarefa.');
      return;
    }

    const modal = document.getElementById('task-modal');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Salvar Tarefa';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';
    }

    try {
      if (this.state.editingTaskId) {
        await Tasks.update(this.state.editingTaskId, {
          title,
          description: inputDesc.value,
          projectId: selectProject.value,
          priority: selectPriority.value,
          dueDate: inputDueDate.value
        });
        UI.toast('Tarefa atualizada com sucesso no Firestore.');
      } else {
        await Tasks.create({
          title,
          description: inputDesc.value,
          projectId: selectProject.value,
          priority: selectPriority.value,
          dueDate: inputDueDate.value
        });
        UI.toast('Nova tarefa criada no Firestore!');
      }

      // Limpar campos e fechar apenas após confirmação da persistência
      inputTitle.value = '';
      inputDesc.value = '';
      inputDueDate.value = '';
      this.state.editingTaskId = null;
      modal.classList.remove('active');
    } catch (err) {
      console.error('Erro ao persistir tarefa no Firestore:', err);
      UI.toast('Erro ao salvar tarefa: ' + (err.message || err), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  }

  openProjectModal() {
    const modal = document.getElementById('project-modal');
    const inputName = document.getElementById('modal-project-name');
    const paletteContainer = document.getElementById('modal-project-colors');

    inputName.value = '';

    // Render color swatches
    paletteContainer.innerHTML = Projects.PALETTE.map((color, index) => `
      <div class="color-swatch-radio ${index === 0 ? 'selected' : ''}" 
           style="background-color: ${color};" 
           data-color="${color}">
      </div>
    `).join('');

    // Color click event
    paletteContainer.querySelectorAll('.color-swatch-radio').forEach(el => {
      el.addEventListener('click', () => {
        paletteContainer.querySelectorAll('.color-swatch-radio').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
      });
    });

    modal.classList.add('active');
    setTimeout(() => inputName.focus(), 100);
  }

  handleSaveProjectModal() {
    const inputName = document.getElementById('modal-project-name');
    const name = inputName.value.trim();
    if (!name) {
      alert('Por favor, informe o nome do projeto.');
      return;
    }

    const selectedColorEl = document.querySelector('.color-swatch-radio.selected');
    const color = selectedColorEl ? selectedColorEl.getAttribute('data-color') : Projects.PALETTE[0];

    try {
      this.state.projects = Projects.create(this.state.projects, name, color);
      document.getElementById('project-modal').classList.remove('active');
      this.savePreferences();
      this.render();
      UI.toast(`Projeto "${name}" criado com sucesso!`);
    } catch (err) {
      alert(err.message);
    }
  }

  getViewDetails() {
    if (this.state.currentView === 'inbox') {
      return { title: 'Caixa de Entrada', subtitle: 'Capture todas as ideias e processe com clareza.' };
    }
    if (this.state.currentView === 'today') {
      return { title: 'Hoje', subtitle: 'Foco exclusivo nas tarefas agendadas para o dia.' };
    }
    if (this.state.currentView === 'upcoming') {
      return { title: 'Próximos dias', subtitle: 'Planeje sua semana e antecipe prazos importantes.' };
    }
    if (this.state.currentView === 'all') {
      return { title: 'Todas as tarefas', subtitle: 'Visão global de todas as demandas em andamento.' };
    }
    if (this.state.currentView === 'productivity') {
      return { title: 'Painel de Produtividade', subtitle: 'Métricas, ritmo e análise de desempenho.' };
    }
    if (this.state.currentView.startsWith('proj-')) {
      const proj = Projects.getById(this.state.projects, this.state.currentView);
      if (proj) {
        return { title: proj.name, subtitle: `Demandas organizadas no projeto ${proj.name}.` };
      }
    }
    return { title: 'Tarefas', subtitle: 'Gerenciamento organizado de atividades.' };
  }

  calculateCounts() {
    const todayStr = new Date().toISOString().split('T')[0];
    const counts = {
      inbox: 0,
      today: 0,
      upcoming: 0,
      all: this.state.tasks.filter(t => !t.completed).length
    };

    const projectCounts = {};

    this.state.tasks.forEach(task => {
      if (!task.completed) {
        if (task.projectId === 'proj-inbox') counts.inbox++;
        if (task.dueDate === todayStr) counts.today++;
        if (task.dueDate && task.dueDate > todayStr) counts.upcoming++;

        projectCounts[task.projectId] = (projectCounts[task.projectId] || 0) + 1;
      }
    });

    return { counts, projectCounts };
  }

  renderTasks() {
    const taskContainer = document.getElementById('task-list-container');
    if (!taskContainer) return;

    if (this.state.isLoadingTasks) {
      UI.renderLoading(taskContainer);
      return;
    }

    if (this.state.tasksLoadError) {
      UI.renderError(taskContainer, this.state.tasksLoadError);
      return;
    }

    const filteredTasks = Tasks.filterAndSort(this.state.tasks, {
      view: this.state.currentView,
      searchQuery: this.state.searchQuery,
      priority: this.state.filterPriority,
      status: this.state.filterStatus,
      sortBy: this.state.sortBy
    });

    UI.renderTaskList(filteredTasks, this.state.projects, taskContainer);
  }

  render() {
    // 1. Calculate badge counts
    const { counts, projectCounts } = this.calculateCounts();

    // 2. Update navigation badges
    const badgeInbox = document.getElementById('badge-inbox');
    const badgeToday = document.getElementById('badge-today');
    const badgeUpcoming = document.getElementById('badge-upcoming');
    const badgeAll = document.getElementById('badge-all');

    if (badgeInbox) badgeInbox.textContent = counts.inbox || '';
    if (badgeToday) badgeToday.textContent = counts.today || '';
    if (badgeUpcoming) badgeUpcoming.textContent = counts.upcoming || '';
    if (badgeAll) badgeAll.textContent = counts.all || '';

    // 3. Highlight active navigation links
    document.querySelectorAll('[data-view]').forEach(el => {
      if (el.getAttribute('data-view') === this.state.currentView) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // 4. Render Project List in Sidebar
    UI.renderSidebarProjects(this.state.projects, this.state.currentView, projectCounts);

    // 5. Main content view switching
    const tasksViewPanel = document.getElementById('tasks-view-panel');
    const productivityViewPanel = document.getElementById('productivity-view-panel');

    if (this.state.currentView === 'productivity') {
      if (tasksViewPanel) tasksViewPanel.style.display = 'none';
      if (productivityViewPanel) {
        productivityViewPanel.style.display = 'block';
        const metrics = Productivity.calculateMetrics(this.state.tasks);
        const history7Days = Productivity.getSevenDayHistory(this.state.tasks);
        const priorityDist = Productivity.getPriorityDistribution(this.state.tasks);
        const projectDist = Productivity.getProjectDistribution(this.state.tasks, this.state.projects);
        UI.renderProductivityDashboard(metrics, history7Days, priorityDist, projectDist, productivityViewPanel);
      }
    } else {
      if (productivityViewPanel) productivityViewPanel.style.display = 'none';
      if (tasksViewPanel) {
        tasksViewPanel.style.display = 'block';
        const viewInfo = this.getViewDetails();
        const titleEl = document.getElementById('view-main-title');
        const subTitleEl = document.getElementById('view-main-subtitle');
        if (titleEl) titleEl.textContent = viewInfo.title;
        if (subTitleEl) subTitleEl.textContent = viewInfo.subtitle;

        this.renderTasks();
      }
    }
  }
}

// Instantiate and start on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
