'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityTable } from '@/components/entity/entity-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2, Briefcase, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function TeamsPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<any>(null);

  const stats = useQuery({
    queryKey: ['teams-stats'],
    queryFn: () => api.get('/teams').then((r) => r.data),
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
            <h1 className="text-2xl font-bold">Equipes</h1>
            <p className="text-muted-foreground">Gerencie suas equipes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Equipes</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.meta?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Membros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.data?.reduce(
                  (sum: number, t: any) => sum + (t._count?.members || 0),
                  0,
                ) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/teams"
          columns={[
            {
              key: 'name',
              header: 'Nome',
              sortable: true,
              render: (t: any) => <span className="font-medium">{t.name}</span>,
            },
            { key: 'description', header: 'Descrição' },
            {
              key: 'members',
              header: 'Membros',
              render: (t: any) => <span>{t._count?.members || 0}</span>,
            },
            {
              key: 'createdAt',
              header: 'Criado em',
              sortable: true,
              render: (t: any) =>
                new Date(t.createdAt).toLocaleDateString('pt-BR'),
            },
          ]}
          searchPlaceholder="Buscar equipes..."
          onCreate={() => {
            setEditTeam(null);
            setOpen(true);
          }}
          onEdit={(team) => {
            setEditTeam(team);
            setOpen(true);
          }}
          onDelete={async (team) => {
            if (!confirm('Tem certeza que deseja excluir esta equipe?')) return;
            try {
              await api.delete(`/teams/${team.id}`);
              toast.success('Equipe excluída');
            } catch (e: any) {
              toast.error(e.response?.data?.message || 'Erro ao excluir');
            }
          }}
        />

        <TeamFormDialog open={open} onClose={() => setOpen(false)} team={editTeam} />
      </div>
    </AdminLayout>
  );
}

function TeamFormDialog({
  open,
  onClose,
  team,
}: {
  open: boolean;
  onClose: () => void;
  team: any;
}) {
  const [form, setForm] = useState({
    name: team?.name || '',
    description: team?.description || '',
  });
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (team) {
        await api.patch(`/teams/${team.id}`, form);
        toast.success('Equipe atualizada');
      } else {
        await api.post('/teams', form);
        toast.success('Equipe criada');
      }
      queryClient.invalidateQueries({ queryKey: ['/teams'] });
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
          <DialogTitle>{team ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
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
            <Label>Descrição</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {team ? 'Salvar' : 'Criar Equipe'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
