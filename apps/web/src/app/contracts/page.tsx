'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileCheck,
  Plus,
  Search,
  Copy,
  Archive,
  Send,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Calendar,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { ContractDrawer } from './contract-drawer';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  UNDER_REVIEW: { label: 'Em Revisao', color: 'bg-yellow-100 text-yellow-700' },
  AWAITING_SIGNATURE: { label: 'Aguard. Assinatura', color: 'bg-blue-100 text-blue-700' },
  SIGNED: { label: 'Assinado', color: 'bg-green-100 text-green-700' },
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700' },
  SUSPENDED: { label: 'Suspenso', color: 'bg-orange-100 text-orange-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  TERMINATED: { label: 'Encerrado', color: 'bg-slate-100 text-slate-700' },
  EXPIRED: { label: 'Expirado', color: 'bg-stone-100 text-stone-700' },
  ARCHIVED: { label: 'Arquivado', color: 'bg-purple-100 text-purple-700' },
};

const typeConfig: Record<string, string> = {
  SERVICE: 'Servico',
  SALE: 'Venda',
  RENTAL: 'Locacao',
  LICENSING: 'Licenciamento',
  SUBSCRIPTION: 'Assinatura',
  MAINTENANCE: 'Manutencao',
  SUPPORT: 'Suporte',
  SLA: 'SLA',
  CUSTOM: 'Personalizado',
};

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['contracts', page, search, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get('/contracts', { params });
      return res;
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
  const renewMutation = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/renew`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const items = data?.data || [];
  const meta = data?.meta;

  function handleCreate() {
    setSelectedContract(null);
    setDrawerOpen(true);
  }
  function handleEdit(contract: any) {
    setSelectedContract(contract);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground mt-1">Gerencie contratos, renovacoes e assinaturas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero, titulo ou cliente..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os Status</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileCheck className="h-12 w-12" />}
          title="Nenhum contrato encontrado"
          description="Crie seu primeiro contrato."
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((contract: any, i: number) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEdit(contract)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{contract.title || contract.number}</div>
                      <div className="text-xs text-muted-foreground">{contract.number}</div>
                    </div>
                    <Badge
                      className={cn(
                        'text-xs',
                        statusConfig[contract.status]?.color || 'bg-gray-100',
                      )}
                    >
                      {statusConfig[contract.status]?.label || contract.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {contract.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contract.company.name}
                      </span>
                    )}
                    {contract.contact && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {contract.contact.firstName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileCheck className="h-3 w-3" />
                      {typeConfig[contract.type] || contract.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">
                      {contract.totalValue ? formatCurrency(Number(contract.totalValue)) : '-'}
                    </div>
                    {contract.endDate && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(contract.endDate)}
                      </span>
                    )}
                  </div>
                  {contract.signers?.length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      {contract.signers.length} signatario(s) —{' '}
                      {contract.signers.filter((s: any) => s.status === 'SIGNED').length}{' '}
                      assinado(s)
                    </div>
                  )}
                  <div
                    className="flex items-center justify-end gap-1 pt-1 border-t"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contract.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          api.post(`/contracts/${contract.id}/send`).then(() => refetch())
                        }
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                      </Button>
                    )}
                    {(contract.status === 'ACTIVE' || contract.status === 'SIGNED') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => renewMutation.mutate(contract.id)}
                      >
                        <RotateCw className="h-3.5 w-3.5 mr-1" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(contract.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveMutation.mutate(contract.id)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {meta && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{meta.total} contrato(s)</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="px-2">
              Pagina {meta.page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              Proximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <ContractDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['contracts'] })}
      />
    </div>
  );
}
