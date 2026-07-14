'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { LoginForm } from '@/components/auth/login-form';
import { Dashboard } from '@/components/dashboard/dashboard';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function Home() {
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    checkAuth();
  }, [setLoading]);

  if (!mounted || isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard />;
}

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            CRM Enterprise
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gestão completa de relacionamento com clientes
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
