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
import { Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);

  const stats = useQuery({
    queryKey: ['departments-stats'],
    queryFn: () => api.get('/departments').then((r) => r.data),
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
            <h1 className="text-2xl font-bold">Departamentos</h1>
            <p className="text-muted-foreground">Gerencie seus departamentos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Departamentos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.meta?.total || 0}</div>
            </CardContent>
          </Card>
        </div>

        <EntityTable
          endpoint="/departments"
          columns={[
            {
              key: 'name',
              header: 'Nome',
              sortable: true,
              render: (d: any) => <span className="font-medium">{d.name}</span>,
            },
            { key: 'description', header: 'Descrição' },
            {
              key: 'createdAt',
              header: 'Criado em',
              sortable: true,
              render: (d: any) =>
                new Date(d.createdAt).toLocaleDateString('pt-BR'),
            },
          ]}
          searchPlaceholder="Buscar departamentos..."
          onCreate={() => {
            setEditDept(null);
            setOpen(true);
          }}
          onEdit={(dept) => {
            setEditDept(dept);
            setOpen(true);
          }}
          onDelete={async (dept) => {
            if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
            try {
              await api.delete(`/departments/${dept.id}`);
              toast.success('Departamento excluído');
            } catch (e: any) {
              toast.error(e.response?.data?.message || 'Erro ao excluir');
            }
          }}
        />

        <DepartmentFormDialog
          open={open}
          onClose={() => setOpen(false)}
          department={editDept}
        />
      </div>
    </AdminLayout>
  );
}

function DepartmentFormDialog({
  open,
  onClose,
  department,
}: {
  open: boolean;
  onClose: () => void;
  department: any;
}) {
  const [form, setForm] = useState({
    name: department?.name || '',
    description: department?.description || '',
  });
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (department) {
        await api.patch(`/departments/${department.id}`, form);
        toast.success('Departamento atualizado');
      } else {
        await api.post('/departments', form);
        toast.success('Departamento criado');
      }
      queryClient.invalidateQueries({ queryKey: ['/departments'] });
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
          <DialogTitle>
            {department ? 'Editar Departamento' : 'Novo Departamento'}
          </DialogTitle>
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
            {department ? 'Salvar' : 'Criar Departamento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
