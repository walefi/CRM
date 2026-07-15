'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Play,
  Copy,
  Trash2,
  MoreHorizontal,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Eye,
  Rocket,
  History,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/30',
  INACTIVE: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  DRAFT: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  ERROR: 'bg-red-500/10 text-red-400 border-red-500/30',
  PAUSED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  RUNNING: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  DRAFT: 'Rascunho',
  ERROR: 'Erro',
  PAUSED: 'Pausado',
  RUNNING: 'Executando',
};

export default function AutomationsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: automationsData, isLoading } = useQuery({
    queryKey: ['automations', search, statusFilter],
    queryFn: () =>
      api
        .get('/automations', {
          params: { search: search || undefined, status: statusFilter || undefined, limit: 50 },
        })
        .then((r) => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['automations', 'stats'],
    queryFn: () => api.get('/automations/stats').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.post('/automations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setShowCreateDialog(false);
      setCreateName('');
      setCreateDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setDeleteId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/automations/${id}/publish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/automations/${id}/duplicate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/automations/${id}/run`, { trigger: 'MANUAL', input: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const automations = automationsData?.data || [];
  const stats = statsData || {};

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie automações que reagem a eventos e executam ações automaticamente.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active || 0}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Play className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.executionsToday || 0}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failedLast24h || 0}</p>
                <p className="text-xs text-muted-foreground">Erros 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgDurationMs ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : '0s'}
                </p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <BarChart3 className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalExecutions || 0}</p>
                <p className="text-xs text-muted-foreground">Execuções</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar automações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="">Todas</TabsTrigger>
            <TabsTrigger value="ACTIVE">Ativas</TabsTrigger>
            <TabsTrigger value="DRAFT">Rascunho</TabsTrigger>
            <TabsTrigger value="PAUSED">Pausadas</TabsTrigger>
            <TabsTrigger value="ERROR">Erro</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['automations'] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : automations.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma automação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira automação para começar a automatizar processos.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Automação
            </Button>
          </div>
        ) : (
          automations.map((auto: any, index: number) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:border-primary/50 transition-colors relative">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            auto.status === 'ACTIVE'
                              ? 'bg-green-500'
                              : auto.status === 'ERROR'
                                ? 'bg-red-500'
                                : auto.status === 'PAUSED'
                                  ? 'bg-yellow-500'
                                  : 'bg-blue-500',
                          )}
                        />
                        <Link
                          href={`/automations/${auto.id}`}
                          className="font-semibold truncate hover:text-primary transition-colors"
                        >
                          {auto.name}
                        </Link>
                      </div>
                      {auto.description && (
                        <p className="text-sm text-muted-foreground truncate">{auto.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/automations/${auto.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runMutation.mutate(auto.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Executar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => publishMutation.mutate(auto.id)}>
                          <Rocket className="h-4 w-4 mr-2" />
                          {auto.status === 'ACTIVE' ? 'Re-publicar' : 'Publicar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(auto.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/automations/${auto.id}/history`}>
                            <History className="h-4 w-4 mr-2" />
                            Histórico
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/automations/${auto.id}/logs`}>
                            <FileText className="h-4 w-4 mr-2" />
                            Logs
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400"
                          onClick={() => setDeleteId(auto.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className={statusColors[auto.status] || ''}>
                      {statusLabels[auto.status] || auto.status}
                    </Badge>
                    {auto.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {auto.runCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {auto.lastRunAt ? formatDate(auto.lastRunAt) : 'Nunca'}
                      </span>
                    </div>
                    <span>v{auto.priority || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {automationsData?.meta && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Mostrando {automations.length} de {automationsData.meta.total} automação(ões)
          </p>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Automação</DialogTitle>
            <DialogDescription>
              Crie uma nova automação. Você poderá configurar os gatilhos, condições e ações depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome da automação"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição</Label>
              <Input
                id="desc"
                placeholder="Breve descrição"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!createName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({ name: createName, description: createDescription })
              }
            >
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Automação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
