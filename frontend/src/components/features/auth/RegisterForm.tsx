import { useState } from 'react';
import { User, AtSign, Lock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { register } from '@/api/auth';
import styles from './AuthForm.module.css';

interface RegisterFormProps {
  onSuccess: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) { setError('All fields are required'); return; }
    if (username.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await register({ username, email, password });
      setSuccess('Account created! You can now sign in.');
      setUsername('');
      setEmail('');
      setPassword('');
      onSuccess();
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Username"
        placeholder="johndoe"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={30}
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
        Create account
      </Button>
    </form>
  );
}
