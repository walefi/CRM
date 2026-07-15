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
import { Package, DollarSign, Layers, Loader2, Plus, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function ProductsPage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const stats = useQuery({
    queryKey: ['products-stats'],
    queryFn: () => api.get('/products/stats').then((r) => r.data),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data?.data || r.data || []),
  });

  if (!user) return null;

  return (
    <AdminLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Catálogo de Produtos</h1>
            <p className="text-muted-foreground">Produtos, serviços e categorias</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCatOpen(true)}>
              <Tag className="h-4 w-4 mr-1" /> Categorias
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditProduct(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Produto
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Total</CardTitle>
              <Package className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Ativos</CardTitle>
              <Package className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.active || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Categorias</CardTitle>
              <Layers className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.data?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Módulo</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Operacional</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <div className="w-56 shrink-0">
            <div className="rounded-lg border">
              <div className="p-3 border-b bg-muted/50 font-semibold text-sm">Categorias</div>
              <div className="p-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted ${!selectedCategory ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  Todas
                </button>
                {(categories.data || []).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted flex justify-between ${selectedCategory === c.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
                  >
                    {c.name}
                    <Badge variant="secondary" className="text-xs">
                      {c._count?.products || 0}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <EntityTable
              endpoint={`/products${selectedCategory ? `?categoryId=${selectedCategory}` : ''}`}
              columns={[
                {
                  key: 'name',
                  header: 'Nome',
                  sortable: true,
                  render: (p: any) => <span className="font-medium">{p.name}</span>,
                },
                { key: 'sku', header: 'SKU' },
                {
                  key: 'price',
                  header: 'Preço',
                  render: (p: any) =>
                    p.price
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(p.price)
                      : '—',
                },
                {
                  key: 'category',
                  header: 'Categoria',
                  render: (p: any) => p.category?.name || '—',
                },
                {
                  key: 'isActive',
                  header: 'Status',
                  render: (p: any) =>
                    p.isActive ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    ),
                },
              ]}
              onCreate={() => {
                setEditProduct(null);
                setOpen(true);
              }}
              onEdit={(p) => {
                setEditProduct(p);
                setOpen(true);
              }}
            />
          </div>
        </div>

        <ProductFormDialog
          open={open}
          onClose={() => setOpen(false)}
          product={editProduct}
          categories={categories.data || []}
        />
        <CategoryDialog open={catOpen} onClose={() => setCatOpen(false)} />
      </div>
    </AdminLayout>
  );
}

function ProductFormDialog({
  open,
  onClose,
  product,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  product: any;
  categories: any[];
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    price: product?.price || '',
    description: product?.description || '',
    categoryId: product?.categoryId || '',
  });
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (product) {
        await api.patch(`/products/${product.id}`, form);
        toast.success('Atualizado');
      } else {
        await api.post('/products', form);
        toast.success('Criado');
      }
      qc.invalidateQueries({ queryKey: ['/products'] });
      qc.invalidateQueries({ queryKey: ['products-stats'] });
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
          <DialogTitle>{product ? 'Editar' : 'Novo'} Produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preço</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Nenhuma</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const cats = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api.get('/categories').then((r) => r.data?.data || r.data || []),
    enabled: open,
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/categories', {
        ...form,
        slug: form.name.toLowerCase().replace(/\s+/g, '-'),
      });
      toast.success('Categoria criada');
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories-list'] });
      setForm({ name: '', slug: '', description: '' });
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
          <DialogTitle>Categorias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(cats.data || []).map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted"
              >
                <span>{c.name}</span>
                <Badge variant="secondary">{c._count?.products || 0}</Badge>
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-2 border-t pt-4">
            <div className="space-y-2">
              <Label>Nova Categoria *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <Button type="submit" size="sm" disabled={loading}>
              Adicionar Categoria
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
