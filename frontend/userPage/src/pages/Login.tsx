import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormInput } from '@/components/auth/FormInput';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuthForm } from '@/hooks/useAuthForm';
import { login, LoginCredentials } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useAuthForm({
    initialValues: { email: '', password: '' },
    schema: loginSchema,
    onSubmit: async (formValues) => {
      try {
        const credentials: LoginCredentials = {
          email: formValues.email,
          password: formValues.password,
        };
        const response = await login(credentials);
        
        if (response.success) {
          toast({
            title: 'Welcome back!',
            description: `Logged in as ${response.user?.email}`,
          });
          // TODO: Navigate to dashboard when ready
          navigate('/');
        } else {
          toast({
            title: 'Login failed',
            description: response.error || 'Invalid credentials',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormInput
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          icon={<Mail className="w-5 h-5" />}
          autoComplete="email"
        />

        <FormInput
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          icon={<Lock className="w-5 h-5" />}
          autoComplete="current-password"
        />

        <AuthButton type="submit" loading={isSubmitting}>
          Sign in
        </AuthButton>

        <p className="text-center text-muted-foreground text-sm">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
