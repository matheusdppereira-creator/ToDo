/**
 * TaskFlow - storage.js
 * Robust persistence layer with LocalStorage schema versioning and initial seed data.
 */

const STORAGE_KEY = 'taskflow_app_state_v1';
const SCHEMA_VERSION = 1;

/**
 * Returns initial mock seed data for a rich, out-of-the-box SaaS experience.
 */
function getInitialData() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

  return {
    version: SCHEMA_VERSION,
    theme: 'light',
    projects: [
      { id: 'proj-inbox', name: 'Caixa de Entrada', color: '#6366F1', isDefault: true },
      { id: 'proj-work', name: 'Trabalho', color: '#4F46E5', isDefault: false },
      { id: 'proj-personal', name: 'Pessoal', color: '#10B981', isDefault: false },
      { id: 'proj-studies', name: 'Estudos', color: '#F59E0B', isDefault: false },
      { id: 'proj-home', name: 'Casa', color: '#EC4899', isDefault: false }
    ],
    /*tasks: [
      {
        id: 'task-1',
        title: 'Revisar documentação técnica da API',
        description: 'Verificar parâmetros de requisição e compatibilidade OpenAPI.',
        projectId: 'proj-work',
        priority: 1, // P1 Urgente
        dueDate: today,
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        completedAt: null
      },
      {
        id: 'task-2',
        title: 'Comprar suprimentos e organizador de cabos',
        description: 'Organizar mesa de trabalho para melhorar a ergonomia.',
        projectId: 'proj-home',
        priority: 3, // P3 Média
        dueDate: tomorrow,
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        completedAt: null
      },
      {
        id: 'task-3',
        title: 'Concluir módulo de Vanilla JavaScript e Event Loop',
        description: 'Praticar conceitos de Promises, Microtasks e render cycles.',
        projectId: 'proj-studies',
        priority: 2, // P2 Alta
        dueDate: today,
        completed: true,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        completedAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'task-4',
        title: 'Planejar treino semanal e hidratação',
        description: 'Meta de 3L de água por dia e 4 dias de treino funcional.',
        projectId: 'proj-personal',
        priority: 4, // P4 Normal
        dueDate: '',
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        completedAt: null
      },
      {
        id: 'task-5',
        title: 'Fechar relatório mensal de métricas',
        description: 'Relatório atrasado de fechamento de ciclo.',
        projectId: 'proj-work',
        priority: 1,
        dueDate: pastDate,
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        completedAt: null
      }
    ]*/
  };
}

export const Storage = {
  /**
   * Load entire state from LocalStorage with version checking and fallback.
   */
  load() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        const seed = getInitialData();
        this.save(seed);
        return seed;
      }

      const parsed = JSON.parse(serialized);
      if (!parsed || parsed.version !== SCHEMA_VERSION) {
        console.warn('Storage schema version mismatch or invalid payload. Initializing defaults.');
        const seed = getInitialData();
        this.save(seed);
        return seed;
      }

      return parsed;
    } catch (error) {
      console.error('Error loading data from LocalStorage:', error);
      return getInitialData();
    }
  },

  /**
   * Save entire state cleanly with try/catch safeguard.
   */
  save(state) {
    try {
      state.version = SCHEMA_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Error saving data to LocalStorage:', error);
      return false;
    }
  },

  /**
   * Clears storage and resets to default initial data.
   */
  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return getInitialData();
    } catch (error) {
      console.error('Error resetting LocalStorage:', error);
      return getInitialData();
    }
  }
};
