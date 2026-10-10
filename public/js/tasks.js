/**
 * TaskFlow - tasks.js
 * Full CRUD, filtering, querying, and sorting logic for tasks.
 */

export const Tasks = {
  /**
   * Create a new task object and append to task collection.
   */
  create(tasks, { title, description = '', projectId = 'proj-inbox', priority = 4, dueDate = '' }) {
    if (!title || !title.trim()) {
      throw new Error('O título da tarefa é obrigatório.');
    }

    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim(),
      description: description ? description.trim() : '',
      projectId: projectId || 'proj-inbox',
      priority: Number(priority) || 4,
      dueDate: dueDate || '',
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    return [newTask, ...tasks];
  },

  /**
   * Update existing task fields.
   */
  update(tasks, id, updates) {
    return tasks.map(task => {
      if (task.id === id) {
        return {
          ...task,
          ...updates,
          title: updates.title !== undefined ? updates.title.trim() : task.title,
          description: updates.description !== undefined ? updates.description.trim() : task.description,
          priority: updates.priority !== undefined ? Number(updates.priority) : task.priority
        };
      }
      return task;
    });
  },

  /**
   * Toggle task completion state and record timestamp.
   */
  toggleComplete(tasks, id) {
    return tasks.map(task => {
      if (task.id === id) {
        const nextCompleted = !task.completed;
        return {
          ...task,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null
        };
      }
      return task;
    });
  },

  /**
   * Delete a task by ID.
   */
  remove(tasks, id) {
    return tasks.filter(task => task.id !== id);
  },

  /**
   * Delete or move tasks associated with a deleted project.
   */
  handleProjectDeletion(tasks, deletedProjectId, action = 'move') {
    if (action === 'delete') {
      return tasks.filter(t => t.projectId !== deletedProjectId);
    }
    // Default: move to Inbox
    return tasks.map(t => {
      if (t.projectId === deletedProjectId) {
        return { ...t, projectId: 'proj-inbox' };
      }
      return t;
    });
  },

  /**
   * Filter and sort tasks according to view context, query, and sorting options.
   */
  filterAndSort(tasks, { view = 'all', searchQuery = '', priority = 'all', status = 'all', sortBy = 'dueDate' }) {
    const todayStr = new Date().toISOString().split('T')[0];

    let result = tasks.filter(task => {
      // 1. Text Search Filter
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. View Filter
      if (view === 'inbox') {
        if (task.projectId !== 'proj-inbox') return false;
      } else if (view === 'today') {
        if (task.dueDate !== todayStr) return false;
      } else if (view === 'upcoming') {
        if (!task.dueDate || task.dueDate <= todayStr) return false;
      } else if (view.startsWith('proj-')) {
        if (task.projectId !== view) return false;
      }

      // 3. Priority Filter
      if (priority !== 'all' && Number(priority) !== task.priority) {
        return false;
      }

      // 4. Status Filter
      if (status === 'pending' && task.completed) return false;
      if (status === 'completed' && !task.completed) return false;

      return true;
    });

    // Sort order
    result.sort((a, b) => {
      // Uncompleted tasks first
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (sortBy === 'priority') {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // 1 (P1 Urgente) comes first
        }
      } else if (sortBy === 'dueDate') {
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && !b.dueDate) return -1;
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }

      // Fallback: newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }
};
