'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityTable } from '@/components/entity/entity-table';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2, Target, TrendingUp, Users, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
  NEW: 'secondary',
  CONTACTED: 'default',
  QUALIFIED: 'success',
  UNQUALIFIED: 'destructive',
  CONVERTED: 'default',
  LOST: 'destructive',
};

export default function LeadsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const stats = useQuery({
    queryKey: ['leads-stats'],
    queryFn: () => api.get('/leads/stats').then((r) => r.data),
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
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">Gerencie seus leads e oportunidades</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.byStatus?.find((s: any) => s.status === 'QUALIFIED')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Novos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.byStatus?.find((s: any) => s.status === 'NEW')?._count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
              <Phone className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.byStatus?.find((s: any) => s.status === 'CONVERTED')?._count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/leads"
          columns={[
            {
              key: 'firstName',
              header: 'Nome',
              sortable: true,
              render: (l: any) => (
                <button
                  className="font-medium text-primary hover:underline text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/leads/${l.id}`);
                  }}
                >
                  {l.firstName} {l.lastName}
                </button>
              ),
            },
            { key: 'email', header: 'Email' },
            { key: 'phone', header: 'Telefone' },
            { key: 'companyName', header: 'Empresa' },
            { key: 'source', header: 'Origem' },
            {
              key: 'status',
              header: 'Status',
              render: (l: any) => (
                <Badge variant={(statusColors[l.status] as any) || 'secondary'}>{l.status}</Badge>
              ),
            },
            {
              key: 'owner',
              header: 'Responsável',
              render: (l: any) =>
                l.owner ? (
                  <span className="text-sm">
                    {l.owner.firstName} {l.owner.lastName}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Não atribuído</span>
                ),
            },
          ]}
          searchPlaceholder="Buscar leads..."
          onCreate={() => {
            setEditLead(null);
            setOpen(true);
          }}
          onEdit={(lead) => {
            setEditLead(lead);
            setOpen(true);
          }}
        />

        <LeadFormDialog open={open} onClose={() => setOpen(false)} lead={editLead} />
      </div>
    </AdminLayout>
  );
}

function LeadFormDialog({
  open,
  onClose,
  lead,
}: {
  open: boolean;
  onClose: () => void;
  lead: any;
}) {
  const [form, setForm] = useState({
    firstName: lead?.firstName || '',
    lastName: lead?.lastName || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    companyName: lead?.companyName || '',
    source: lead?.source || 'OTHER',
    description: lead?.description || '',
  });
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (lead) {
        await api.patch(`/leads/${lead.id}`, form);
        toast.success('Lead atualizado');
      } else {
        await api.post('/leads', form);
        toast.success('Lead criado');
      }
      queryClient.invalidateQueries({ queryKey: ['/leads'] });
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
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sobrenome *</Label>
              <Input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEBSITE">Website</SelectItem>
                <SelectItem value="REFERRAL">Indicação</SelectItem>
                <SelectItem value="SOCIAL_MEDIA">Redes Sociais</SelectItem>
                <SelectItem value="EMAIL_MARKETING">Email Marketing</SelectItem>
                <SelectItem value="OTHER">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {lead ? 'Salvar' : 'Criar Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
