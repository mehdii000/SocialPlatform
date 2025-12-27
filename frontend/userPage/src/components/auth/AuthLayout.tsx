import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-1">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* Form card */}
        <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
