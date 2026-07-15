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
import { Users, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function ContactsPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const stats = useQuery({
    queryKey: ['contacts-stats'],
    queryFn: () => api.get('/contacts/stats').then((r) => r.data),
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
            <h1 className="text-2xl font-bold">Contatos</h1>
            <p className="text-muted-foreground">Gerencie seus contatos e relacionamentos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Contatos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Empresas Relacionadas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.byCompany?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Módulo</CardTitle>
              <Users className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Operacional</div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/contacts"
          columns={[
            {
              key: 'firstName',
              header: 'Nome',
              sortable: true,
              render: (c: any) => (
                <span className="font-medium">
                  {c.firstName} {c.lastName}
                </span>
              ),
            },
            { key: 'email', header: 'Email' },
            { key: 'phone', header: 'Telefone' },
            { key: 'company', header: 'Empresa', render: (c: any) => c.company?.name || '—' },
            { key: 'position', header: 'Cargo' },
          ]}
          searchPlaceholder="Buscar contatos..."
          onCreate={() => {
            setEditContact(null);
            setOpen(true);
          }}
          onEdit={(c) => {
            setEditContact(c);
            setOpen(true);
          }}
        />

        <ContactFormDialog open={open} onClose={() => setOpen(false)} contact={editContact} />
      </div>
    </AdminLayout>
  );
}

function ContactFormDialog({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact: any;
}) {
  const [form, setForm] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    position: contact?.position || '',
    companyId: contact?.companyId || '',
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (contact) {
        await api.patch(`/contacts/${contact.id}`, form);
        toast.success('Contato atualizado');
      } else {
        await api.post('/contacts', form);
        toast.success('Contato criado');
      }
      queryClient.invalidateQueries({ queryKey: ['/contacts'] });
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
          <DialogTitle>{contact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
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
            <Label>Cargo</Label>
            <Input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {contact ? 'Salvar' : 'Criar Contato'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
