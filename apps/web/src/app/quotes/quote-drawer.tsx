'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Plus,
  Trash2,
  Clock,
  History,
  Send,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface QuoteDrawerProps {
  open: boolean;
  onClose: () => void;
  quote: any | null;
  onSuccess: () => void;
}

export function QuoteDrawer({ open, onClose, quote, onSuccess }: QuoteDrawerProps) {
  const isNew = !quote;

  const [form, setForm] = useState({
    title: '',
    description: '',
    companyId: '',
    contactId: '',
    dealId: '',
    ownerId: '',
    currency: 'BRL',
    paymentTerms: '',
    commercialConditions: '',
    internalNotes: '',
    customerNotes: '',
    validUntil: '',
    tags: '',
    discountPercent: 0,
    shipping: 0,
    taxes: 0,
  });

  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'preview' | 'versions'>('details');

  useEffect(() => {
    if (quote) {
      setForm({
        title: quote.title || '',
        description: quote.description || '',
        companyId: quote.companyId || '',
        contactId: quote.contactId || '',
        dealId: quote.dealId || '',
        ownerId: quote.ownerId || '',
        currency: quote.currency || 'BRL',
        paymentTerms: quote.paymentTerms || '',
        commercialConditions: quote.commercialConditions || '',
        internalNotes: quote.internalNotes || '',
        customerNotes: quote.customerNotes || '',
        validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
        tags: quote.tags?.join(', ') || '',
        discountPercent: Number(quote.discountPercent) || 0,
        shipping: Number(quote.shipping) || 0,
        taxes: Number(quote.taxes) || 0,
      });
      setItems(quote.items || []);
    } else {
      setForm({
        title: '',
        description: '',
        companyId: '',
        contactId: '',
        dealId: '',
        ownerId: '',
        currency: 'BRL',
        paymentTerms: '',
        commercialConditions: '',
        internalNotes: '',
        customerNotes: '',
        validUntil: '',
        tags: '',
        discountPercent: 0,
        shipping: 0,
        taxes: 0,
      });
      setItems([]);
      setActiveTab('details');
    }
  }, [quote, open]);

  const { data: companies } = useQuery({
    queryKey: ['companies-select'],
    queryFn: async () => {
      const { data } = await api.get('/companies', { params: { limit: 100 } });
      return data.data;
    },
    enabled: open,
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts-select'],
    queryFn: async () => {
      const { data } = await api.get('/contacts', { params: { limit: 100 } });
      return data.data;
    },
    enabled: open,
  });

  const { data: deals } = useQuery({
    queryKey: ['deals-select'],
    queryFn: async () => {
      const { data } = await api.get('/deals', { params: { limit: 100 } });
      return data.data;
    },
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ['products-select'],
    queryFn: async () => {
      const { data } = await api.get('/products', { params: { limit: 200 } });
      return data.data;
    },
    enabled: open,
  });

  const { data: versions } = useQuery({
    queryKey: ['quote-versions', quote?.id],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${quote.id}/versions`);
      return data;
    },
    enabled: !!quote?.id && activeTab === 'versions',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/quotes', data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/quotes/${id}`, data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  function handleSubmit() {
    const payload: any = {
      ...form,
      tags: form.tags
        ? form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      items: items.map((item) => ({
        description: item.description,
        productId: item.productId,
        type: item.type || 'product',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0),
        discountPercent: Number(item.discountPercent || 0),
        taxes: Number(item.taxes || 0),
        taxPercent: Number(item.taxPercent || 0),
        sortOrder: item.sortOrder,
      })),
    };

    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: quote.id, data: payload });
    }
  }

  function addItem(product?: any) {
    const newItem = {
      id: `temp-${Date.now()}`,
      description: product?.name || '',
      productId: product?.id || null,
      product: product || null,
      type: 'product',
      quantity: 1,
      unitPrice: Number(product?.price) || 0,
      discount: 0,
      discountPercent: 0,
      taxes: 0,
      taxPercent: 0,
      subtotal: Number(product?.price) || 0,
      total: Number(product?.price) || 0,
      sortOrder: items.length,
    };
    setItems([...items, newItem]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: any) {
    const updated = [...items];
    const item = { ...updated[idx], [field]: value };

    const qty = Number(item.quantity) || 1;
    const up = Number(item.unitPrice) || 0;
    const st = qty * up;
    const d =
      Number(item.discount) ||
      (item.discountPercent ? (st * Number(item.discountPercent)) / 100 : 0);
    const sd = st - d;
    const tx = Number(item.taxes) || (item.taxPercent ? (sd * Number(item.taxPercent)) / 100 : 0);

    item.subtotal = st;
    item.total = sd + tx;
    updated[idx] = item;
    setItems(updated);
  }

  const itemSubtotal = items.reduce(
    (sum, i) => sum + Number(i.quantity || 1) * Number(i.unitPrice || 0),
    0,
  );
  const itemDiscount = items.reduce((sum, i) => sum + Number(i.discount || 0), 0);
  const itemTaxes = items.reduce((sum, i) => sum + Number(i.taxes || 0), 0);
  const total =
    itemSubtotal -
    itemDiscount +
    itemTaxes +
    (Number(form.shipping) || 0) +
    (Number(form.taxes) || 0);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="ml-auto w-full max-w-2xl bg-background border-l shadow-2xl overflow-y-auto"
        >
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {isNew ? 'Nova Proposta' : 'Editar Proposta'}
              </h2>
              {quote && <p className="text-sm text-muted-foreground">{quote.number}</p>}
            </div>
            <div className="flex items-center gap-2">
              {!isNew && (
                <div className="flex rounded-md border mr-2">
                  {(['details', 'preview', 'versions'] as const).map((tab) => (
                    <button
                      key={tab}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        activeTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                        tab === 'details' && 'rounded-l-md',
                        tab === 'versions' && 'rounded-r-md',
                      )}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'details' && 'Detalhes'}
                      {tab === 'preview' && 'Preview'}
                      {tab === 'versions' && 'Historico'}
                    </button>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {!isNew && activeTab === 'preview' ? (
              <QuotePreview quote={quote} items={items} />
            ) : !isNew && activeTab === 'versions' ? (
              <VersionHistory versions={versions || []} quoteId={quote.id} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Titulo da Proposta</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Ex: Proposta Comercial 001/2024"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Validade</label>
                    <Input
                      type="date"
                      value={form.validUntil}
                      onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Empresa</label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.companyId}
                      onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    >
                      <option value="">Selecionar...</option>
                      {companies?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contato</label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.contactId}
                      onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                    >
                      <option value="">Selecionar...</option>
                      {contacts?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Negocio</label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.dealId}
                      onChange={(e) => setForm({ ...form, dealId: e.target.value })}
                    >
                      <option value="">Selecionar...</option>
                      {deals?.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {quote && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Status</label>
                    <div>
                      <Badge className="text-xs">
                        {quote.status === 'DRAFT' ? 'Rascunho' : quote.status}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Descricao</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descricao da proposta..."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Itens da Proposta</label>
                    <div className="flex gap-2">
                      {products && products.length > 0 && (
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const product = products.find((p: any) => p.id === e.target.value);
                              addItem(product);
                            }
                          }}
                        >
                          <option value="">+ Adicionar produto...</option>
                          {products.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <Button variant="outline" size="sm" onClick={() => addItem()}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Item manual
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Item {idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-5">
                            <Input
                              className="text-sm h-8"
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              placeholder="Descricao"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              className="text-sm h-8"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              placeholder="Qtd"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              className="text-sm h-8"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                              placeholder="Preco"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              className="text-sm h-8"
                              value={item.discountPercent}
                              onChange={(e) => updateItem(idx, 'discountPercent', e.target.value)}
                              placeholder="Desc%"
                            />
                          </div>
                          <div className="col-span-1 flex items-center justify-end text-sm font-medium">
                            {formatCurrency(Number(item.total || item.subtotal || 0))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Desconto Adicional %</label>
                    <Input
                      type="number"
                      className="h-8"
                      value={form.discountPercent}
                      onChange={(e) =>
                        setForm({ ...form, discountPercent: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Impostos</label>
                    <Input
                      type="number"
                      className="h-8"
                      value={form.taxes}
                      onChange={(e) => setForm({ ...form, taxes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Frete</label>
                    <Input
                      type="number"
                      className="h-8"
                      value={form.shipping}
                      onChange={(e) => setForm({ ...form, shipping: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-3 flex items-center justify-between pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      Subtotal: {formatCurrency(itemSubtotal)} | Desconto:{' '}
                      {formatCurrency(itemDiscount)} | Impostos: {formatCurrency(itemTaxes)}
                    </div>
                    <div className="text-lg font-bold">Total: {formatCurrency(total)}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Condicoes de Pagamento</label>
                  <Input
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    placeholder="Ex: 30/60/90 dias, a vista com 5% desconto..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Condicoes Comerciais</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.commercialConditions}
                    onChange={(e) => setForm({ ...form, commercialConditions: e.target.value })}
                    placeholder="Condicoes comerciais adicionais..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Observacoes Internas</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.internalNotes}
                    onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                    placeholder="Observacoes para uso interno..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Observacoes para o Cliente</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.customerNotes}
                    onChange={(e) => setForm({ ...form, customerNotes: e.target.value })}
                    placeholder="Observacoes que serao exibidas ao cliente..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="Separadas por virgula..."
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    {!isNew && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            /* export */
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" /> Exportar
                        </Button>
                        {quote.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await api.post(`/quotes/${quote.id}/send`);
                                toast.success('Proposta enviada com sucesso');
                                onSuccess();
                              } catch (e: any) {
                                toast.error(e.response?.data?.message || 'Erro ao enviar proposta');
                              }
                            }}
                          >
                            <Send className="h-4 w-4 mr-1" /> Enviar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isNew ? 'Criar Proposta' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function QuotePreview({ quote, items }: { quote: any; items: any[] }) {
  const subtotal = items.reduce(
    (s, i) => s + Number(i.quantity || 1) * Number(i.unitPrice || 0),
    0,
  );
  const discount = items.reduce((s, i) => s + Number(i.discount || 0), 0);
  const taxes = items.reduce((s, i) => s + Number(i.taxes || 0), 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-gray-950 rounded-lg border p-8 shadow-sm">
      <div className="text-center border-b pb-6">
        <h2 className="text-2xl font-bold">{quote.title || 'Proposta Comercial'}</h2>
        <p className="text-muted-foreground mt-1">{quote.number}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div className="space-y-2">
          <p className="font-medium">Dados do Cliente</p>
          {quote.company && <p>{quote.company.name}</p>}
          {quote.contact && (
            <p>
              {quote.contact.firstName} {quote.contact.lastName}
            </p>
          )}
        </div>
        <div className="space-y-2 text-right">
          <p className="font-medium">Detalhes</p>
          <p className="text-muted-foreground">
            Data: {quote.issuedAt ? formatDate(quote.issuedAt) : '-'}
          </p>
          <p className="text-muted-foreground">
            Validade: {quote.validUntil ? formatDate(quote.validUntil) : '-'}
          </p>
        </div>
      </div>

      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-medium">Item</th>
              <th className="py-2 text-center font-medium">Qtd</th>
              <th className="py-2 text-right font-medium">Unitario</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Nenhum item
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(item.unitPrice || 0))}</td>
                  <td className="py-2 text-right font-medium">
                    {formatCurrency(Number(item.total || item.subtotal || 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t pt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Desconto</span>
          <span className="text-red-600">-{formatCurrency(discount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Impostos</span>
          <span>{formatCurrency(taxes)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(Number(quote.totalAmount || 0))}</span>
        </div>
      </div>

      {quote.paymentTerms && (
        <div className="text-sm">
          <p className="font-medium">Condicoes de Pagamento</p>
          <p className="text-muted-foreground">{quote.paymentTerms}</p>
        </div>
      )}

      {quote.customerNotes && (
        <div className="text-sm">
          <p className="font-medium">Observacoes</p>
          <p className="text-muted-foreground">{quote.customerNotes}</p>
        </div>
      )}
    </div>
  );
}

function VersionHistory({ versions, quoteId }: { versions: any[]; quoteId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2" />
        Nenhum historico de versoes encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium flex items-center gap-2">
        <History className="h-4 w-4" /> Historico de Versoes
      </h3>
      <div className="space-y-2">
        {versions.map((v) => (
          <div key={v.id} className="border rounded-lg">
            <button
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpanded(expanded === v.id ? null : v.id)}
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  v{v.version}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{v.reason}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</p>
                </div>
              </div>
              {expanded === v.id ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expanded === v.id && (
              <div className="px-4 pb-3 text-sm text-muted-foreground border-t pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await api.post(`/quotes/${quoteId}/versions/${v.id}/restore`);
                    window.location.reload();
                  }}
                >
                  <History className="h-3.5 w-3.5 mr-1" /> Restaurar esta versao
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
