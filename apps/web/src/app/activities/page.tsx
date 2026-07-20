'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Activity,
  CheckSquare,
  Calendar,
  StickyNote,
  Mail,
  Phone,
  Clock,
  Plus,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const ACTIVITY_TYPES = [
  { value: 'TASK', label: 'Tarefa', icon: CheckSquare, color: 'text-blue-500' },
  { value: 'MEETING', label: 'Reunião', icon: Calendar, color: 'text-purple-500' },
  { value: 'NOTE', label: 'Nota', icon: StickyNote, color: 'text-yellow-500' },
  { value: 'EMAIL', label: 'Email', icon: Mail, color: 'text-green-500' },
  { value: 'CALL', label: 'Chamada', icon: Phone, color: 'text-red-500' },
];

const ENTITY_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contact', label: 'Contato' },
  { value: 'company', label: 'Empresa' },
  { value: 'deal', label: 'Negócio' },
];

function getActivityIcon(type: string) {
  const found = ACTIVITY_TYPES.find((t) => t.value === type);
  if (found) {
    const Icon = found.icon;
    return <Icon className={`h-5 w-5 ${found.color}`} />;
  }
  return <Activity className="h-5 w-5 text-muted-foreground" />;
}

function getActivityLabel(type: string) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label || type;
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffH < 24) return `${diffH}h atrás`;
  if (diffD < 7) return `${diffD}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

export default function ActivitiesPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const activities = useQuery({
    queryKey: ['timeline', typeFilter, search],
    queryFn: async () => {
      try {
        const params: Record<string, any> = { limit: 100 };
        if (typeFilter !== 'all') params.type = typeFilter;
        if (search) params.search = search;
        const { data } = await api.get('/timeline', { params });
        return data;
      } catch {
        return [];
      }
    },
  });

  const items: any[] = Array.isArray(activities.data)
    ? activities.data
    : activities.data?.data || [];

  const totalActivities = items.length;
  const todayCount = items.filter((a: any) => isToday(a.createdAt)).length;
  const weekCount = items.filter((a: any) => isThisWeek(a.createdAt)).length;

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
            <h1 className="text-2xl font-bold">Atividades</h1>
            <p className="text-muted-foreground">Acompanhe todas as atividades do CRM</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Atividade
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Atividades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActivities}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weekCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <CheckSquare className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {items.filter((a: any) => a.type === 'TASK').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atividades..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            {ACTIVITY_TYPES.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {activities.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-12 w-12" />}
            title="Nenhuma atividade encontrada"
            description="Comece criando uma nova atividade ou ajuste os filtros."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Nova Atividade
              </Button>
            }
          />
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-1">
              {items.map((activity: any, i: number) => (
                <div key={activity.id || i} className="relative flex gap-4 py-3">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border bg-background">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{activity.title}</span>
                          <Badge variant="secondary" className="shrink-0">
                            {getActivityLabel(activity.type)}
                          </Badge>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {activity.entityType && (
                            <span className="capitalize">{activity.entityType}</span>
                          )}
                          {activity.user && (
                            <span>
                              {activity.user.firstName} {activity.user.lastName}
                            </span>
                          )}
                          <span>{formatRelativeTime(activity.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ActivityFormDialog open={open} onClose={() => setOpen(false)} />
      </div>
    </AdminLayout>
  );
}

function ActivityFormDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'TASK',
    entityId: '',
    entityType: '',
  });
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
      };
      if (form.entityId) payload.entityId = form.entityId;
      if (form.entityType) payload.entityType = form.entityType;
      await api.post('/timeline', payload);
      toast.success('Atividade criada');
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      onClose();
      setForm({ title: '', description: '', type: 'TASK', entityId: '', entityType: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao criar atividade');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Reunião de alinhamento"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes da atividade..."
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <Select
                value={form.entityType}
                onValueChange={(v) => setForm({ ...form, entityType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ID da Entidade</Label>
              <Input
                value={form.entityId}
                onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Atividade
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
