'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Info, AlertTriangle, AlertCircle, Bug, Braces, FileText } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';

const levelConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Info' },
  WARN: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Aviso' },
  ERROR: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Erro' },
  DEBUG: { icon: Bug, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Debug' },
  TRACE: { icon: Braces, color: 'text-zinc-400', bg: 'bg-zinc-500/10', label: 'Trace' },
};

export default function AutomationLogsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['automation', id, 'logs', levelFilter, page],
    queryFn: () =>
      api
        .get('/automations/logs', {
          params: { automationId: id, level: levelFilter || undefined, page, limit: 50 },
        })
        .then((r) => r.data),
  });

  const { data: automation } = useQuery({
    queryKey: ['automation', id],
    queryFn: () => api.get(`/automations/${id}`).then((r) => r.data),
  });

  const logs = data?.data || [];
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
            <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
            {automation && (
              <span className="text-lg text-muted-foreground">— {automation.name}</span>
            )}
          </div>
        </div>
      </div>

      <Tabs
        value={levelFilter}
        onValueChange={(v) => {
          setLevelFilter(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="">Todos</TabsTrigger>
          <TabsTrigger value="INFO">Info</TabsTrigger>
          <TabsTrigger value="WARN">Avisos</TabsTrigger>
          <TabsTrigger value="ERROR">Erros</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum log</h3>
            <p className="text-muted-foreground">Execute esta automação para gerar logs.</p>
          </div>
        ) : (
          logs.map((log: any, i: number) => {
            const config = levelConfig[log.level] || levelConfig.INFO;
            const Icon = config.icon;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
              >
                <Card className="hover:bg-accent/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-1.5 rounded-full mt-0.5', config.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className={cn('text-xs', config.bg, config.color)}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.details && (
                          <details className="mt-1">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Detalhes
                            </summary>
                            <pre className="text-xs font-mono bg-accent/50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                              {JSON.stringify(log.details, null, 2)}
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
