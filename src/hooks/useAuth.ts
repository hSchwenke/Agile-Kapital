import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { loginComGoogle, logout, observarUsuario } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [carregandoLogin, setCarregandoLogin] = useState(true);

  useEffect(() => {
    const unsubscribe = observarUsuario((usuarioAtual) => {
      setUser(usuarioAtual);
      setCarregandoLogin(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    carregandoLogin,
    loginComGoogle,
    sair: logout,
  };
}
