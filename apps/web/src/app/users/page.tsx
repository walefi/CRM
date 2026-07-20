'use client';

import { useState } from 'react';
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
import { Users, Shield, UserCheck, Clock, Loader2, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Gerente',
  user: 'Usuário',
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const stats = useQuery({
    queryKey: ['users-stats'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { limit: 1 } });
      return data;
    },
  });

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteUser.id}`);
      toast.success('Usuário removido');
      queryClient.invalidateQueries({ queryKey: ['/users'] });
      setDeleteUser(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao remover usuário');
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  const totalUsers = stats.data?.total || 0;

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
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Convidar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.items?.filter((u: any) => u.role === 'admin').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.items?.filter((u: any) => u.status === 'ACTIVE').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data?.items?.filter((u: any) => u.status === 'INACTIVE').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/users"
          columns={[
            {
              key: 'firstName',
              header: 'Nome',
              sortable: true,
              render: (u: any) => (
                <span className="font-medium">
                  {u.firstName} {u.lastName}
                </span>
              ),
            },
            { key: 'email', header: 'Email', sortable: true },
            { key: 'phone', header: 'Telefone' },
            {
              key: 'role',
              header: 'Cargo',
              render: (u: any) => roleLabels[u.role] || u.role || '—',
            },
            {
              key: 'status',
              header: 'Status',
              render: (u: any) => (
                <Badge variant={statusColors[u.status] || 'secondary'}>
                  {u.status === 'ACTIVE' ? 'Ativo' : u.status === 'INACTIVE' ? 'Inativo' : u.status === 'SUSPENDED' ? 'Suspenso' : u.status}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Criado em',
              sortable: true,
              render: (u: any) =>
                u.createdAt
                  ? new Date(u.createdAt).toLocaleDateString('pt-BR')
                  : '—',
            },
          ]}
          searchPlaceholder="Buscar usuários..."
          onCreate={() => {
            setEditUser(null);
            setOpen(true);
          }}
          onEdit={(u) => {
            setEditUser(u);
            setOpen(true);
          }}
          onDelete={(u) => setDeleteUser(u)}
        />

        <UserFormDialog open={open} onClose={() => setOpen(false)} user={editUser} />

        <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

        <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o usuário{' '}
              <strong>
                {deleteUser?.firstName} {deleteUser?.lastName}
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteUser(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function UserFormDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: any;
}) {
  const [form, setForm] = useState({
    email: user?.email || '',
    password: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    title: user?.title || '',
    phone: user?.phone || '',
    role: user?.role || 'user',
    status: user?.status || 'ACTIVE',
    teamId: user?.teamId || '',
    departmentId: user?.departmentId || '',
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) {
        const updateData: Record<string, any> = {
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          status: form.status,
        };
        if (form.title) updateData.title = form.title;
        if (form.phone) updateData.phone = form.phone;
        if (form.teamId) updateData.teamId = form.teamId;
        if (form.departmentId) updateData.departmentId = form.departmentId;
        await api.patch(`/users/${user.id}`, updateData);
        toast.success('Usuário atualizado');
      } else {
        const createData: Record<string, any> = {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          status: form.status,
        };
        if (form.title) createData.title = form.title;
        if (form.phone) createData.phone = form.phone;
        if (form.teamId) createData.teamId = form.teamId;
        if (form.departmentId) createData.departmentId = form.departmentId;
        await api.post('/users', createData);
        toast.success('Usuário criado');
      }
      queryClient.invalidateQueries({ queryKey: ['/users'] });
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
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
            <Label>Email *</Label>
            <Input
              type="email"
              required
              disabled={!!user}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          {!user && (
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {user ? 'Salvar' : 'Criar Usuário'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users/invite', form);
      toast.success('Convite enviado');
      queryClient.invalidateQueries({ queryKey: ['/users'] });
      onClose();
      setForm({ email: '', firstName: '', lastName: '', role: 'user' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
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
            <Label>Email *</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar Convite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
