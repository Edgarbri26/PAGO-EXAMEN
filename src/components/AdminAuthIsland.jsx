import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminAuthIsland() {
  useEffect(() => {
    const loginSection = document.getElementById('login-section');
    const adminSection = document.getElementById('admin-section');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    function notifySession(session) {
      window.dispatchEvent(new CustomEvent('admin-auth-state', { detail: { session } }));
    }

    function showLogin() {
      loginSection.classList.remove('hidden');
      adminSection.classList.add('hidden');
    }

    function showAdminPanel() {
      loginSection.classList.add('hidden');
      adminSection.classList.remove('hidden');
    }

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        showAdminPanel();
      } else {
        showLogin();
      }

      notifySession(session);
    }

    const onLoginSubmit = async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      emailInput.value = email;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          alert('Credenciales inválidas. Verifica correo y contraseña.');
          return;
        }
        alert(`Error: ${error.message}`);
      }
    };

    const onLogoutClick = async () => {
      await supabase.auth.signOut();
    };

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        showAdminPanel();
      } else {
        showLogin();
      }

      notifySession(session);
    });

    loginForm.addEventListener('submit', onLoginSubmit);
    logoutBtn.addEventListener('click', onLogoutClick);
    checkSession();

    return () => {
      loginForm.removeEventListener('submit', onLoginSubmit);
      logoutBtn.removeEventListener('click', onLogoutClick);
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  return null;
}
