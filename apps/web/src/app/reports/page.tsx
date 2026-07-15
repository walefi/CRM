'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Target,
  Clock,
  Calendar,
  Play,
  Trash2,
  Copy,
  MoreHorizontal,
  History,
  LayoutTemplate,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth.store';

const reportIcons: Record<string, any> = {
  sales: Target,
  pipeline: BarChart3,
  leads: Users,
  revenue: TrendingUp,
  companies: FileText,
  contacts: Users,
  products: FileText,
  quotes: FileText,
  contracts: FileText,
  activities: Clock,
  documents: FileText,
  users: Users,
  executive: PieChart,
  custom: FileText,
};

const reportLabels: Record<string, string> = {
  sales: 'Vendas',
  pipeline: 'Pipeline',
  leads: 'Leads',
  revenue: 'Receita',
  companies: 'Empresas',
  contacts: 'Contatos',
  products: 'Produtos',
  quotes: 'Propostas',
  contracts: 'Contratos',
  activities: 'Atividades',
  documents: 'Documentos',
  users: 'Usuários',
  executive: 'Executivo',
  custom: 'Personalizado',
};

const formatLabels: Record<string, string> = {
  pdf: 'PDF',
  xlsx: 'Excel',
  csv: 'CSV',
  json: 'JSON',
  html: 'HTML',
  xml: 'XML',
  markdown: 'Markdown',
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-400',
  failed: 'bg-red-500/10 text-red-400',
  running: 'bg-blue-500/10 text-blue-400',
  pending: 'bg-zinc-500/10 text-zinc-400',
};

const statusLabels: Record<string, string> = {
  completed: 'Concluído',
  failed: 'Falhou',
  running: 'Executando',
  pending: 'Pendente',
};

const BUILT_IN_TEMPLATES = [
  {
    category: 'executive',
    name: 'Resumo Executivo',
    description: 'Visão geral com KPIs, receita e pipeline',
    type: 'executive',
  },
  {
    category: 'pipeline',
    name: 'Pipeline Comercial',
    description: 'Negócios por etapa com valores',
    type: 'pipeline',
  },
  {
    category: 'sales',
    name: 'Funil de Vendas',
    description: 'Conversão de leads até vendas ganhas',
    type: 'sales',
  },
  {
    category: 'sales',
    name: 'Performance por Vendedor',
    description: 'Ranking com ganhos, perdas e taxa',
    type: 'sales',
  },
  {
    category: 'leads',
    name: 'Conversão de Leads',
    description: 'Leads por origem e taxa de conversão',
    type: 'leads',
  },
  {
    category: 'activities',
    name: 'Atividades',
    description: 'Atividades realizadas no período',
    type: 'activities',
  },
  {
    category: 'contracts',
    name: 'Contratos',
    description: 'Contratos ativos e expirando',
    type: 'contracts',
  },
  {
    category: 'quotes',
    name: 'Propostas',
    description: 'Propostas enviadas e aceitas',
    type: 'quotes',
  },
  {
    category: 'executive',
    name: 'Dashboard Executivo',
    description: 'Todos KPIs principais',
    type: 'executive',
  },
];

export default function ReportsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('custom');
  const [createFormat, setCreateFormat] = useState('pdf');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', search],
    queryFn: () =>
      api
        .get('/reports', { params: { search: search || undefined, limit: 50 } })
        .then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['reports', 'stats'],
    queryFn: () => api.get('/reports/stats').then((r) => r.data),
  });

  const { data: history } = useQuery({
    queryKey: ['reports', 'history'],
    queryFn: () => api.get('/reports/history', { params: { limit: 10 } }).then((r) => r.data),
  });

  const { data: serverTemplates } = useQuery({
    queryKey: ['reports', 'templates'],
    queryFn: () => api.get('/reports/templates').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/reports', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowCreate(false);
      setCreateName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setDeleteId(null);
    },
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => api.post('/reports/run', { reportId: id, format: 'pdf' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (report: any) => {
      const r = await api.post('/reports', {
        name: `${report.name} (Copy)`,
        type: report.type,
        format: report.format,
        config: report.config,
        sections: report.sections,
      });
      return r.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const reports = data?.data || [];
  const executions = history?.data || [];
  const allTemplates = [
    ...BUILT_IN_TEMPLATES,
    ...(Array.isArray(serverTemplates) ? serverTemplates : []),
  ];

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Crie, agende e exporte relatórios personalizados.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Relatório
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Relatórios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Play className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.executionsToday || 0}</p>
                <p className="text-xs text-muted-foreground">Execuções Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <LayoutTemplate className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.templates || 0}</p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Calendar className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.schedules || 0}</p>
                <p className="text-xs text-muted-foreground">Agendamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Input
          placeholder="Buscar relatórios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32" />
              </CardContent>
            </Card>
          ))
        ) : reports.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum relatório</h3>
            <p className="text-muted-foreground mb-4">Crie seu primeiro relatório personalizado.</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Criar Relatório
            </Button>
          </div>
        ) : (
          reports.map((r: any, i: number) => {
            const Icon = reportIcons[r.type] || FileText;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-semibold truncate">{r.name}</span>
                        </div>
                        {r.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {r.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => runMutation.mutate(r.id)}>
                            <Play className="h-4 w-4 mr-2" /> Executar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(r)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/reports/${r.id}/history`}>
                              <History className="h-4 w-4 mr-2" /> Histórico
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-400"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline">{reportLabels[r.type] || r.type}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {formatLabels[r.format] || r.format}
                      </Badge>
                      {(r as any).schedules?.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" /> Agendado
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Criado {formatDate(r.createdAt)} • {(r as any).executions?.length || 0}{' '}
                      execuções
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {allTemplates.slice(0, 6).map((t: any, i: number) => (
                <button
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg border hover:border-primary/50 text-left transition-colors"
                  onClick={() => {
                    setCreateName(t.name);
                    setCreateType(t.type);
                    setShowCreate(true);
                  }}
                >
                  <div className="p-1.5 rounded-md bg-muted shrink-0 mt-0.5">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description || t.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimas Execuções</CardTitle>
          </CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma execução ainda
              </p>
            ) : (
              <div className="space-y-2">
                {executions.slice(0, 6).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        e.status === 'completed'
                          ? 'bg-green-500'
                          : e.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-blue-500',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{e.report?.name || 'Deleted'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatLabels[e.format] || e.format} • {formatDate(e.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[e.status]}>
                      {statusLabels[e.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Relatório</DialogTitle>
            <DialogDescription>
              Crie um relatório personalizado com dados do Analytics Engine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome do relatório"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={createType} onValueChange={setCreateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={createFormat} onValueChange={setCreateFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(formatLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!createName.trim()}
              onClick={() =>
                createMutation.mutate({ name: createName, type: createType, format: createFormat })
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
            <DialogTitle>Excluir Relatório</DialogTitle>
            <DialogDescription>Tem certeza? Esta ação não pode ser desfeita.</DialogDescription>
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
