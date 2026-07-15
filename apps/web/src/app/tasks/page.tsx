'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityTable } from '@/components/entity/entity-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { CheckSquare, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const priorityColors: Record<string, string> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};
const statusColors: Record<string, string> = {
  TODO: 'secondary',
  IN_PROGRESS: 'default',
  DONE: 'success',
  CANCELLED: 'destructive',
};

export default function TasksPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const stats = useQuery({
    queryKey: ['tasks-stats'],
    queryFn: () => api.get('/tasks/stats').then((r) => r.data),
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
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-muted-foreground">Gerencie tarefas e atividades</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckSquare className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.done || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.overdue || 0}</div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/tasks"
          columns={[
            {
              key: 'title',
              header: 'Título',
              sortable: true,
              render: (t: any) => <span className="font-medium">{t.title}</span>,
            },
            {
              key: 'assignee',
              header: 'Responsável',
              render: (t: any) =>
                t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : '—',
            },
            {
              key: 'priority',
              header: 'Prioridade',
              render: (t: any) => (
                <Badge variant={(priorityColors[t.priority] as any) || 'secondary'}>
                  {t.priority}
                </Badge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (t: any) => (
                <Badge variant={(statusColors[t.status] as any) || 'secondary'}>{t.status}</Badge>
              ),
            },
            {
              key: 'dueDate',
              header: 'Prazo',
              render: (t: any) =>
                t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '—',
            },
          ]}
          searchPlaceholder="Buscar tarefas..."
          onCreate={() => {
            setEditTask(null);
            setOpen(true);
          }}
          onEdit={(t) => {
            setEditTask(t);
            setOpen(true);
          }}
        />

        <TaskFormDialog open={open} onClose={() => setOpen(false)} task={editTask} />
      </div>
    </AdminLayout>
  );
}

function TaskFormDialog({
  open,
  onClose,
  task,
}: {
  open: boolean;
  onClose: () => void;
  task: any;
}) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'MEDIUM',
    status: task?.status || 'TODO',
    dueDate: task?.dueDate?.split('T')[0] || '',
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (task) {
        await api.patch(`/tasks/${task.id}`, form);
        toast.success('Tarefa atualizada');
      } else {
        await api.post('/tasks', form);
        toast.success('Tarefa criada');
      }
      queryClient.invalidateQueries({ queryKey: ['/tasks'] });
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {task ? 'Salvar' : 'Criar Tarefa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
