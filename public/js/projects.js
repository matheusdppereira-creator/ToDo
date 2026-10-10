/**
 * TaskFlow - projects.js
 * Project entity management, creation, updates, and deletion rules.
 */

export const Projects = {
  /**
   * Available modern SaaS theme colors for project categorization.
   */
  PALETTE: [
    '#4F46E5', // Electric Indigo
    '#10B981', // Pure Emerald
    '#F59E0B', // Amber
    '#F43F5E', // Rose
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#64748B'  // Slate
  ],

  /**
   * Find project by ID.
   */
  getById(projects, id) {
    return projects.find(p => p.id === id) || null;
  },

  /**
   * Create a new project.
   */
  create(projects, name, color) {
    if (!name || !name.trim()) {
      throw new Error('O nome do projeto é obrigatório.');
    }

    const newProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      color: color || this.PALETTE[0],
      isDefault: false
    };

    return [...projects, newProject];
  },

  /**
   * Update an existing project.
   */
  update(projects, id, name, color) {
    return projects.map(p => {
      if (p.id === id) {
        return {
          ...p,
          name: name ? name.trim() : p.name,
          color: color || p.color
        };
      }
      return p;
    });
  },

  /**
   * Remove project by ID (default inbox cannot be deleted).
   */
  remove(projects, id) {
    const target = projects.find(p => p.id === id);
    if (!target) return projects;
    if (target.isDefault) {
      throw new Error('A Caixa de Entrada padrão não pode ser removida.');
    }

    return projects.filter(p => p.id !== id);
  }
};
