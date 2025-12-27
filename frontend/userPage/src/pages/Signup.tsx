import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Mail, Lock, User } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormInput } from '@/components/auth/FormInput';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuthForm } from '@/hooks/useAuthForm';
import { signup, SignupCredentials } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
});

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useAuthForm({
    initialValues: { name: '', email: '', password: '' },
    schema: signupSchema,
    onSubmit: async (formValues) => {
      try {
        const credentials: SignupCredentials = {
          name: formValues.name,
          email: formValues.email,
          password: formValues.password,
        };
        const response = await signup(credentials);
        
        if (response.success) {
          toast({
            title: 'Account created!',
            description: `Welcome, ${response.user?.name}!`,
          });
          // TODO: Navigate to dashboard when ready
          navigate('/');
        } else {
          toast({
            title: 'Signup failed',
            description: response.error || 'Could not create account',
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
    <AuthLayout title="Create account" subtitle="Get started today">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormInput
          label="Name"
          name="name"
          type="text"
          placeholder="John Doe"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          icon={<User className="w-5 h-5" />}
          autoComplete="name"
        />

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
          autoComplete="new-password"
        />

        <AuthButton type="submit" loading={isSubmitting}>
          Create account
        </AuthButton>

        <p className="text-center text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
