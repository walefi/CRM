'use client';

import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

export function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } border-r bg-card flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <h2 className="font-bold text-lg">CRM</h2>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <NavItem
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Dashboard"
            active
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={<Users className="h-5 w-5" />}
            label="Contatos"
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={<Building2 className="h-5 w-5" />}
            label="Empresas"
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={<BarChart3 className="h-5 w-5" />}
            label="Relatórios"
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={<Settings className="h-5 w-5" />}
            label="Configurações"
            collapsed={!sidebarOpen}
          />
        </nav>

        <div className="p-4 border-t space-y-2">
          <div className="flex items-center gap-3">
            <Avatar fallback={getInitials(user.firstName, user.lastName)} />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex-1 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground text-center"
              title="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 mx-auto" /> : <Moon className="h-4 w-4 mx-auto" />}
            </button>
            <button
              onClick={() => clearAuth()}
              className="flex-1 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground text-center"
              title="Sair"
            >
              <LogOut className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b flex items-center px-6 bg-card/50 backdrop-blur-sm">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </header>

        <div className="p-6 space-y-6">
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
                Olá, {user.firstName}! O sistema está em construção. Novas funcionalidades
                serão adicionadas nas próximas etapas. Fique atento!
              </p>
              <div className="mt-6 flex gap-3">
                <Button>Ver Pipeline</Button>
                <Button variant="outline">Documentação</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
