'use client';

import { useQuery } from '@tanstack/react-query';
import { Ticket, FileText, ScrollText, FileSpreadsheet, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from './portal-layout';
import { useAuthStore } from '@/stores/auth.store';

export default function PortalDashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: () => api.get('/portal/dashboard').then((r) => r.data),
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bem-vindo, {user.firstName}!</h1>
          <p className="text-muted-foreground">Portal do Cliente</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Link href="/portal/tickets" className="group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Ticket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data?.tickets || 0}</p>
                      <p className="text-xs text-muted-foreground">Tickets Abertos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/conversations" className="group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <MessageSquare className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data?.conversations || 0}</p>
                      <p className="text-xs text-muted-foreground">Conversas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/portal/documents" className="group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data?.documents || 0}</p>
                      <p className="text-xs text-muted-foreground">Documentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/portal/contracts" className="group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <ScrollText className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data?.contracts || 0}</p>
                      <p className="text-xs text-muted-foreground">Contratos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/portal/proposals" className="group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data?.quotes || 0}</p>
                      <p className="text-xs text-muted-foreground">Propostas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {data?.recentTickets?.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Tickets Recentes</h3>
              <div className="space-y-2">
                {data.recentTickets.map((t: any) => (
                  <Link
                    key={t.id}
                    href={`/portal/tickets`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent text-sm"
                  >
                    <span className="truncate flex-1">{t.subject}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {t.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(t.updatedAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
