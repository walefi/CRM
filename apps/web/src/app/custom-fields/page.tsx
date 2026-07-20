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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2, Wrench, Hash, Building2, Users, Briefcase, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'SELECT', label: 'Seleção' },
  { value: 'DATE', label: 'Data' },
  { value: 'BOOLEAN', label: 'Booleano' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'URL', label: 'URL' },
  { value: 'TEXTAREA', label: 'Texto Longo' },
  { value: 'CURRENCY', label: 'Moeda' },
];

const ENTITY_OPTIONS = [
  { value: 'lead', label: 'Leads' },
  { value: 'contact', label: 'Contatos' },
  { value: 'company', label: 'Empresas' },
  { value: 'deal', label: 'Negócios' },
  { value: 'ticket', label: 'Tickets' },
];

const ENTITY_ICONS: Record<string, any> = {
  lead: Users,
  contact: Users,
  company: Building2,
  deal: Briefcase,
  ticket: Ticket,
};

const typeColors: Record<string, string> = {
  TEXT: 'secondary',
  NUMBER: 'secondary',
  SELECT: 'default',
  DATE: 'secondary',
  BOOLEAN: 'success',
  EMAIL: 'default',
  PHONE: 'default',
  URL: 'default',
  TEXTAREA: 'secondary',
  CURRENCY: 'default',
};

export default function CustomFieldsPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editField, setEditField] = useState<any>(null);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const queryClient = useQueryClient();

  const stats = useQuery({
    queryKey: ['custom-fields-stats'],
    queryFn: () => api.get('/custom-fields').then((r) => r.data),
  });

  const entityCounts = useQuery({
    queryKey: ['custom-fields-entity-counts'],
    queryFn: async () => {
      const entities = ['lead', 'contact', 'company', 'deal', 'ticket'];
      const results = await Promise.all(
        entities.map((e) =>
          api
            .get('/custom-fields', { params: { entity: e } })
            .then((r) => ({ entity: e, count: r.data?.length || r.data?.data?.length || 0 }))
            .catch(() => ({ entity: e, count: 0 }))
        )
      );
      return results;
    },
  });

  async function handleDelete(id: string) {
    try {
      await api.delete(`/custom-fields/${id}`);
      toast.success('Campo removido');
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields-stats'] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields-entity-counts'] });
    } catch {
      toast.error('Erro ao remover campo');
    }
    setDeleteConfirm(null);
  }

  if (!user) return null;

  const totalFields =
    Array.isArray(stats.data) ? stats.data.length : stats.data?.data?.length || stats.data?.total || 0;

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
            <h1 className="text-2xl font-bold">Campos Personalizados</h1>
            <p className="text-muted-foreground">
              Gerencie campos personalizados para todas as entidades do CRM
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Campos</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFields}</div>
            </CardContent>
          </Card>
          {ENTITY_OPTIONS.map((ent) => {
            const Icon = ENTITY_ICONS[ent.value] || Hash;
            const count =
              entityCounts.data?.find((c: any) => c.entity === ent.value)?.count || 0;
            return (
              <Card key={ent.value}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{ent.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs value={entityFilter} onValueChange={setEntityFilter}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            {ENTITY_OPTIONS.map((ent) => (
              <TabsTrigger key={ent.value} value={ent.value}>
                {ent.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <EntityTable
          endpoint={entityFilter === 'all' ? '/custom-fields' : `/custom-fields?entity=${entityFilter}`}
          columns={[
            {
              key: 'name',
              header: 'Nome',
              sortable: true,
              render: (f: any) => <span className="font-medium">{f.name}</span>,
            },
            {
              key: 'type',
              header: 'Tipo',
              render: (f: any) => (
                <Badge variant={(typeColors[f.type] as any) || 'secondary'}>{f.type}</Badge>
              ),
            },
            { key: 'entity', header: 'Entidade' },
            {
              key: 'group',
              header: 'Grupo',
              render: (f: any) => f.group || <span className="text-muted-foreground">-</span>,
            },
            {
              key: 'required',
              header: 'Obrigatório',
              align: 'center',
              render: (f: any) => (
                <Badge variant={f.required ? 'destructive' : 'secondary'}>
                  {f.required ? 'Sim' : 'Não'}
                </Badge>
              ),
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (f: any) => (
                <Badge variant={f.isActive !== false ? 'success' : 'destructive'}>
                  {f.isActive !== false ? 'Ativo' : 'Inativo'}
                </Badge>
              ),
            },
            {
              key: 'order',
              header: 'Ordem',
              align: 'center',
              sortable: true,
            },
          ]}
          searchPlaceholder="Buscar campos..."
          onCreate={() => {
            setEditField(null);
            setOpen(true);
          }}
          onEdit={(field) => {
            setEditField(field);
            setOpen(true);
          }}
          onDelete={(field) => setDeleteConfirm(field)}
        />

        <CustomFieldFormDialog
          open={open}
          onClose={() => setOpen(false)}
          field={editField}
        />

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o campo <strong>{deleteConfirm?.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm?.id)}>
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function CustomFieldFormDialog({
  open,
  onClose,
  field,
}: {
  open: boolean;
  onClose: () => void;
  field: any;
}) {
  const [form, setForm] = useState({
    name: field?.name || '',
    type: field?.type || 'TEXT',
    entity: field?.entity || 'lead',
    required: field?.required || false,
    placeholder: field?.placeholder || '',
    group: field?.group || '',
    order: field?.order || 0,
    options: Array.isArray(field?.options) ? field.options.join(', ') : field?.options || '',
  });
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        type: form.type,
        entity: form.entity,
        required: form.required,
        placeholder: form.placeholder || undefined,
        group: form.group || undefined,
        order: Number(form.order) || 0,
      };
      if (form.type === 'SELECT' && form.options) {
        payload.options = form.options
          .split(',')
          .map((o: string) => o.trim())
          .filter(Boolean);
      }
      if (field) {
        await api.patch(`/custom-fields/${field.id}`, payload);
        toast.success('Campo atualizado');
      } else {
        await api.post('/custom-fields', payload);
        toast.success('Campo criado');
      }
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields-stats'] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields-entity-counts'] });
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{field ? 'Editar Campo' : 'Novo Campo Personalizado'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: CPF, Setor, Nível de Prioridade"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entidade *</Label>
              <Select value={form.entity} onValueChange={(v) => setForm({ ...form, entity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Input
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                placeholder="Ex: Dados Pessoais"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={form.placeholder}
              onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
              placeholder="Texto de exemplo no campo"
            />
          </div>

          {form.type === 'SELECT' && (
            <div className="space-y-2">
              <Label>Opções (separadas por vírgula)</Label>
              <Input
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                placeholder="Opção 1, Opção 2, Opção 3"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={form.required}
              onChange={(e) => setForm({ ...form, required: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="required" className="cursor-pointer">
              Campo obrigatório
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {field ? 'Salvar' : 'Criar Campo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
