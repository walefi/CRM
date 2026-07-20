'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, History, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ContractDrawerProps {
  open: boolean;
  onClose: () => void;
  contract: any | null;
  onSuccess: () => void;
}

export function ContractDrawer({ open, onClose, contract, onSuccess }: ContractDrawerProps) {
  const isNew = !contract;

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'SERVICE',
    category: '',
    object: '',
    companyId: '',
    contactId: '',
    dealId: '',
    quoteId: '',
    teamId: '',
    currency: 'BRL',
    totalValue: 0,
    paymentTerms: '',
    autoRenewal: false,
    renewalNoticeDays: 30,
    startDate: '',
    endDate: '',
    renewalDate: '',
    internalNotes: '',
    publicNotes: '',
    tags: '',
  });

  const [signers, setSigners] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'signers'>('details');

  useEffect(() => {
    if (contract) {
      setForm({
        title: contract.title || '',
        description: contract.description || '',
        type: contract.type || 'SERVICE',
        category: contract.category || '',
        object: contract.object || '',
        companyId: contract.companyId || '',
        contactId: contract.contactId || '',
        dealId: contract.dealId || '',
        quoteId: contract.quoteId || '',
        teamId: contract.teamId || '',
        currency: contract.currency || 'BRL',
        totalValue: Number(contract.totalValue) || 0,
        paymentTerms: contract.paymentTerms || '',
        autoRenewal: contract.autoRenewal || false,
        renewalNoticeDays: contract.renewalNoticeDays || 30,
        startDate: contract.startDate
          ? new Date(contract.startDate).toISOString().split('T')[0]
          : '',
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
        renewalDate: contract.renewalDate
          ? new Date(contract.renewalDate).toISOString().split('T')[0]
          : '',
        internalNotes: contract.internalNotes || '',
        publicNotes: contract.publicNotes || '',
        tags: contract.tags?.join(', ') || '',
      });
      setSigners(contract.signers || []);
    } else {
      setForm({
        title: '',
        description: '',
        type: 'SERVICE',
        category: '',
        object: '',
        companyId: '',
        contactId: '',
        dealId: '',
        quoteId: '',
        teamId: '',
        currency: 'BRL',
        totalValue: 0,
        paymentTerms: '',
        autoRenewal: false,
        renewalNoticeDays: 30,
        startDate: '',
        endDate: '',
        renewalDate: '',
        internalNotes: '',
        publicNotes: '',
        tags: '',
      });
      setSigners([]);
      setActiveTab('details');
    }
  }, [contract, open]);

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
  const { data: quotes } = useQuery({
    queryKey: ['quotes-select'],
    queryFn: async () => {
      const { data } = await api.get('/quotes', { params: { limit: 100 } });
      return data.data;
    },
    enabled: open,
  });
  const { data: versions } = useQuery({
    queryKey: ['contract-versions', contract?.id],
    queryFn: async () => {
      const { data } = await api.get(`/contracts/${contract.id}/versions`);
      return data;
    },
    enabled: !!contract?.id && activeTab === 'versions',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/contracts', data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/contracts/${id}`, data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  function handleSubmit() {
    const payload: any = {
      ...form,
      totalValue: Number(form.totalValue),
      tags: form.tags
        ? form.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
      signers: signers.map((s) => ({
        name: s.name,
        email: s.email,
        document: s.document,
        phone: s.phone,
        role: s.role,
        sortOrder: s.sortOrder,
      })),
    };
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: contract.id, data: payload });
    }
  }

  function addSigner() {
    setSigners([
      ...signers,
      {
        id: `temp-${Date.now()}`,
        name: '',
        email: '',
        document: '',
        phone: '',
        role: '',
        status: 'PENDING',
        sortOrder: signers.length,
      },
    ]);
  }

  function removeSigner(idx: number) {
    setSigners(signers.filter((_, i) => i !== idx));
  }
  function updateSigner(idx: number, field: string, value: string) {
    const updated = [...signers];
    updated[idx] = { ...updated[idx], [field]: value };
    setSigners(updated);
  }

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
                {isNew ? 'Novo Contrato' : 'Editar Contrato'}
              </h2>
              {contract && <p className="text-sm text-muted-foreground">{contract.number}</p>}
            </div>
            <div className="flex items-center gap-2">
              {!isNew && (
                <div className="flex rounded-md border mr-2">
                  {(['details', 'signers', 'versions'] as const).map((tab) => (
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
                      {tab === 'details'
                        ? 'Detalhes'
                        : tab === 'signers'
                          ? 'Signatarios'
                          : 'Historico'}
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
            {!isNew && activeTab === 'signers' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Signatarios</h3>
                  <Button variant="outline" size="sm" onClick={addSigner}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {signers.map((s, idx) => (
                  <div key={s.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {s.name || `Signatario ${idx + 1}`}
                      </span>
                      <Badge className="text-xs">{s.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeSigner(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        className="text-sm h-8"
                        value={s.name}
                        onChange={(e) => updateSigner(idx, 'name', e.target.value)}
                        placeholder="Nome"
                      />
                      <Input
                        className="text-sm h-8"
                        value={s.email}
                        onChange={(e) => updateSigner(idx, 'email', e.target.value)}
                        placeholder="Email"
                      />
                      <Input
                        className="text-sm h-8"
                        value={s.document || ''}
                        onChange={(e) => updateSigner(idx, 'document', e.target.value)}
                        placeholder="Documento"
                      />
                      <Input
                        className="text-sm h-8"
                        value={s.role || ''}
                        onChange={(e) => updateSigner(idx, 'role', e.target.value)}
                        placeholder="Funcao"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : !isNew && activeTab === 'versions' ? (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historico de Versoes
                </h3>
                {!versions || versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum historico</div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v: any) => (
                      <div key={v.id} className="border rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            v{v.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(v.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{v.reason}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={async () => {
                            await api.post(`/contracts/${contract.id}/versions/${v.id}/restore`);
                            window.location.reload();
                          }}
                        >
                          <History className="h-3.5 w-3.5 mr-1" />
                          Restaurar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-sm font-medium">Titulo</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Ex: Contrato de Prestacao de Servicos"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tipo</label>
                    <select
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="SERVICE">Servico</option>
                      <option value="SALE">Venda</option>
                      <option value="RENTAL">Locacao</option>
                      <option value="LICENSING">Licenciamento</option>
                      <option value="SUBSCRIPTION">Assinatura</option>
                      <option value="MAINTENANCE">Manutencao</option>
                      <option value="SUPPORT">Suporte</option>
                      <option value="SLA">SLA</option>
                      <option value="CUSTOM">Personalizado</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Valor Total</label>
                    <Input
                      type="number"
                      value={form.totalValue}
                      onChange={(e) => setForm({ ...form, totalValue: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Categoria</label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Categoria"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Empresa</label>
                    <select
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
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
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
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
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
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
                {quotes && quotes.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Proposta (conversao)</label>
                    <select
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                      value={form.quoteId}
                      onChange={(e) => setForm({ ...form, quoteId: e.target.value })}
                    >
                      <option value="">Nenhuma</option>
                      {quotes
                        .filter((q: any) => q.status === 'ACCEPTED')
                        .map((q: any) => (
                          <option key={q.id} value={q.id}>
                            {q.number} - {q.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Inicio</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Termino</label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Renovacao</label>
                    <Input
                      type="date"
                      value={form.renewalDate}
                      onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.autoRenewal}
                      onChange={(e) => setForm({ ...form, autoRenewal: e.target.checked })}
                    />
                    <label className="text-sm">Renovacao Automatica</label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Dias de Aviso</label>
                    <Input
                      type="number"
                      value={form.renewalNoticeDays}
                      onChange={(e) =>
                        setForm({ ...form, renewalNoticeDays: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Objeto do Contrato</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.object}
                    onChange={(e) => setForm({ ...form, object: e.target.value })}
                    placeholder="Descreva o objeto do contrato..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Condicoes de Pagamento</label>
                  <Input
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Observacoes Internas</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.internalNotes}
                    onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Observacoes Publicas</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.publicNotes}
                    onChange={(e) => setForm({ ...form, publicNotes: e.target.value })}
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

                <div className="space-y-3">
                  <div className="font-medium text-sm flex items-center gap-2">
                    Signatarios ({signers.length})
                  </div>
                  {signers.map((s, idx) => (
                    <div key={s.id} className="border rounded-lg p-2 grid grid-cols-2 gap-2">
                      <Input
                        className="text-sm h-8"
                        value={s.name}
                        onChange={(e) => updateSigner(idx, 'name', e.target.value)}
                        placeholder="Nome"
                      />
                      <Input
                        className="text-sm h-8"
                        value={s.email}
                        onChange={(e) => updateSigner(idx, 'email', e.target.value)}
                        placeholder="Email"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeSigner(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addSigner}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar Signatario
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    {!isNew && contract.status === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await api.post(`/contracts/${contract.id}/send`);
                            toast.success('Contrato enviado para assinatura');
                            onSuccess();
                          } catch (e: any) {
                            toast.error(e.response?.data?.message || 'Erro ao enviar contrato');
                          }
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Enviar p/ Assinatura
                      </Button>
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
                      {isNew ? 'Criar Contrato' : 'Salvar'}
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
