/**
 * TaskFlow - projects.js
 * Firestore CRUD, real-time sync, and project entity management.
 */

import { db } from './firebase.js';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

const PROJECTS_COLLECTION = 'projects';

export const Projects = {
  /**
   * Cores modernas para categorização visual dos projetos.
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
   * Converte um documento do Firestore para o modelo interno de projeto.
   */
  mapDocToProject(docSnap) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title || data.name || 'Sem título',
      name: data.title || data.name || 'Sem título', // retrocompatibilidade para componentes que utilizam .name
      description: data.description || '',
      status: data.status || 'Em andamento',
      color: data.color || '#4F46E5',
      isDefault: Boolean(data.isDefault)
    };
  },

  /**
   * Escuta em tempo real a coleção 'projects' do Firestore.
   * Retorna a função unsubscribe.
   */
  subscribe(onSuccess, onError) {
    const colRef = collection(db, PROJECTS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        let projects = snapshot.docs.map(docSnap => Projects.mapDocToProject(docSnap));

        // Se a coleção estiver vazia, ou se não houver a Caixa de Entrada padrão, mantém/injeta a padrão
        const hasInbox = projects.some(p => p.id === 'proj-inbox' || p.isDefault);
        if (!hasInbox) {
          const defaultInbox = {
            id: 'proj-inbox',
            title: 'Caixa de Entrada',
            name: 'Caixa de Entrada',
            description: 'Demandas gerais e pendências rápidas',
            status: 'Em andamento',
            color: '#6366F1',
            isDefault: true
          };
          projects = [defaultInbox, ...projects];
        }

        onSuccess(projects);
      },
      (error) => {
        console.error('Erro na sincronização em tempo real de Projetos:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Localiza um projeto pelo ID na lista atual.
   */
  getById(projects, id) {
    return projects.find(p => p.id === id) || null;
  },

  /**
   * Cria um novo projeto no Firestore.
   */
  async create({ title, description = '', status = 'Em andamento', color }) {
    if (!title || !title.trim()) {
      throw new Error('O título do projeto é obrigatório.');
    }

    const colRef = collection(db, PROJECTS_COLLECTION);
    const newProjectData = {
      title: title.trim(),
      name: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'Em andamento',
      color: color || Projects.PALETTE[0],
      isDefault: false,
      createdAt: serverTimestamp()
    };

    return await addDoc(colRef, newProjectData);
  },

  /**
   * Atualiza um projeto existente no Firestore.
   */
  async update(id, updates) {
    if (!id) throw new Error('ID do projeto não fornecido.');
    if (id === 'proj-inbox') {
      throw new Error('A Caixa de Entrada padrão não pode ser modificada.');
    }

    const docRef = doc(db, PROJECTS_COLLECTION, id);
    const docUpdates = {};

    if (updates.title !== undefined) {
      docUpdates.title = updates.title.trim();
      docUpdates.name = updates.title.trim();
    }
    if (updates.name !== undefined) {
      docUpdates.title = updates.name.trim();
      docUpdates.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      docUpdates.description = updates.description.trim();
    }
    if (updates.status !== undefined) {
      docUpdates.status = updates.status;
    }
    if (updates.color !== undefined) {
      docUpdates.color = updates.color;
    }

    docUpdates.updatedAt = serverTimestamp();

    return await updateDoc(docRef, docUpdates);
  },

  /**
   * Remove um projeto do Firestore por ID (não remove o padrão).
   */
  async remove(id) {
    if (!id) throw new Error('ID do projeto não fornecido.');
    if (id === 'proj-inbox') {
      throw new Error('A Caixa de Entrada padrão não pode ser removida.');
    }

    const docRef = doc(db, PROJECTS_COLLECTION, id);
    return await deleteDoc(docRef);
  }
};
