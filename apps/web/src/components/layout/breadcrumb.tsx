'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const labelMap: Record<string, string> = {
  companies: 'Empresas',
  contacts: 'Contatos',
  leads: 'Leads',
  deals: 'Negócios',
  pipeline: 'Pipeline',
  tasks: 'Tarefas',
  products: 'Produtos',
  quotes: 'Propostas',
  conversations: 'Conversas',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  automations: 'Automações',
  ai: 'IA',
  reports: 'Relatórios',
  analytics: 'Analytics',
  users: 'Usuários',
  teams: 'Equipes',
  departments: 'Departamentos',
  permissions: 'Permissões',
  integrations: 'Integrações',
  settings: 'Configurações',
  profile: 'Perfil',
  activities: 'Atividades',
  calendar: 'Calendário',
  notifications: 'Notificações',
};

export function BreadcrumbNav() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 px-6 py-2 text-sm text-muted-foreground border-b bg-muted/20">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const label = labelMap[segment] || segment;
        const isLast = i === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
