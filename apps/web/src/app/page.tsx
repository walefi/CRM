'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { LoginForm } from '@/components/auth/login-form';
import { AdminLayout } from '@/components/layout/admin-layout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Users,
  BarChart3,
  CheckSquare,
  Target,
  Ticket,
  MessageCircle,
  Activity,
  ArrowRight,
  Loader2,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
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
      <DashboardContent user={user} />
    </AdminLayout>
  );
}

function DashboardContent({ user }: { user: any }) {
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  const leads = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: async () => {
      const { data } = await api.get('/leads/stats');
      return data;
    },
    enabled: _hasHydrated,
  });

  const contacts = useQuery({
    queryKey: ['dashboard-contacts'],
    queryFn: async () => {
      const { data } = await api.get('/contacts/stats');
      return data;
    },
    enabled: _hasHydrated,
  });

  const deals = useQuery({
    queryKey: ['dashboard-deals'],
    queryFn: async () => {
      const { data } = await api.get('/deals/stats');
      return data;
    },
    enabled: _hasHydrated,
  });

  const tasks = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const { data } = await api.get('/tasks/stats');
      return data;
    },
    enabled: _hasHydrated,
  });

  const tickets = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/stats');
      return data;
    },
    enabled: _hasHydrated,
  });

  const conversations = useQuery({
    queryKey: ['dashboard-conversations'],
    queryFn: async () => {
      const { data } = await api.get('/conversations/stats');
      return data;
    },
    enabled: _hasHydrated,
  });

  const timeline = useQuery({
    queryKey: ['dashboard-timeline'],
    queryFn: async () => {
      const { data } = await api.get('/timeline', { params: { limit: 5 } });
      return data;
    },
    enabled: _hasHydrated,
  });

  const isLoading =
    leads.isLoading || contacts.isLoading || deals.isLoading || tasks.isLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo, {user?.firstName}!</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasError =
    leads.isError || contacts.isError || deals.isError || tasks.isError;

  if (hasError) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo, {user?.firstName}!</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Não foi possível carregar os dados do Dashboard.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                leads.refetch();
                contacts.refetch();
                deals.refetch();
                tasks.refetch();
              }}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalLeads = leads.data?.total ?? 0;
  const totalContacts = contacts.data?.total ?? 0;
  const totalDeals = deals.data?.total ?? 0;
  const totalValue = deals.data?.totalValue ?? 0;
  const pendingTasks = tasks.data?.pending ?? 0;
  const overdueTasks = tasks.data?.overdue ?? 0;
  const openTickets = tickets.data?.openTickets ?? 0;
  const activeConversations = conversations.data?.activeConversations ?? 0;
  const recentActivities = Array.isArray(timeline.data) ? timeline.data : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo, {user?.firstName}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/leads">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Total de leads
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/contacts">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contatos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContacts}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Total de contatos
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/deals">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negócios</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeals}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalValue)}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks}</div>
              <p className="text-xs text-muted-foreground">
                {overdueTasks > 0 ? (
                  <span className="text-destructive">{overdueTasks} atrasadas</span>
                ) : (
                  'Nenhuma atrasada'
                )}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/tickets">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTickets}</div>
              <p className="text-xs text-muted-foreground">Aguardando atendimento</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/conversations">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeConversations}</div>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          <Link href="/timeline">
            <Button variant="ghost" size="sm">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.title || activity.type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description || 'Sem descrição'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.createdAt
                      ? new Date(activity.createdAt).toLocaleDateString('pt-BR')
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/pipeline">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Pipeline</p>
                <p className="text-xs text-muted-foreground">Visualizar funil de vendas</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Relatórios</p>
                <p className="text-xs text-muted-foreground">Análises e indicadores</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/calendar">
          <Card className="card-hover cursor-pointer transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Calendário</p>
                <p className="text-xs text-muted-foreground">Eventos e compromissos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
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
