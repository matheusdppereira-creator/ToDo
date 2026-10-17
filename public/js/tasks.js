/**
 * TaskFlow - tasks.js
 * Firestore CRUD, real-time sync, filtering, querying, and sorting logic for tasks.
 */

import { db } from './firebase.js';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

const TODOS_COLLECTION = 'todos';

export const Tasks = {
  /**
   * Converte um documento do Firestore para o modelo interno de tarefa da aplicação.
   */
  mapDocToTask(docSnap) {
    const data = docSnap.data();
    let createdAtISO = new Date().toISOString();

    if (data.createdAt) {
      if (typeof data.createdAt.toDate === 'function') {
        createdAtISO = data.createdAt.toDate().toISOString();
      } else if (data.createdAt instanceof Date) {
        createdAtISO = data.createdAt.toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtISO = data.createdAt;
      }
    }

    let completedAtISO = null;
    if (data.completedAt) {
      if (typeof data.completedAt.toDate === 'function') {
        completedAtISO = data.completedAt.toDate().toISOString();
      } else if (data.completedAt instanceof Date) {
        completedAtISO = data.completedAt.toISOString();
      } else if (typeof data.completedAt === 'string') {
        completedAtISO = data.completedAt;
      }
    }

    return {
      id: docSnap.id,
      title: data.title || '',
      description: data.description || '',
      projectId: data.projectId || 'proj-inbox',
      priority: Number(data.priority) || 4,
      dueDate: data.dueDate || '',
      completed: Boolean(data.completed),
      createdAt: createdAtISO,
      completedAt: completedAtISO
    };
  },

  /**
   * Inscreve um listener em tempo real para a coleção 'todos'.
   * Retorna a função unsubscribe.
   */
  subscribe(onSuccess, onError) {
    const todosRef = collection(db, TODOS_COLLECTION);
    return onSnapshot(
      todosRef,
      (snapshot) => {
        const tasks = snapshot.docs.map(docSnap => Tasks.mapDocToTask(docSnap));
        onSuccess(tasks);
      },
      (error) => {
        console.error('Erro na sincronização em tempo real do Firestore:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Cria uma nova tarefa na coleção 'todos' do Firestore.
   */
  async create({ title, description = '', projectId = 'proj-inbox', priority = 4, dueDate = '' }) {
    if (!title || !title.trim()) {
      throw new Error('O título da tarefa é obrigatório.');
    }

    const colRef = collection(db, TODOS_COLLECTION);
    const newTaskData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      projectId: projectId || 'proj-inbox',
      priority: Number(priority) || 4,
      dueDate: dueDate || '',
      completed: false,
      createdAt: serverTimestamp(),
      completedAt: null
    };

    return await addDoc(colRef, newTaskData);
  },

  /**
   * Atualiza campos de uma tarefa existente no Firestore.
   */
  async update(id, updates) {
    if (!id) throw new Error('ID da tarefa não fornecido.');
    const taskDocRef = doc(db, TODOS_COLLECTION, id);

    const docUpdates = {};
    if (updates.title !== undefined) docUpdates.title = updates.title.trim();
    if (updates.description !== undefined) docUpdates.description = updates.description.trim();
    if (updates.projectId !== undefined) docUpdates.projectId = updates.projectId;
    if (updates.priority !== undefined) docUpdates.priority = Number(updates.priority);
    if (updates.dueDate !== undefined) docUpdates.dueDate = updates.dueDate;
    if (updates.completed !== undefined) docUpdates.completed = Boolean(updates.completed);
    if (updates.completedAt !== undefined) docUpdates.completedAt = updates.completedAt;

    return await updateDoc(taskDocRef, docUpdates);
  },

  /**
   * Alterna o estado de conclusão de uma tarefa no Firestore.
   */
  async toggleComplete(id, currentCompleted) {
    if (!id) throw new Error('ID da tarefa não fornecido.');
    const nextCompleted = !currentCompleted;
    const taskDocRef = doc(db, TODOS_COLLECTION, id);

    return await updateDoc(taskDocRef, {
      completed: nextCompleted,
      completedAt: nextCompleted ? Timestamp.now() : null
    });
  },

  /**
   * Remove uma tarefa por ID no Firestore.
   */
  async remove(id) {
    if (!id) throw new Error('ID da tarefa não fornecido.');
    const taskDocRef = doc(db, TODOS_COLLECTION, id);
    return await deleteDoc(taskDocRef);
  },

  /**
   * Trata tarefas de projetos excluídos, movendo-as ou deletando-as.
   */
  async handleProjectDeletion(tasks, deletedProjectId, action = 'move') {
    const relatedTasks = tasks.filter(t => t.projectId === deletedProjectId);
    const promises = relatedTasks.map(t => {
      if (action === 'delete') {
        return Tasks.remove(t.id);
      } else {
        return Tasks.update(t.id, { projectId: 'proj-inbox' });
      }
    });
    return Promise.all(promises);
  },

  /**
   * Filtra e ordena as tarefas na interface de acordo com a visualização, busca e ordenação.
   */
  filterAndSort(tasks, { view = 'all', searchQuery = '', priority = 'all', status = 'all', sortBy = 'dueDate' }) {
    const todayStr = new Date().toISOString().split('T')[0];

    let result = tasks.filter(task => {
      // 1. Filtro de Busca por Texto
      if (searchQuery && searchQuery.trim()) {
        const queryText = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(queryText);
        const matchesDesc = (task.description || '').toLowerCase().includes(queryText);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Filtro de Visualização
      if (view === 'inbox') {
        if (task.projectId !== 'proj-inbox') return false;
      } else if (view === 'today') {
        if (task.dueDate !== todayStr) return false;
      } else if (view === 'upcoming') {
        if (!task.dueDate || task.dueDate <= todayStr) return false;
      } else if (view.startsWith('proj-')) {
        if (task.projectId !== view) return false;
      }

      // 3. Filtro de Prioridade
      if (priority !== 'all' && Number(priority) !== task.priority) {
        return false;
      }

      // 4. Filtro de Status
      if (status === 'pending' && task.completed) return false;
      if (status === 'completed' && !task.completed) return false;

      return true;
    });

    // Ordenação
    result.sort((a, b) => {
      // Pendentes primeiro
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (sortBy === 'priority') {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // 1 (P1 Urgente) primeiro
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

      // Padrão: mais recentes primeiro
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }
};
