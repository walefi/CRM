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
import { Building2, DollarSign, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function CompaniesPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const stats = useQuery({
    queryKey: ['companies-stats'],
    queryFn: () => api.get('/companies').then((r) => ({ total: r.data?.data?.length || 0 })),
  });
  const contactsStats = useQuery({
    queryKey: ['contacts-stats'],
    queryFn: () => api.get('/contacts/stats').then((r) => r.data),
  });
  const dealsStats = useQuery({
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
            <h1 className="text-2xl font-bold">Empresas</h1>
            <p className="text-muted-foreground">Gerencie empresas e seus relacionamentos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Contatos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contactsStats.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Negócios</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dealsStats.data?.total || 0}</div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/companies"
          columns={[
            {
              key: 'name',
              header: 'Nome',
              sortable: true,
              render: (c: any) => <span className="font-medium">{c.name}</span>,
            },
            { key: 'legalName', header: 'Razão Social' },
            { key: 'cnpj', header: 'CNPJ' },
            { key: 'email', header: 'Email' },
            { key: 'phone', header: 'Telefone' },
            { key: 'industry', header: 'Segmento' },
          ]}
          searchPlaceholder="Buscar empresas..."
          onCreate={() => {
            setEditCompany(null);
            setOpen(true);
          }}
          onEdit={(c) => {
            setEditCompany(c);
            setOpen(true);
          }}
        />

        <CompanyFormDialog open={open} onClose={() => setOpen(false)} company={editCompany} />
      </div>
    </AdminLayout>
  );
}

function CompanyFormDialog({
  open,
  onClose,
  company,
}: {
  open: boolean;
  onClose: () => void;
  company: any;
}) {
  const [form, setForm] = useState({
    name: company?.name || '',
    legalName: company?.legalName || '',
    cnpj: company?.cnpj || '',
    email: company?.email || '',
    phone: company?.phone || '',
    website: company?.website || '',
    industry: company?.industry || '',
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (company) {
        await api.patch(`/companies/${company.id}`, form);
        toast.success('Empresa atualizada');
      } else {
        await api.post('/companies', form);
        toast.success('Empresa criada');
      }
      queryClient.invalidateQueries({ queryKey: ['/companies'] });
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
          <DialogTitle>{company ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
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
            <Label>Razão Social</Label>
            <Input
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
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
            <Label>Website</Label>
            <Input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Segmento</Label>
            <Input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {company ? 'Salvar' : 'Criar Empresa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
