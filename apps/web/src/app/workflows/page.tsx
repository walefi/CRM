'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Workflow,
  Plus,
  Play,
  Trash2,
  Search,
  GitBranch,
  Pencil,
  Activity,
  CheckCircle2,
  XCircle,
  RotateCw,
  Tag,
  GanttChart,
  Layers,
  Clock,
  Filter,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const statusMap: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  }
> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'warning' },
  PUBLISHED: { label: 'Publicado', variant: 'default' },
  ERROR: { label: 'Erro', variant: 'destructive' },
};

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: string;
  nodeCount: number;
  edgeCount: number;
  version: number;
  tags: string[];
  lastExecutionStatus?: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    workflow: WorkflowItem | null;
  }>({
    open: false,
    workflow: null,
  });
  const [createDialog, setCreateDialog] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '' });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['workflows-stats'],
    queryFn: () => api.get('/workflows/stats').then((r) => r.data),
  });

  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows', search, statusFilter],
    queryFn: () =>
      api
        .get('/workflows', {
          params: {
            search: search || undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
          },
        })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows-stats'] });
      toast.success('Workflow removido com sucesso');
      setDeleteDialog({ open: false, workflow: null });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao remover workflow');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => api.post('/workflows', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows-stats'] });
      toast.success('Workflow criado com sucesso');
      setCreateDialog(false);
      setNewWorkflow({ name: '', description: '' });
      router.push(`/workflows/${res.data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao criar workflow');
    },
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => api.post(`/workflows/${id}/run`),
    onSuccess: () => {
      toast.success('Execução iniciada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao executar workflow');
    },
  });

  const workflows: WorkflowItem[] = workflowsData?.data || [];

  if (!user) return null;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Automações / Workflows</h1>
            <p className="text-muted-foreground">Gerencie seus fluxos de automação</p>
          </div>
          <Button onClick={() => setCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Workflow
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.active || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Execuções (24h)</CardTitle>
              <RotateCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.executionsLast24h || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Falhas (24h)</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.failuresLast24h || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar workflows..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="INACTIVE">Inativo</SelectItem>
              <SelectItem value="PUBLISHED">Publicado</SelectItem>
              <SelectItem value="ERROR">Erro</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {workflows.length} workflow(s) encontrado(s)
          </span>
        </div>

        {workflowsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={<Workflow className="h-12 w-12" />}
            title="Nenhum workflow encontrado"
            description={
              search || statusFilter !== 'ALL'
                ? 'Tente ajustar os filtros de busca.'
                : 'Crie seu primeiro workflow de automação.'
            }
            action={
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar Workflow
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf, i) => (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{wf.name}</CardTitle>
                      <Badge variant={statusMap[wf.status]?.variant || 'secondary'}>
                        {statusMap[wf.status]?.label || wf.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {wf.description || 'Sem descrição'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> {wf.nodeCount} nós
                      </span>
                      <span className="flex items-center gap-1">
                        <GanttChart className="h-3 w-3" /> {wf.edgeCount} conexões
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" /> v{wf.version}
                      </span>
                    </div>
                    {wf.tags && wf.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {wf.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                          >
                            <Tag className="h-3 w-3 mr-1" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      <span>
                        Última atualização:{' '}
                        {new Date(wf.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {wf.lastExecutionStatus && (
                      <div className="flex items-center gap-1 text-xs mb-3">
                        <Activity className="h-3 w-3" />
                        <span className="text-muted-foreground">Última execução:</span>
                        <Badge
                          variant={
                            wf.lastExecutionStatus === 'SUCCESS'
                              ? 'success'
                              : wf.lastExecutionStatus === 'FAILED'
                                ? 'destructive'
                                : 'warning'
                          }
                          className="text-[10px]"
                        >
                          {wf.lastExecutionStatus}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/workflows/${wf.id}`);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={runMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          runMutation.mutate(wf.id);
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" /> Executar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, workflow: wf });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Workflow</DialogTitle>
              <DialogDescription>Crie uma nova automação para seu CRM.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newWorkflow);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  required
                  placeholder="Ex: Boas-vindas para novos leads"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Descreva o objetivo deste workflow"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <RotateCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Criar Workflow
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={deleteDialog.open}
          onOpenChange={(open) => !open && setDeleteDialog({ open: false, workflow: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover Workflow</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover o workflow &quot;{deleteDialog.workflow?.name}&quot;?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false, workflow: null })}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteDialog.workflow && deleteMutation.mutate(deleteDialog.workflow.id)
                }
              >
                {deleteMutation.isPending ? (
                  <RotateCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
