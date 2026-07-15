'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from '../portal-layout';
import { useAuthStore } from '@/stores/auth.store';

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  open: 'bg-yellow-500/10 text-yellow-400',
  in_progress: 'bg-purple-500/10 text-purple-400',
  closed: 'bg-zinc-500/10 text-zinc-400',
};
const statusLabels: Record<string, string> = {
  new: 'Novo',
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

export default function PortalTicketsPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'tickets'],
    queryFn: () => api.get('/portal/tickets').then((r) => r.data),
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Tickets</h1>
            <p className="text-muted-foreground">Acompanhe seus tickets de suporte</p>
          </div>
          <Link href="/tickets">
            <Badge className="cursor-pointer">
              <Plus className="h-3 w-3 mr-1" /> Novo Ticket
            </Badge>
          </Link>
        </div>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : data?.data?.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nenhum ticket</p>
        ) : (
          data?.data?.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(t.updatedAt)}</p>
                  </div>
                  <Badge className={statusColors[t.status] || ''}>
                    {statusLabels[t.status] || t.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PortalLayout>
  );
}
