/**
 * TaskFlow - auth.js
 * Gerenciamento completo de autenticação: E-mail/Senha, Google Popup,
 * Verificação de E-mail, Redefinição de Senha, Coleção 'users' e controle Admin.
 */

import { auth, db, googleProvider } from './firebase.js';
import { ADMIN_CREDENTIALS } from './adminConfig.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

/**
 * Traduz códigos de erro do Firebase Auth em mensagens amigáveis em português.
 */
export function getFriendlyErrorMessage(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Senha incorreta. Tente novamente.';
    case 'auth/user-not-found':
      return 'Usuário não encontrado. Deseja se cadastrar?';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos.';
    case 'auth/invalid-email':
      return 'Por favor, insira um endereço de e-mail válido.';
    case 'auth/popup-closed-by-user':
      return 'Login com Google cancelado pelo usuário.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está sendo utilizado por outra conta.';
    case 'auth/weak-password':
      return 'A senha deve conter no mínimo 6 caracteres.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela do Google. Permita popups para este site.';
    default:
      return error?.message || 'Ocorreu um erro na autenticação.';
  }
}

/**
 * Verifica se o usuário atual possui privilégios de Administrador.
 */
export function checkIsAdmin(user) {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
}

/**
 * Verifica se o usuário logado está autorizado a acessar o Dashboard:
 * - Admin tem acesso direto
 * - Login com Google tem acesso direto (emailVerified = true)
 * - Usuário de E-mail/Senha precisa ter emailVerified === true
 */
export function isUserAuthorized(user) {
  if (!user || !user.uid) return false;
  if (checkIsAdmin(user)) return true;
  const isGoogle = user.providerData?.some(p => p.providerId === 'google.com');
  if (isGoogle) return true;
  return Boolean(user.emailVerified);
}

/**
 * Sincroniza/Salva os dados do usuário na coleção 'users' do Firestore.
 */
export async function syncUserProfile(user, customDisplayName = '') {
  if (!user || !user.uid) return null;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userDocRef);

    const isAdmin = checkIsAdmin(user);
    const displayName = customDisplayName || user.displayName || (existingSnap.exists() ? existingSnap.data()?.displayName : '') || user.email.split('@')[0];
    const photoURL = user.photoURL || (existingSnap.exists() ? existingSnap.data()?.photoURL : '') || '';
    const authProvider = user.providerData[0]?.providerId || 'password';

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      photoURL: photoURL,
      authProvider: authProvider,
      role: isAdmin ? 'admin' : 'user'
    };

    if (!existingSnap.exists()) {
      userData.createdAt = serverTimestamp();
    }

    await setDoc(userDocRef, userData, { merge: true });
    return userData;
  } catch (err) {
    console.warn('Aviso ao sincronizar perfil na coleção users:', err);
    return null;
  }
}

export const Auth = {
  /**
   * Monitora o estado de autenticação do Firebase.
   */
  onAuthState(callback) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Obtém o usuário atual autenticado.
   */
  getCurrentUser() {
    return auth.currentUser;
  },

  /**
   * Login por E-mail e Senha.
   * Valida emailVerified para usuários comuns; Admin ou Google ignoram.
   */
  async loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    // Se for usuário comum e ainda não verificou o e-mail, bloqueia o acesso ao painel
    if (!isUserAuthorized(user)) {
      throw {
        code: 'auth/unverified-email',
        message: 'Por favor, valide seu e-mail antes de acessar.',
        user: user
      };
    }

    await syncUserProfile(user);
    return user;
  },

  /**
   * Cadastro por E-mail e Senha.
   * Cria a conta, atualiza perfil, salva no Firestore e envia e-mail de verificação.
   */
  async registerWithEmail(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    if (name && name.trim()) {
      await updateProfile(user, { displayName: name.trim() });
    }

    await syncUserProfile(user, name.trim());

    // Se não for o e-mail pré-configurado de admin, envia verificação
    if (!checkIsAdmin(user)) {
      await sendEmailVerification(user);
    }

    return user;
  },

  /**
   * Login com Google Popup.
   * Conta Google já possui emailVerified = true.
   */
  async loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;
    await syncUserProfile(user);
    return user;
  },

  /**
   * Reenvia e-mail de verificação para o usuário informado ou logado.
   */
  async resendVerificationEmail(targetUser = null) {
    const user = targetUser || auth.currentUser;
    if (!user) throw new Error('Nenhum usuário logado para enviar verificação.');
    await sendEmailVerification(user);
  },

  /**
   * Solicita redefinição de senha para o e-mail informado.
   */
  async sendPasswordReset(email) {
    if (!email || !email.trim()) {
      throw new Error('Informe o e-mail cadastrado para redefinir a senha.');
    }
    await sendPasswordResetEmail(auth, email.trim());
  },

  /**
   * Encerra a sessão do usuário.
   */
  async logout() {
    return await signOut(auth);
  },

  /**
   * Escuta a lista de usuários cadastrados (exclusivo para Painel do Admin).
   */
  subscribeUsers(onSuccess, onError) {
    if (!auth.currentUser || !auth.currentUser.uid) {
      return () => {};
    }

    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        if (!auth.currentUser) return;
        const users = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onSuccess(users);
      },
      (err) => {
        if (!auth.currentUser) return;
        console.error('Erro ao buscar lista de usuários:', err);
        if (onError) onError(err);
      }
    );
  }
};
