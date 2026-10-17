/**
 * TaskFlow - app.js
 * Main entrypoint: orchestrates modules, event listeners, authentication, view routing, modals, and reactivity.
 * Renderização condicional estrita entre Loading Global, Tela de Login e Área de Trabalho Autenticada.
 */

import { Storage } from './storage.js';
import { Tasks } from './tasks.js';
import { Projects } from './projects.js';
import { Productivity } from './productivity.js';
import { UI, Icons } from './ui.js';
import { Auth, checkIsAdmin, isUserAuthorized, syncUserProfile, getFriendlyErrorMessage } from './auth.js';

class App {
  constructor() {
    this.state = {
      // Estado Global de Autenticação
      currentUser: null,
      user: null,
      isLoadingAuth: true,
      isAdmin: false,
      adminSelectedUserId: 'all', // 'all' ou uid específico
      registeredUsers: [],

      // Preferências e Filtros de UI
      theme: 'light',
      currentView: 'inbox', // 'inbox', 'today', 'upcoming', 'all', 'productivity', or 'proj-<id>'
      searchQuery: '',
      filterPriority: 'all',
      filterStatus: 'all',
      sortBy: 'dueDate',
      editingTaskId: null,
      editingProjectId: null,
      projects: [],
      tasks: [],
      isLoadingTasks: false,
      tasksLoadError: null,
      isLoadingProjects: false,
      projectsLoadError: null,

      // Estado do formulário de autenticação
      authMode: 'login', // 'login' | 'register' | 'forgot'
      unverifiedUserPending: null
    };

    this.unsubscribeTasks = null;
    this.unsubscribeProjects = null;
    this.unsubscribeUsers = null;
  }

  init() {
    // 1. Carregar preferências locais (apenas Tema)
    const loadedData = Storage.load();
    this.state.theme = loadedData.theme || 'light';
    this.applyTheme(this.state.theme);

    // 2. Garantir que apenas o Loading Global esteja visível inicialmente
    this.state.isLoadingAuth = true;
    this.state.currentUser = null;
    this.updateAppViewVisibility();

    // 3. Vincular eventos da UI e de autenticação
    this.bindGlobalEvents();
    this.bindAuthEvents();

    // 4. Monitorar estado de autenticação (onAuthStateChanged)
    Auth.onAuthState((user) => {
      this.handleAuthStateChange(user);
    });
  }

  /* ============================================================
     Controle Rigoroso e Exclusivo de Views (Loading vs Auth vs App)
     ============================================================ */
  updateAppViewVisibility() {
    const loadingScreen = document.getElementById('global-loading-screen');
    const authScreen = document.getElementById('auth-screen');
    const appRoot = document.getElementById('app-root');

    // Caso 1: Verificando sessão (isLoadingAuth === true) -> APENAS Loading
    if (this.state.isLoadingAuth) {
      if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
        loadingScreen.style.display = 'flex';
      }
      if (authScreen) {
        authScreen.classList.add('hidden');
        authScreen.style.display = 'none';
      }
      if (appRoot) {
        appRoot.classList.add('hidden');
        appRoot.style.display = 'none';
      }
      return;
    }

    // Caso 2: Usuário NÃO autenticado (currentUser === null) -> APENAS Tela de Login
    if (!this.state.currentUser) {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        loadingScreen.style.display = 'none';
      }
      if (appRoot) {
        appRoot.classList.add('hidden');
        appRoot.style.display = 'none';
      }
      if (authScreen) {
        authScreen.classList.remove('hidden');
        authScreen.style.display = 'flex';
      }
      return;
    }

    // Caso 3: Usuário Autenticado e Verificado -> APENAS Área de Trabalho (#app-root)
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      loadingScreen.style.display = 'none';
    }
    if (authScreen) {
      authScreen.classList.add('hidden');
      authScreen.style.display = 'none';
    }
    if (appRoot) {
      appRoot.classList.remove('hidden');
      appRoot.style.display = 'flex';
      appRoot.style.filter = 'none';
    }
  }

  /* ============================================================
     Gerenciamento de Autenticação e Sessão
     ============================================================ */
  async handleAuthStateChange(user) {
    // 1. Sem usuário logado
    if (!user) {
      this.teardownListeners();
      this.state.currentUser = null;
      this.state.user = null;
      this.state.isAdmin = false;
      this.state.isLoadingAuth = false;
      this.updateAppViewVisibility();
      return;
    }

    // 2. Usuário logado por E-mail/Senha mas ainda NÃO verificado (e não é Admin nem Google)
    if (!isUserAuthorized(user)) {
      this.teardownListeners();
      this.state.currentUser = null;
      this.state.user = null;
      this.state.isAdmin = false;
      this.state.unverifiedUserPending = user;
      this.state.isLoadingAuth = false;

      this.updateAppViewVisibility();
      this.showAuthAlert('Por favor, valide seu e-mail antes de acessar.', 'warning');
      const resendWrapper = document.getElementById('auth-resend-wrapper');
      if (resendWrapper) resendWrapper.style.display = 'block';
      return;
    }

    // 3. Usuário válido e autorizado!
    this.state.currentUser = user;
    this.state.user = user;
    this.state.isAdmin = checkIsAdmin(user);
    this.state.isLoadingAuth = false;

    // Alterna exclusivamente para o Dashboard
    this.updateAppViewVisibility();

    // Atualiza cabeçalho de perfil
    this.renderUserProfileHeader();

    // Garante sincronização do documento na coleção 'users'
    syncUserProfile(user);

    // Se for admin, escuta a coleção de usuários para alimentar o filtro administrativo
    if (this.state.isAdmin) {
      this.initAdminUsersSync();
    } else {
      const adminBanner = document.getElementById('admin-panel-banner');
      if (adminBanner) adminBanner.style.display = 'none';
    }

    // Inicializa escutas do Firestore somente após confirmar currentUser.uid
    this.initFirestoreSync();
  }

  renderUserProfileHeader() {
    const user = this.state.currentUser;
    if (!user) return;

    const nameEl = document.getElementById('user-display-name');
    const roleBadgeEl = document.getElementById('user-role-badge');
    const avatarInitialsEl = document.getElementById('user-avatar-initials');
    const avatarEl = document.getElementById('user-avatar');

    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário');
    if (nameEl) nameEl.textContent = displayName;

    if (roleBadgeEl) {
      roleBadgeEl.innerHTML = this.state.isAdmin
        ? `<span class="admin-badge" style="font-size:0.65rem; padding:1px 5px;">Admin</span>`
        : `<span style="font-size:0.72rem; color:var(--color-text-muted);">${UI.escapeHTML(user.email || '')}</span>`;
    }

    if (user.photoURL && avatarEl) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${UI.escapeHTML(displayName)}" referrerpolicy="no-referrer">`;
    } else if (avatarEl) {
      avatarEl.innerHTML = `<span id="user-avatar-initials">${UI.escapeHTML(displayName.charAt(0).toUpperCase())}</span>`;
    } else if (avatarInitialsEl) {
      avatarInitialsEl.textContent = displayName.charAt(0).toUpperCase();
    }
  }

  initAdminUsersSync() {
    if (!this.state.currentUser || !this.state.isAdmin) return;

    const adminBanner = document.getElementById('admin-panel-banner');
    const adminSelect = document.getElementById('admin-user-filter');

    if (adminBanner) adminBanner.style.display = 'flex';

    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
      this.unsubscribeUsers = null;
    }

    this.unsubscribeUsers = Auth.subscribeUsers(
      (users) => {
        this.state.registeredUsers = users;
        if (adminSelect) {
          const currentVal = adminSelect.value;
          adminSelect.innerHTML = `
            <option value="all">🌐 Todos os Usuários (Geral)</option>
            ${users.map(u => `
              <option value="${u.uid}">
                ${UI.escapeHTML(u.displayName || u.email)} (${u.role === 'admin' ? 'Admin' : 'Usuário'})
              </option>
            `).join('')}
          `;
          adminSelect.value = currentVal || 'all';
        }
      },
      (err) => console.error('Erro ao listar usuários:', err)
    );
  }

  teardownListeners() {
    if (this.unsubscribeTasks) {
      this.unsubscribeTasks();
      this.unsubscribeTasks = null;
    }
    if (this.unsubscribeProjects) {
      this.unsubscribeProjects();
      this.unsubscribeProjects = null;
    }
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
      this.unsubscribeUsers = null;
    }
    this.state.tasks = [];
    this.state.projects = [];
    this.state.registeredUsers = [];
    this.state.tasksLoadError = null;
    this.state.projectsLoadError = null;
    this.state.isLoadingTasks = false;
    this.state.isLoadingProjects = false;

    // Limpa o DOM do dashboard para não deixar resíduos ao deslogar
    const taskContainer = document.getElementById('task-list-container');
    if (taskContainer) taskContainer.innerHTML = '';
    const projList = document.getElementById('projects-nav-list');
    if (projList) projList.innerHTML = '';
  }

  initFirestoreSync() {
    // Bloqueio estrito: NUNCA inicia listeners se não houver usuário autenticado com uid válido
    if (!this.state.currentUser || !this.state.currentUser.uid) {
      return;
    }

    let targetUserId = this.state.currentUser.uid;
    if (this.state.isAdmin) {
      targetUserId = this.state.adminSelectedUserId || 'all';
    }

    // 1. Sincronização em tempo real de Tarefas
    this.state.isLoadingTasks = true;
    this.state.tasksLoadError = null;
    this.renderTasks();

    if (this.unsubscribeTasks) {
      this.unsubscribeTasks();
      this.unsubscribeTasks = null;
    }

    this.unsubscribeTasks = Tasks.subscribe(
      (tasks) => {
        if (!this.state.currentUser) return;
        this.state.tasks = tasks;
        this.state.isLoadingTasks = false;
        this.state.tasksLoadError = null;
        this.render();
      },
      (error) => {
        if (!this.state.currentUser) return;
        this.state.isLoadingTasks = false;
        this.state.tasksLoadError = error.message || 'Erro ao sincronizar tarefas.';
        UI.toast('Erro na sincronização de tarefas: ' + error.message, 'error');
        this.render();
      },
      targetUserId
    );

    // 2. Sincronização em tempo real de Projetos
    this.state.isLoadingProjects = true;
    this.state.projectsLoadError = null;

    if (this.unsubscribeProjects) {
      this.unsubscribeProjects();
      this.unsubscribeProjects = null;
    }

    this.unsubscribeProjects = Projects.subscribe(
      (projects) => {
        if (!this.state.currentUser) return;
        this.state.projects = projects;
        this.state.isLoadingProjects = false;
        this.state.projectsLoadError = null;
        this.render();
      },
      (error) => {
        if (!this.state.currentUser) return;
        this.state.isLoadingProjects = false;
        this.state.projectsLoadError = error.message || 'Erro ao sincronizar projetos.';
        UI.toast('Erro na sincronização de projetos: ' + error.message, 'error');
        this.render();
      },
      targetUserId
    );
  }

  /* ============================================================
     Formulários de Autenticação (Login, Cadastro, Recuperação)
     ============================================================ */
  bindAuthEvents() {
    const authForm = document.getElementById('auth-form');
    const btnGoogle = document.getElementById('btn-google-login');
    const btnForgot = document.getElementById('auth-btn-forgot');
    const toggleModeBtn = document.getElementById('auth-toggle-mode-btn');
    const btnResend = document.getElementById('auth-btn-resend-verification');
    const btnLogout = document.getElementById('btn-logout');
    const adminUserFilter = document.getElementById('admin-user-filter');

    // Alternar modos (login / register / forgot)
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', () => {
        if (this.state.authMode === 'login') {
          this.setAuthMode('register');
        } else {
          this.setAuthMode('login');
        }
      });
    }

    if (btnForgot) {
      btnForgot.addEventListener('click', () => {
        this.setAuthMode('forgot');
      });
    }

    // Botão Google Sign-In
    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        try {
          btnGoogle.disabled = true;
          this.clearAuthAlert();
          await Auth.loginWithGoogle();
          UI.toast('Login com Google realizado com sucesso!');
        } catch (err) {
          console.error(err);
          this.showAuthAlert(getFriendlyErrorMessage(err), 'warning');
        } finally {
          btnGoogle.disabled = false;
        }
      });
    }

    // Submissão do formulário de autenticação
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleAuthSubmit();
      });
    }

    // Reenviar e-mail de verificação
    if (btnResend) {
      btnResend.addEventListener('click', async () => {
        try {
          btnResend.disabled = true;
          await Auth.resendVerificationEmail(this.state.unverifiedUserPending);
          UI.toast('E-mail de verificação reenviado! Verifique sua caixa de entrada.');
          this.showAuthAlert('E-mail reenviado com sucesso! Verifique sua caixa de entrada ou spam.', 'info');
        } catch (err) {
          console.error(err);
          UI.toast('Erro ao reenviar e-mail: ' + getFriendlyErrorMessage(err), 'error');
        } finally {
          btnResend.disabled = false;
        }
      });
    }

    // Botão Sair (Logout)
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        if (confirm('Deseja realmente encerrar a sessão?')) {
          try {
            // Cancela imediatamente todas as escutas ativas ANTES do signOut
            this.teardownListeners();
            this.state.currentUser = null;
            this.state.user = null;
            this.state.isAdmin = false;
            this.updateAppViewVisibility();

            await Auth.logout();
            UI.toast('Sessão encerrada com sucesso.');
          } catch (err) {
            console.error(err);
            UI.toast('Erro ao sair: ' + err.message, 'error');
          }
        }
      });
    }

    // Filtro de Usuário do Administrador
    if (adminUserFilter) {
      adminUserFilter.addEventListener('change', (e) => {
        this.state.adminSelectedUserId = e.target.value;
        this.initFirestoreSync();
        UI.toast(`Visualizando dados: ${adminUserFilter.options[adminUserFilter.selectedIndex].text}`);
      });
    }
  }

  setAuthMode(mode) {
    this.state.authMode = mode;
    this.clearAuthAlert();

    const titleEl = document.getElementById('auth-title');
    const subtitleEl = document.getElementById('auth-subtitle');
    const groupName = document.getElementById('auth-group-name');
    const groupPassword = document.getElementById('auth-group-password');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleBtn = document.getElementById('auth-toggle-mode-btn');
    const btnGoogle = document.getElementById('btn-google-login');
    const divider = document.querySelector('.auth-divider');

    if (mode === 'register') {
      if (titleEl) titleEl.textContent = 'Criar uma nova conta';
      if (subtitleEl) subtitleEl.textContent = 'Comece a organizar suas tarefas hoje mesmo';
      if (groupName) groupName.style.display = 'block';
      if (groupPassword) groupPassword.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Criar Conta';
      if (toggleText) toggleText.textContent = 'Já possui uma conta?';
      if (toggleBtn) toggleBtn.textContent = 'Fazer Login';
      if (btnGoogle) btnGoogle.style.display = 'flex';
      if (divider) divider.style.display = 'flex';
    } else if (mode === 'forgot') {
      if (titleEl) titleEl.textContent = 'Redefinir sua senha';
      if (subtitleEl) subtitleEl.textContent = 'Enviaremos um link de recuperação para seu e-mail';
      if (groupName) groupName.style.display = 'none';
      if (groupPassword) groupPassword.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Enviar Link de Redefinição';
      if (toggleText) toggleText.textContent = 'Lembrou sua senha?';
      if (toggleBtn) toggleBtn.textContent = 'Voltar para o Login';
      if (btnGoogle) btnGoogle.style.display = 'none';
      if (divider) divider.style.display = 'none';
    } else {
      // Login
      if (titleEl) titleEl.textContent = 'Acesse sua conta';
      if (subtitleEl) subtitleEl.textContent = 'Organize tarefas e projetos em tempo real com facilidade';
      if (groupName) groupName.style.display = 'none';
      if (groupPassword) groupPassword.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Entrar';
      if (toggleText) toggleText.textContent = 'Não tem uma conta?';
      if (toggleBtn) toggleBtn.textContent = 'Criar conta grátis';
      if (btnGoogle) btnGoogle.style.display = 'flex';
      if (divider) divider.style.display = 'flex';
    }
  }

  showAuthAlert(message, type = 'warning') {
    const alertBox = document.getElementById('auth-alert-box');
    if (!alertBox) return;
    alertBox.className = `auth-alert auth-alert-${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'block';
  }

  clearAuthAlert() {
    const alertBox = document.getElementById('auth-alert-box');
    const resendWrapper = document.getElementById('auth-resend-wrapper');
    if (alertBox) alertBox.style.display = 'none';
    if (resendWrapper) resendWrapper.style.display = 'none';
  }

  async handleAuthSubmit() {
    const inputEmail = document.getElementById('auth-input-email');
    const inputPassword = document.getElementById('auth-input-password');
    const inputName = document.getElementById('auth-input-name');
    const submitBtn = document.getElementById('auth-submit-btn');
    const resendWrapper = document.getElementById('auth-resend-wrapper');

    const email = inputEmail.value.trim();
    const password = inputPassword.value;
    const name = inputName ? inputName.value.trim() : '';

    this.clearAuthAlert();
    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';

    try {
      if (this.state.authMode === 'forgot') {
        await Auth.sendPasswordReset(email);
        this.showAuthAlert('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'info');
        UI.toast('Link de redefinição enviado com sucesso!');
      } else if (this.state.authMode === 'register') {
        if (!password || password.length < 6) {
          throw { code: 'auth/weak-password' };
        }
        const registeredUser = await Auth.registerWithEmail(name, email, password);
        if (!isUserAuthorized(registeredUser)) {
          this.state.unverifiedUserPending = registeredUser;
          this.setAuthMode('login');
          this.showAuthAlert('Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Por favor, valide antes de entrar.', 'info');
          if (resendWrapper) resendWrapper.style.display = 'block';
          UI.toast('Conta criada! Verifique seu e-mail para validar.');
        } else {
          UI.toast('Conta criada e autenticada com sucesso!');
        }
      } else {
        // Modo Login
        await Auth.loginWithEmail(email, password);
        UI.toast('Login realizado com sucesso!');
      }
    } catch (err) {
      console.error('Erro de autenticação:', err);

      if (err.code === 'auth/unverified-email') {
        this.state.unverifiedUserPending = err.user;
        this.showAuthAlert(err.message, 'warning');
        if (resendWrapper) resendWrapper.style.display = 'block';
      } else {
        this.showAuthAlert(getFriendlyErrorMessage(err), 'warning');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  }

  /* ============================================================
     Preferências, Temas e Navegação
     ============================================================ */
  savePreferences() {
    Storage.save({
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
      // Ignorar se clicou em ações dentro do item de projeto (editar / excluir)
      if (e.target.closest('[data-action="delete-project"]') || e.target.closest('[data-action="edit-project"]')) {
        return;
      }

      // Nav View click
      const navBtn = e.target.closest('[data-view]');
      if (navBtn) {
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
        if (!this.state.currentUser) return;

        const input = document.getElementById('quick-add-input');
        if (!input || !input.value.trim()) return;

        const originalValue = input.value;
        try {
          let assignedProj = 'proj-inbox';
          if (this.state.currentView.startsWith('proj-') || this.state.projects.some(p => p.id === this.state.currentView)) {
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

          UI.toast('Tarefa adicionada com sucesso!');
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
    if (!this.state.currentUser && action !== 'close-modal') return;

    switch (action) {
      case 'open-add-task-modal':
        this.openTaskModal();
        break;

      case 'open-add-project-modal':
        this.openProjectModal();
        break;

      case 'edit-project': {
        const projectId = element.getAttribute('data-project-id');
        this.openProjectModal(projectId);
        break;
      }

      case 'toggle-task': {
        const taskId = element.getAttribute('data-task-id');
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
          await Tasks.toggleComplete(taskId, task.completed);
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
    let message = `Excluir o projeto "${project.title || project.name}"?`;

    if (taskCount > 0) {
      message += `\n\nEste projeto possui ${taskCount} tarefas cadastradas.\n\nClique em [OK] para mover as tarefas para a Caixa de Entrada.\nClique em [Cancelar] para cancelar a exclusão.`;
      if (confirm(message)) {
        try {
          await Tasks.handleProjectDeletion(this.state.tasks, projectId, 'move');
          await Projects.remove(projectId);
          if (this.state.currentView === projectId) {
            this.state.currentView = 'inbox';
          }
          this.render();
          UI.toast('Projeto excluído e tarefas transferidas para a Caixa de Entrada.');
        } catch (err) {
          console.error(err);
          UI.toast('Erro ao excluir projeto: ' + err.message, 'error');
        }
      }
    } else {
      if (confirm(message)) {
        try {
          await Projects.remove(projectId);
          if (this.state.currentView === projectId) {
            this.state.currentView = 'inbox';
          }
          this.render();
          UI.toast('Projeto excluído com sucesso.');
        } catch (err) {
          console.error(err);
          UI.toast('Erro ao excluir projeto: ' + err.message, 'error');
        }
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
        <option value="${p.id}">${UI.escapeHTML(p.title || p.name)}</option>
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
      const isProjectView = this.state.projects.some(p => p.id === this.state.currentView);
      selectProject.value = isProjectView ? this.state.currentView : 'proj-inbox';
      selectPriority.value = '4';
      inputDueDate.value = this.state.currentView === 'today' ? new Date().toISOString().split('T')[0] : '';
    }

    modal.classList.add('active');
    setTimeout(() => inputTitle.focus(), 100);
  }

  async handleSaveTaskModal() {
    if (!this.state.currentUser) return;

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

  openProjectModal(projectId = null) {
    this.state.editingProjectId = projectId;
    const modal = document.getElementById('project-modal');
    const modalTitle = document.getElementById('project-modal-title');
    const inputName = document.getElementById('modal-project-name');
    const inputDesc = document.getElementById('modal-project-desc');
    const selectStatus = document.getElementById('modal-project-status');
    const paletteContainer = document.getElementById('modal-project-colors');
    const submitBtn = document.getElementById('project-modal-submit-btn');

    let currentColor = Projects.PALETTE[0];

    if (projectId) {
      const proj = Projects.getById(this.state.projects, projectId);
      if (proj) {
        if (modalTitle) modalTitle.textContent = 'Editar Projeto';
        if (submitBtn) submitBtn.textContent = 'Salvar Alterações';
        inputName.value = proj.title || proj.name || '';
        if (inputDesc) inputDesc.value = proj.description || '';
        if (selectStatus) selectStatus.value = proj.status || 'Em andamento';
        currentColor = proj.color || Projects.PALETTE[0];
      }
    } else {
      if (modalTitle) modalTitle.textContent = 'Novo Projeto';
      if (submitBtn) submitBtn.textContent = 'Criar Projeto';
      inputName.value = '';
      if (inputDesc) inputDesc.value = '';
      if (selectStatus) selectStatus.value = 'Em andamento';
      currentColor = Projects.PALETTE[0];
    }

    // Render color swatches
    paletteContainer.innerHTML = Projects.PALETTE.map((color) => `
      <div class="color-swatch-radio ${color === currentColor ? 'selected' : ''}" 
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

  async handleSaveProjectModal() {
    if (!this.state.currentUser) return;

    const inputName = document.getElementById('modal-project-name');
    const inputDesc = document.getElementById('modal-project-desc');
    const selectStatus = document.getElementById('modal-project-status');
    const submitBtn = document.getElementById('project-modal-submit-btn');

    const title = inputName.value.trim();
    if (!title) {
      alert('Por favor, informe o título do projeto.');
      return;
    }

    const description = inputDesc ? inputDesc.value.trim() : '';
    const status = selectStatus ? selectStatus.value : 'Em andamento';
    const selectedColorEl = document.querySelector('.color-swatch-radio.selected');
    const color = selectedColorEl ? selectedColorEl.getAttribute('data-color') : Projects.PALETTE[0];

    const modal = document.getElementById('project-modal');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Salvar Projeto';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';
    }

    try {
      if (this.state.editingProjectId) {
        await Projects.update(this.state.editingProjectId, {
          title,
          description,
          status,
          color
        });
        UI.toast(`Projeto "${title}" atualizado com sucesso no Firestore!`);
      } else {
        await Projects.create({
          title,
          description,
          status,
          color
        });
        UI.toast(`Projeto "${title}" criado com sucesso no Firestore!`);
      }

      this.state.editingProjectId = null;
      inputName.value = '';
      if (inputDesc) inputDesc.value = '';
      modal.classList.remove('active');
    } catch (err) {
      console.error('Erro ao salvar projeto no Firestore:', err);
      UI.toast('Erro ao salvar projeto: ' + (err.message || err), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
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
    
    // Visão de um Projeto específico
    const proj = Projects.getById(this.state.projects, this.state.currentView);
    if (proj) {
      const descText = proj.description ? ` • ${proj.description}` : '';
      const statusText = proj.status ? `[${proj.status}]` : '';
      return {
        title: proj.title || proj.name,
        subtitle: `${statusText} Demandas organizadas no projeto ${proj.title || proj.name}${descText}.`
      };
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
    if (!this.state.currentUser) return;

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
    // Nunca renderiza a área de trabalho se o usuário não estiver autenticado
    if (!this.state.currentUser) return;

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
