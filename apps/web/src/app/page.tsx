'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { LoginForm } from '@/components/auth/login-form';
import { AdminLayout } from '@/components/layout/admin-layout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, LayoutDashboard } from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated, isLoading, setLoading } = useAuthStore();
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

  return (
    <AdminLayout
      user={
        user
          ? {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              avatar: user.avatar,
              role: user.role,
            }
          : undefined
      }
    >
      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo, {user?.firstName}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Contatos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negócios Abertos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo ao CRM Enterprise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              O sistema está em construção. Novas funcionalidades serão adicionadas nas próximas
              etapas.
            </p>
            <div className="mt-6 flex gap-3">
              <Button>Ver Pipeline</Button>
              <Button variant="outline">Documentação</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">CRM Enterprise</h1>
          <p className="mt-2 text-muted-foreground">
            Gestão completa de relacionamento com clientes
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
