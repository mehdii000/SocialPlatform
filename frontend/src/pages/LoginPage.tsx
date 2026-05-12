import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { RegisterForm } from '@/components/features/auth/RegisterForm';
import { useAuthStore } from '@/hooks/useAuth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return null;
  if (isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>SocialPlatform</h1>
          <p className={styles.tagline}>Connect with people who matter.</p>
        </div>

        <div className={styles.tabs}>
          <button
            className={tab === 'login' ? styles.tabActive : styles.tab}
            onClick={() => setTab('login')}
          >
            Sign in
          </button>
          <button
            className={tab === 'register' ? styles.tabActive : styles.tab}
            onClick={() => setTab('register')}
          >
            Sign up
          </button>
        </div>

        {tab === 'login' ? <LoginForm /> : <RegisterForm onSuccess={() => setTab('login')} />}
      </div>
    </div>
  );
}
