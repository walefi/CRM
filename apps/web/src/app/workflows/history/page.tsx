'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { History, Search, ArrowLeft, ExternalLink } from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
  PENDING: 'secondary',
  RUNNING: 'default',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
  RETRYING: 'default',
};

export default function WorkflowHistoryPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workflow-logs', page, search, statusFilter],
    queryFn: async () => {
      const { data: res } = await api.get('/workflows/logs');
      let items = res?.data || res || [];
      if (Array.isArray(items)) {
        if (search)
          items = items.filter(
            (i: any) =>
              (i.workflow?.name || '').toLowerCase().includes(search.toLowerCase()) ||
              (i.trigger || '').toLowerCase().includes(search.toLowerCase()),
          );
        if (statusFilter) items = items.filter((i: any) => i.status === statusFilter);
        return { data: items.slice((page - 1) * 15, page * 15), meta: { total: items.length } };
      }
      return { data: [], meta: { total: 0 } };
    },
  });

  if (!user) return null;

  const items = data?.data || [];
  const total = data?.meta?.total || 0;

  return (
    <AdminLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      }}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/workflows')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Historico de Execucoes</h1>
            <p className="text-muted-foreground">Logs de execucao dos workflows</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por workflow ou trigger..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os Status</option>
            <option value="COMPLETED">Concluidos</option>
            <option value="FAILED">Falhos</option>
            <option value="RUNNING">Executando</option>
            <option value="PENDING">Pendentes</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<History className="h-12 w-12" />}
            title="Nenhum historico"
            description="Nenhuma execucao de workflow encontrada"
          />
        ) : (
          <div className="space-y-3">
            {items.map((exec: any) => (
              <Card key={exec.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {exec.workflow?.name || exec.trigger || 'Workflow'}
                      </p>
                      <Badge variant={(statusColors[exec.status] as any) || 'secondary'}>
                        {exec.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Trigger: {exec.trigger || 'manual'}</span>
                      {exec.duration && <span>Duracao: {exec.duration}ms</span>}
                      {exec.correlationId && <span>ID: {exec.correlationId.slice(0, 8)}...</span>}
                    </div>
                    {exec.error && (
                      <p className="text-xs text-destructive mt-1 truncate">{exec.error}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{new Date(exec.startedAt || exec.createdAt).toLocaleString('pt-BR')}</p>
                    {exec.completedAt && (
                      <p>Concluido: {new Date(exec.completedAt).toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                  {exec.workflowId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/workflows/${exec.workflowId}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {total > 15 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} execucoes</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                Pagina {page} de {Math.ceil(total / 15)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 15 >= total}
                onClick={() => setPage(page + 1)}
              >
                Proximo
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
