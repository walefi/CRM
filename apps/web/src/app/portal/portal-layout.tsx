'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  FileText,
  ScrollText,
  FileSpreadsheet,
  BookOpen,
  Bell,
  MessageSquare,
  User,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';

const portalNav = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/portal' },
  { label: 'Tickets', icon: Ticket, href: '/portal/tickets' },
  { label: 'Conversas', icon: MessageSquare, href: '/portal/conversations' },
  { label: 'Documentos', icon: FileText, href: '/portal/documents' },
  { label: 'Contratos', icon: ScrollText, href: '/portal/contracts' },
  { label: 'Propostas', icon: FileSpreadsheet, href: '/portal/proposals' },
  { label: 'Conhecimento', icon: BookOpen, href: '/portal/knowledge' },
  { label: 'Notificações', icon: Bell, href: '/portal/notifications' },
  { label: 'Perfil', icon: User, href: '/portal/profile' },
];

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth } = useAuthStore();
  const pathname = usePathname();
  const [sidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center px-4 gap-4 bg-card/50 shrink-0">
        <Link href="/portal" className="font-bold text-lg text-primary">
          CRM Portal
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          {user && (
            <>
              <Avatar
                fallback={`${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`}
                size="sm"
              />
              <span className="text-sm hidden sm:inline">
                {user.firstName} {user.lastName}
              </span>
            </>
          )}
          <Link href="/">
            <Button variant="ghost" size="sm">
              Admin
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={clearAuth}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="flex">
        <aside
          className={cn(
            'border-r bg-card/30 min-h-[calc(100vh-3.5rem)] shrink-0',
            sidebarOpen ? 'w-56' : 'w-12',
          )}
        >
          <div className="p-2">
            {portalNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
