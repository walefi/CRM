'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from '../portal-layout';
import { useAuthStore } from '@/stores/auth.store';

export default function PortalDocumentsPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'documents'],
    queryFn: () => api.get('/portal/documents').then((r) => r.data),
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Seus documentos e arquivos</p>
        </div>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : data?.data?.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nenhum documento</p>
        ) : (
          data?.data?.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {d.title || d.name || `Documento ${d.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PortalLayout>
  );
}
