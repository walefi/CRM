'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Puzzle,
  Search,
  Power,
  RefreshCw,
  Trash2,
  XCircle,
  Footprints,
  Unplug,
  BarChart3,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth.store';

const categories = [
  { value: 'crm', label: 'CRM' },
  { value: 'messaging', label: 'Mensageria' },
  { value: 'communication', label: 'Comunicação' },
  { value: 'social', label: 'Redes Sociais' },
  { value: 'payment', label: 'Pagamentos' },
  { value: 'ai', label: 'IA' },
  { value: 'automation', label: 'Automação' },
  { value: 'productivity', label: 'Produtividade' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'dev', label: 'Dev' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'generic', label: 'Genérico' },
  { value: 'infra', label: 'Infra' },
];

const categoryIcons: Record<string, string> = {
  crm: '👥',
  messaging: '💬',
  communication: '📢',
  social: '🌐',
  payment: '💳',
  ai: '🤖',
  automation: '⚡',
  productivity: '📊',
  cloud: '☁️',
  dev: '💻',
  marketing: '📈',
  generic: '🔌',
  infra: '🏗️',
};

const healthColors: Record<string, string> = {
  healthy: 'bg-green-500/10 text-green-400',
  degraded: 'bg-yellow-500/10 text-yellow-400',
  disconnected: 'bg-zinc-500/10 text-zinc-400',
  unknown: 'bg-zinc-500/10 text-zinc-400',
};

const healthLabels: Record<string, string> = {
  healthy: 'Saudável',
  degraded: 'Degradado',
  disconnected: 'Desconectado',
  unknown: 'Desconhecido',
};

export default function IntegrationsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createProvider, setCreateProvider] = useState('');
  const [createName, setCreateName] = useState('');

  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ['integrations', search, category],
    queryFn: () =>
      api
        .get('/integrations', {
          params: { search: search || undefined, category: category || undefined },
        })
        .then((r) => r.data),
  });

  const { data: providers } = useQuery({
    queryKey: ['integrations', 'providers'],
    queryFn: () => api.get('/integrations/providers').then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['integrations', 'stats'],
    queryFn: () => api.get('/integrations/stats').then((r) => r.data),
  });

  const { data: health } = useQuery({
    queryKey: ['integrations', 'health'],
    queryFn: () => api.get('/integrations/health').then((r) => r.data),
  });

  const { data: logs } = useQuery({
    queryKey: ['integrations', 'logs'],
    queryFn: () => api.get('/integrations/logs', { params: { limit: 10 } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/integrations', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowCreate(false);
    },
  });

  const connectMutation = useMutation({
    mutationFn: (id: string) =>
      api.post('/integrations/connect', {
        integrationId: id,
        authType: 'oauth2',
        scopes: ['read', 'write'],
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.post('/integrations/disconnect', { integrationId: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) =>
      api.post('/integrations/sync', { integrationId: id, direction: 'import' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/integrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setDeleteId(null);
    },
  });

  const integrations = integrationsData?.data || [];
  const providerList = providers || [];
  const logEntries = logs?.data || [];

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground mt-1">
            Conecte seu CRM com dezenas de serviços externos.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Integração
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Puzzle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Power className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.active || 0}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Footprints className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.connected || 0}</p>
                <p className="text-xs text-muted-foreground">Conectadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <RefreshCw className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.syncsToday || 0}</p>
                <p className="text-xs text-muted-foreground">Syncs Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.errorsToday || 0}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
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
                <p className="text-2xl font-bold">{stats?.totalSyncs || 0}</p>
                <p className="text-xs text-muted-foreground">Syncs Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar integrações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="">Todas</TabsTrigger>
            {categories.slice(0, 6).map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {integrations.map((int: any, i: number) => (
              <motion.div
                key={int.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                          {categoryIcons[int.provider] || '🔌'}
                        </div>
                        <div>
                          <p className="font-semibold">{int.name}</p>
                          <p className="text-xs text-muted-foreground">{int.provider}</p>
                        </div>
                      </div>
                      <Badge className={healthColors[int.healthScore] || ''}>
                        {healthLabels[int.healthScore] || int.healthScore}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {int.isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => disconnectMutation.mutate(int.id)}
                          >
                            <Unplug className="h-3.5 w-3.5 mr-1" /> Desconectar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncMutation.mutate(int.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => connectMutation.mutate(int.id)}>
                          <Power className="h-3.5 w-3.5 mr-1" /> Conectar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteId(int.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {integrations.length === 0 && (
              <div className="col-span-full text-center py-16">
                <Puzzle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma integração</h3>
                <p className="text-muted-foreground mb-4">Conecte seu CRM com serviços externos.</p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Nova Integração
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Marketplace de Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {providerList.slice(0, 24).map((p: any) => (
                  <button
                    key={p.provider}
                    onClick={() => {
                      setCreateProvider(p.provider);
                      setCreateName(p.name);
                      setShowCreate(true);
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border hover:border-primary/50 hover:bg-accent/50 transition-colors text-center"
                  >
                    <span className="text-xl">{categoryIcons[p.category] || '🔌'}</span>
                    <span className="text-xs font-medium">{p.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {p.category}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Logs Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {logEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum log</p>
              ) : (
                <div className="space-y-1.5">
                  {logEntries.slice(0, 6).map((l: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded text-xs">
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          l.level === 'error'
                            ? 'bg-red-500'
                            : l.level === 'warn'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500',
                        )}
                      />
                      <span className="flex-1 truncate">{l.message}</span>
                      <span className="text-muted-foreground">{l.statusCode || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {health?.integrations?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Health Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {health.integrations.map((h: any) => (
                    <div
                      key={h.name}
                      className="flex items-center justify-between p-1.5 rounded text-xs"
                    >
                      <span className="truncate">{h.name}</span>
                      <Badge variant="outline" className={healthColors[h.healthScore]}>
                        {healthLabels[h.healthScore]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Integração</DialogTitle>
            <DialogDescription>Selecione um provider e configure a integração.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={createProvider}
                onValueChange={(v) => {
                  setCreateProvider(v);
                  const p = providerList.find((p: any) => p.provider === v);
                  if (p) setCreateName(p.name);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerList.map((p: any) => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {categoryIcons[p.category] || '🔌'} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome da integração"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!createProvider}
              onClick={() =>
                createMutation.mutate({
                  name: createName || createProvider,
                  provider: createProvider,
                  type: createProvider,
                })
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
            <DialogTitle>Excluir Integração</DialogTitle>
            <DialogDescription>
              Tem certeza? Toda a configuração e credenciais serão removidas.
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
