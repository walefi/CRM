'use client';

import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from '../portal-layout';
import { useAuthStore } from '@/stores/auth.store';

export default function PortalProposalsPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'quotes'],
    queryFn: () => api.get('/portal/proposals').then((r) => r.data),
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">Propostas comerciais enviadas</p>
        </div>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : data?.data?.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nenhuma proposta</p>
        ) : (
          data?.data?.map((q: any) => (
            <Card key={q.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{q.title || `Proposta ${q.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</p>
                  </div>
                </div>
                <Badge variant="outline">{q.status || 'Pendente'}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PortalLayout>
  );
}
