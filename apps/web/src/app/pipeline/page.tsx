'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { EntityTable } from '@/components/entity/entity-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Plus, Loader2, List } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function PipelinePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('list');
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/pipelines', form);
      queryClient.invalidateQueries({ queryKey: ['/pipelines'] });
      setSelectedPipeline(data.id);
      setView('board');
      toast.success('Pipeline criado');
      setOpen(false);
      setForm({ name: '', description: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  if (view === 'board' && selectedPipeline) {
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
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Kanban</h1>
              <p className="text-muted-foreground">Arraste os cards entre as etapas</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setView('list');
                setSelectedPipeline(null);
              }}
            >
              <List className="h-4 w-4 mr-2" /> Ver Pipelines
            </Button>
          </div>
          <KanbanBoard pipelineId={selectedPipeline} />
        </div>
      </AdminLayout>
    );
  }

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
            <h1 className="text-2xl font-bold">Pipelines</h1>
            <p className="text-muted-foreground">Configure seus pipelines de vendas</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Pipeline
          </Button>
        </div>

        <EntityTable
          endpoint="/pipelines"
          columns={[
            {
              key: 'name',
              header: 'Nome',
              sortable: true,
              render: (p: any) => (
                <button
                  onClick={() => {
                    setSelectedPipeline(p.id);
                    setView('board');
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {p.name}
                </button>
              ),
            },
            { key: 'description', header: 'Descrição' },
            { key: 'stages', header: 'Etapas', render: (p: any) => p.stages?.length || 0 },
            { key: 'deals', header: 'Negócios', render: (p: any) => p._count?.deals || 0 },
            {
              key: 'isDefault',
              header: 'Padrão',
              render: (p: any) =>
                p.isDefault ? (
                  <Badge variant="success">Sim</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
          ]}
          searchPlaceholder="Buscar pipelines..."
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Pipeline</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Criar Pipeline
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
