'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Building2, Target, KanbanSquare, DollarSign,
  CheckSquare, Bell, Puzzle, Sparkles, Workflow, Settings, Shield,
  ChevronLeft, ChevronRight, Sun, Moon, Search, Command, Menu,
  MessageCircle, Phone, Calendar, FileText, Package,
  Mail, LogOut, User, Briefcase, ChevronDown,
  PieChart, TrendingUp, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BreadcrumbNav } from '@/components/layout/breadcrumb';

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

const navigation: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, href: '/' },
      { label: 'Atividades', icon: <Activity className="h-5 w-5" />, href: '/activities' },
      { label: 'Calendário', icon: <Calendar className="h-5 w-5" />, href: '/calendar' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Leads', icon: <Target className="h-5 w-5" />, href: '/leads' },
      { label: 'Contatos', icon: <Users className="h-5 w-5" />, href: '/contacts' },
      { label: 'Empresas', icon: <Building2 className="h-5 w-5" />, href: '/companies' },
      { label: 'Negócios', icon: <DollarSign className="h-5 w-5" />, href: '/deals' },
      { label: 'Pipeline', icon: <KanbanSquare className="h-5 w-5" />, href: '/pipeline' },
      { label: 'Tarefas', icon: <CheckSquare className="h-5 w-5" />, href: '/tasks' },
      { label: 'Produtos', icon: <Package className="h-5 w-5" />, href: '/products' },
      { label: 'Propostas', icon: <FileText className="h-5 w-5" />, href: '/quotes' },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { label: 'Conversas', icon: <MessageCircle className="h-5 w-5" />, href: '/conversations' },
      { label: 'E-mail', icon: <Mail className="h-5 w-5" />, href: '/email' },
      { label: 'WhatsApp', icon: <Phone className="h-5 w-5" />, href: '/whatsapp' },
    ],
  },
  {
    label: 'Automação',
    items: [
      { label: 'Automações', icon: <Workflow className="h-5 w-5" />, href: '/automations' },
      { label: 'IA', icon: <Sparkles className="h-5 w-5" />, href: '/ai' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { label: 'Relatórios', icon: <PieChart className="h-5 w-5" />, href: '/reports' },
      { label: 'Dashboard', icon: <TrendingUp className="h-5 w-5" />, href: '/analytics' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários', icon: <Users className="h-5 w-5" />, href: '/users' },
      { label: 'Equipes', icon: <Briefcase className="h-5 w-5" />, href: '/teams' },
      { label: 'Departamentos', icon: <Building2 className="h-5 w-5" />, href: '/departments' },
      { label: 'Permissões', icon: <Shield className="h-5 w-5" />, href: '/permissions' },
      { label: 'Integrações', icon: <Puzzle className="h-5 w-5" />, href: '/integrations' },
      { label: 'Configurações', icon: <Settings className="h-5 w-5" />, href: '/settings' },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  user?: { firstName: string; lastName: string; email: string; avatar?: string; role?: string; };
  tenant?: { name: string; plan: string };
}

export function AdminLayout({ children, user, tenant }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center justify-between px-4 border-b shrink-0">
        {!collapsed && (
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            CRM
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hidden lg:block"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {navigation.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex-1 p-2 rounded-md hover:bg-accent text-muted-foreground flex items-center justify-center gap-2"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span className="text-xs">Tema</span>}
          </button>
          <Link
            href="/settings"
            className="flex-1 p-2 rounded-md hover:bg-accent text-muted-foreground flex items-center justify-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span className="text-xs">Ajustes</span>}
          </Link>
        </div>
        {user && (
          <div className={cn('flex items-center rounded-lg p-2 bg-accent/50', collapsed && 'justify-center')}>
            <Avatar src={user.avatar} fallback={`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`} size="sm" />
            {!collapsed && (
              <div className="ml-2 min-w-0">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-60 bg-card border-r z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b flex items-center px-4 gap-4 bg-card/50 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md hover:bg-accent lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {searchOpen ? (
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-10"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Buscar...</span>
              <kbd className="ml-8 px-1.5 py-0.5 text-xs rounded bg-muted">
                <Command className="h-3 w-3 inline" />K
              </kbd>
            </button>
          )}

          <div className="flex-1" />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </Button>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent">
                  <Avatar
                    src={user.avatar}
                    fallback={`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
                    size="sm"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{user.firstName}</p>
                    <p className="text-xs text-muted-foreground">{user.role || 'User'}</p>
                  </div>
                  <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/profile"><User className="h-4 w-4 mr-2" />Perfil</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings"><Settings className="h-4 w-4 mr-2" />Configurações</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Breadcrumb */}
        <BreadcrumbNav />

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="h-10 border-t flex items-center px-6 text-xs text-muted-foreground shrink-0">
          <span>CRM Enterprise v1.0.0</span>
          <span className="flex-1" />
          {tenant && <span>{tenant.name} — {tenant.plan}</span>}
        </footer>
      </div>
    </div>
  );
}
