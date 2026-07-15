'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityTable } from '@/components/entity/entity-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
  OPEN: 'secondary',
  WON: 'success',
  LOST: 'destructive',
  ARCHIVED: 'outline',
};

export default function DealsPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<any>(null);
  const stats = useQuery({
    queryKey: ['deals-stats'],
    queryFn: () => api.get('/deals/stats').then((r) => r.data),
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
            <h1 className="text-2xl font-bold">Negócios</h1>
            <p className="text-muted-foreground">
              Gerencie suas oportunidades e pipeline de vendas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Negócios</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ganhos</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.byStatus?.find((s: any) => s.status === 'WON')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  stats.data?.totalValue || 0,
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Abertos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.byStatus?.find((s: any) => s.status === 'OPEN')?._count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/deals"
          columns={[
            {
              key: 'title',
              header: 'Título',
              sortable: true,
              render: (d: any) => <span className="font-medium">{d.title}</span>,
            },
            { key: 'company', header: 'Empresa', render: (d: any) => d.company?.name || '—' },
            {
              key: 'contact',
              header: 'Contato',
              render: (d: any) =>
                d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : '—',
            },
            {
              key: 'value',
              header: 'Valor',
              render: (d: any) =>
                d.value
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      d.value,
                    )
                  : '—',
            },
            {
              key: 'stage',
              header: 'Etapa',
              render: (d: any) =>
                d.stage ? (
                  <Badge style={{ backgroundColor: d.stage.color }} variant="outline">
                    {d.stage.name}
                  </Badge>
                ) : (
                  '—'
                ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (d: any) => (
                <Badge variant={(statusColors[d.status] as any) || 'secondary'}>{d.status}</Badge>
              ),
            },
          ]}
          searchPlaceholder="Buscar negócios..."
          onCreate={() => {
            setEditDeal(null);
            setOpen(true);
          }}
          onEdit={(deal) => {
            setEditDeal(deal);
            setOpen(true);
          }}
        />

        <DealFormDialog open={open} onClose={() => setOpen(false)} deal={editDeal} />
      </div>
    </AdminLayout>
  );
}

function DealFormDialog({
  open,
  onClose,
  deal,
}: {
  open: boolean;
  onClose: () => void;
  deal: any;
}) {
  const [form, setForm] = useState({
    title: deal?.title || '',
    value: deal?.value || '',
    description: deal?.description || '',
    pipelineId: deal?.pipelineId || '',
    stageId: deal?.stageId || '',
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (deal) {
        await api.patch(`/deals/${deal.id}`, form);
        toast.success('Negócio atualizado');
      } else {
        await api.post('/deals', form);
        toast.success('Negócio criado');
      }
      queryClient.invalidateQueries({ queryKey: ['/deals'] });
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
          <DialogTitle>{deal ? 'Editar Negócio' : 'Novo Negócio'}</DialogTitle>
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
            <Label>Valor</Label>
            <Input
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {deal ? 'Salvar' : 'Criar Negócio'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
