import { initializeApp } from "firebase/app"; // Importa a função para inicializar o Firebase
import { getFirestore } from "firebase/firestore"; // Importa o Firestore
import { getAuth } from "firebase/auth"; // Importa o módulo de autenticação do Firebase

const firebaseConfig = { // Configurações do Firebase, usando variáveis de ambiente
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig); //Inicializa o Firebase com as configurações fornecidas
export const db = getFirestore(app); // Exporta a instância do Firestore para ser usada em outros arquivos
export const auth = getAuth(app); // Exporta a instância de autenticação para ser usada em outros arquivos