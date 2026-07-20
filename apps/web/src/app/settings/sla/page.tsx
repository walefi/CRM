'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Edit,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
  critical: 'Crítica',
};

const severityColors: Record<string, string> = {
  warning: 'text-yellow-500',
  critical: 'text-red-500',
};

export default function SlaSettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('rules');
  const [showCreate, setShowCreate] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['sla-rules'],
    queryFn: () => api.get('/sla/rules').then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['sla-stats'],
    queryFn: () => api.get('/sla/statistics').then((r) => r.data),
  });

  const { data: violations } = useQuery({
    queryKey: ['sla-violations'],
    queryFn: () => api.get('/sla/violations', { params: { limit: 20 } }).then((r) => r.data),
    enabled: tab === 'violations',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sla/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules'] });
      toast.success('Regra excluída');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

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
            <h1 className="text-2xl font-bold">SLA Engine</h1>
            <p className="text-muted-foreground">
              Configure acordos de nível de serviço e escalonamento automático
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Execuções</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.running || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Violações Hoje</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.violationsToday || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conformidade</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.complianceRate || '0.0'}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="rules">Regras SLA</TabsTrigger>
              <TabsTrigger value="violations">Violações</TabsTrigger>
              <TabsTrigger value="executions">Execuções</TabsTrigger>
            </TabsList>
            {tab === 'rules' && (
              <Button
                size="sm"
                onClick={() => {
                  setEditRule(null);
                  setShowCreate(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Nova Regra
              </Button>
            )}
          </div>

          <TabsContent value="rules" className="mt-4">
            {rulesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !rules?.length ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma regra SLA configurada.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rules.map((rule: any) => (
                  <Card key={rule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{rule.name}</p>
                            <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                              {rule.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                            <Badge variant="outline">
                              {priorityLabels[rule.priority] || rule.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            1ª Resposta: {Math.floor(rule.firstResponse / 60)}min · Resolução:{' '}
                            {Math.floor(rule.resolution / 3600)}h · Escalonamento:{' '}
                            {Math.floor(rule.escalationAfter / 60)}min · Níveis:{' '}
                            {rule.escalationLevel}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditRule(rule);
                              setShowCreate(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="violations" className="mt-4">
            {!violations?.data?.length ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma violação registrada.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {violations.data.map((v: any) => (
                  <Card key={v.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              className={cn('h-4 w-4', severityColors[v.severity] || '')}
                            />
                            <p className="font-medium">
                              {v.entityType} — {v.violationType}
                            </p>
                            <Badge variant={v.resolved ? 'default' : 'destructive'}>
                              {v.resolved ? 'Resolvida' : 'Aberta'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(v.violatedAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="executions" className="mt-4">
            <SlaExecutionsTab />
          </TabsContent>
        </Tabs>

        <SlaRuleDialog
          open={showCreate}
          onClose={() => {
            setShowCreate(false);
            setEditRule(null);
          }}
          rule={editRule}
        />
      </div>
    </AdminLayout>
  );
}

function SlaExecutionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['sla-executions'],
    queryFn: () => api.get('/sla/executions', { params: { limit: 20 } }).then((r) => r.data),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );

  if (!data?.data?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma execução registrada.</p>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    running: 'text-blue-500',
    met: 'text-green-500',
    breached: 'text-red-500',
  };

  return (
    <div className="space-y-3">
      {data.data.map((exec: any) => (
        <Card key={exec.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {exec.entityType} — {exec.entityId.substring(0, 8)}...
                </p>
                <p className="text-sm text-muted-foreground">
                  Deadline:{' '}
                  {exec.deadlineAt ? new Date(exec.deadlineAt).toLocaleString('pt-BR') : '—'}
                </p>
              </div>
              <Badge
                variant={
                  exec.status === 'met'
                    ? 'default'
                    : exec.status === 'breached'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                <span className={statusColors[exec.status] || ''}>{exec.status}</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SlaRuleDialog({ open, onClose, rule }: { open: boolean; onClose: () => void; rule: any }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: rule?.name || '',
    priority: rule?.priority || 'normal',
    firstResponse: rule?.firstResponse ? String(rule.firstResponse) : '300',
    resolution: rule?.resolution ? String(rule.resolution) : '3600',
    escalationAfter: rule?.escalationAfter ? String(rule.escalationAfter) : '600',
    escalationLevel: rule?.escalationLevel ? String(rule.escalationLevel) : '3',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        firstResponse: parseInt(form.firstResponse) || 300,
        resolution: parseInt(form.resolution) || 3600,
        escalationAfter: parseInt(form.escalationAfter) || 600,
        escalationLevel: parseInt(form.escalationLevel) || 3,
      };
      if (rule) {
        await api.patch(`/sla/rules/${rule.id}`, payload);
        toast.success('Regra atualizada');
      } else {
        await api.post('/sla/rules', payload);
        toast.success('Regra criada');
      }
      queryClient.invalidateQueries({ queryKey: ['sla-rules'] });
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar Regra SLA' : 'Nova Regra SLA'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>1ª Resposta (seg)</Label>
              <Input
                type="number"
                value={form.firstResponse}
                onChange={(e) => setForm({ ...form, firstResponse: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Resolução (seg)</Label>
              <Input
                type="number"
                value={form.resolution}
                onChange={(e) => setForm({ ...form, resolution: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Escalonar após (seg)</Label>
              <Input
                type="number"
                value={form.escalationAfter}
                onChange={(e) => setForm({ ...form, escalationAfter: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Níveis de Escalonamento</Label>
              <Input
                type="number"
                value={form.escalationLevel}
                onChange={(e) => setForm({ ...form, escalationLevel: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {rule ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
