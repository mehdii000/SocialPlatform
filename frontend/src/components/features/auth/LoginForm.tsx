import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, Lock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { login, validateToken } from '@/api/auth';
import { useAuthStore } from '@/hooks/useAuth';
import styles from './AuthForm.module.css';

export function LoginForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      const validated = await validateToken();
      setAuth(validated.user_id, validated.username);
      navigate('/');
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error && !password ? error : ''}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && password && <p className={styles.error}>{error}</p>}
      <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
        Sign in
      </Button>
    </form>
  );
}
