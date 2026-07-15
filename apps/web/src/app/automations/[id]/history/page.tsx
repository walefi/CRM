'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, SkipForward, Play } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/30',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/30',
  RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PENDING: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  SKIPPED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

const statusLabels: Record<string, string> = {
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  RUNNING: 'Executando',
  PENDING: 'Pendente',
  SKIPPED: 'Pulado',
};

const statusIcons: Record<string, any> = {
  COMPLETED: CheckCircle2,
  FAILED: AlertCircle,
  RUNNING: Play,
  PENDING: Clock,
  SKIPPED: SkipForward,
};

export default function AutomationHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['automation', id, 'history', statusFilter, page],
    queryFn: () =>
      api
        .get('/automations/history', {
          params: { automationId: id, status: statusFilter || undefined, page, limit: 20 },
        })
        .then((r) => r.data),
  });

  const { data: automation } = useQuery({
    queryKey: ['automation', id],
    queryFn: () => api.get(`/automations/${id}`).then((r) => r.data),
  });

  const executions = data?.data || [];
  const meta = data?.meta;

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/automations/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
            {automation && (
              <span className="text-lg text-muted-foreground">— {automation.name}</span>
            )}
          </div>
          <p className="text-muted-foreground">Histórico de execuções desta automação.</p>
        </div>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="">Todas</TabsTrigger>
          <TabsTrigger value="COMPLETED">Concluídas</TabsTrigger>
          <TabsTrigger value="FAILED">Falhas</TabsTrigger>
          <TabsTrigger value="RUNNING">Em execução</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : executions.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma execução</h3>
            <p className="text-muted-foreground">Execute esta automação para ver o histórico.</p>
          </div>
        ) : (
          executions.map((exec: any, i: number) => {
            const StatusIcon = statusIcons[exec.status] || Clock;
            return (
              <motion.div
                key={exec.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-2 rounded-full',
                          exec.status === 'COMPLETED' && 'bg-green-500/10',
                          exec.status === 'FAILED' && 'bg-red-500/10',
                        )}
                      >
                        <StatusIcon
                          className={cn(
                            'h-4 w-4',
                            exec.status === 'COMPLETED' && 'text-green-400',
                            exec.status === 'FAILED' && 'text-red-400',
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColors[exec.status]}>
                            {statusLabels[exec.status]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Trigger: {exec.trigger || 'N/A'}
                          </span>
                          {exec.duration !== null && (
                            <span className="text-xs text-muted-foreground">{exec.duration}s</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Iniciado: {formatDate(exec.createdAt)}
                          {exec.completedAt && ` — Concluído: ${formatDate(exec.completedAt)}`}
                        </div>
                        {exec.error && <p className="text-xs text-red-400 mt-1">{exec.error}</p>}
                        {exec.result && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Resultados
                            </summary>
                            <pre className="text-xs font-mono bg-accent/50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                              {JSON.stringify(exec.result, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasPreviousPage}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo
          </Button>
        </div>
      )}
    </div>
  );
}
