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
import { Loader2, Shield, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function PermissionsPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);

  const stats = useQuery({
    queryKey: ['roles-stats'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions-list'],
    queryFn: () => api.get('/permissions').then((r) => r.data),
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
            <h1 className="text-2xl font-bold">Permissões</h1>
            <p className="text-muted-foreground">Gerencie funções e permissões</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Funções</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.meta?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Permissões</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {permissionsQuery.data?.meta?.total ||
                  permissionsQuery.data?.data?.length ||
                  0}
              </div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/roles"
          columns={[
            {
              key: 'name',
              header: 'Nome',
              sortable: true,
              render: (r: any) => <span className="font-medium">{r.name}</span>,
            },
            { key: 'description', header: 'Descrição' },
            {
              key: 'permissions',
              header: 'Permissões',
              render: (r: any) => (
                <Badge variant="secondary">
                  {r.permissions?.length || 0} permissão(ões)
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Criado em',
              sortable: true,
              render: (r: any) =>
                new Date(r.createdAt).toLocaleDateString('pt-BR'),
            },
          ]}
          searchPlaceholder="Buscar funções..."
          onCreate={() => {
            setEditRole(null);
            setOpen(true);
          }}
          onEdit={(role) => {
            setEditRole(role);
            setOpen(true);
          }}
          onDelete={async (role) => {
            if (!confirm('Tem certeza que deseja excluir esta função?')) return;
            try {
              await api.delete(`/roles/${role.id}`);
              toast.success('Função excluída');
            } catch (e: any) {
              toast.error(e.response?.data?.message || 'Erro ao excluir');
            }
          }}
        />

        <RoleFormDialog
          open={open}
          onClose={() => setOpen(false)}
          role={editRole}
          allPermissions={permissionsQuery.data?.data || []}
        />
      </div>
    </AdminLayout>
  );
}

function RoleFormDialog({
  open,
  onClose,
  role,
  allPermissions,
}: {
  open: boolean;
  onClose: () => void;
  role: any;
  allPermissions: any[];
}) {
  const [form, setForm] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || [],
  });
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const grouped = allPermissions.reduce<Record<string, any[]>>((acc, p) => {
    const mod = p.module || 'Geral';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  function togglePermission(permName: string) {
    setForm((prev) => {
      const exists = prev.permissions.includes(permName);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p: string) => p !== permName)
          : [...prev.permissions, permName],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (role) {
        await api.patch(`/roles/${role.id}`, form);
        toast.success('Função atualizada');
      } else {
        await api.post('/roles', form);
        toast.success('Função criada');
      }
      queryClient.invalidateQueries({ queryKey: ['/roles'] });
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? 'Editar Função' : 'Nova Função'}</DialogTitle>
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
          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="space-y-4 max-h-[300px] overflow-y-auto border rounded-md p-4">
              {Object.entries(grouped).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {module}
                  </p>
                  <div className="space-y-1">
                    {perms.map((p: any) => (
                      <label
                        key={p.id || p.name}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={form.permissions.includes(p.name)}
                          onChange={() => togglePermission(p.name)}
                        />
                        <span>{p.name}</span>
                        {p.description && (
                          <span className="text-muted-foreground text-xs">
                            — {p.description}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma permissão disponível.
                </p>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {role ? 'Salvar' : 'Criar Função'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
