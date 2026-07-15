'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Copy,
  Archive,
  Send,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  User,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { QuoteDrawer } from './quote-drawer';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: {
    label: 'Rascunho',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  UNDER_REVIEW: {
    label: 'Em Revisao',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  SENT: {
    label: 'Enviada',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  VIEWED: {
    label: 'Visualizada',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  },
  NEGOTIATION: {
    label: 'Em Negociacao',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  ACCEPTED: {
    label: 'Aceita',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  REJECTED: {
    label: 'Recusada',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  EXPIRED: {
    label: 'Expirada',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  ARCHIVED: {
    label: 'Arquivada',
    color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
};

export default function QuotesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quotes', page, search, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get('/quotes', { params });
      return res;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/quotes/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const items = data?.data || [];
  const meta = data?.meta;

  function handleCreate() {
    setSelectedQuote(null);
    setDrawerOpen(true);
  }

  function handleEdit(quote: any) {
    setSelectedQuote(quote);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propostas Comerciais</h1>
          <p className="text-muted-foreground mt-1">Gerencie propostas, orcamentos e negociacoes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposta
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
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none"
          >
            Tabela
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
          >
            Cards
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Nenhuma proposta encontrada"
          description="Crie sua primeira proposta comercial."
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Proposta
            </Button>
          }
        />
      ) : viewMode === 'table' ? (
        <QuoteTable
          items={items}
          onEdit={handleEdit}
          onDelete={(q: any) => deleteMutation.mutate(q.id)}
          onArchive={(q: any) => archiveMutation.mutate(q.id)}
          onDuplicate={(q: any) => duplicateMutation.mutate(q.id)}
          onSend={(q: any) => sendMutation.mutate(q.id)}
        />
      ) : (
        <QuoteCards
          items={items}
          onEdit={handleEdit}
          onArchive={(q: any) => archiveMutation.mutate(q.id)}
          onDuplicate={(q: any) => duplicateMutation.mutate(q.id)}
          onSend={(q: any) => sendMutation.mutate(q.id)}
        />
      )}

      {meta && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{meta.total} proposta(s)</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
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
              Proximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <QuoteDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedQuote(null);
        }}
        quote={selectedQuote}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['quotes'] })}
      />
    </div>
  );
}

function QuoteTable({
  items,
  onEdit,
  onDelete,
  onArchive,
  onDuplicate,
  onSend,
}: {
  items: any[];
  onEdit: (q: any) => void;
  onDelete: (q: any) => void;
  onArchive: (q: any) => void;
  onDuplicate: (q: any) => void;
  onSend: (q: any) => void;
}) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
              Proposta
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
              Valor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
              Validade
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase w-16">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((quote, i) => (
            <motion.tr
              key={quote.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onEdit(quote)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{quote.title || quote.number}</div>
                    <div className="text-xs text-muted-foreground">{quote.number}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {quote.company ? (
                    <>
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{quote.company.name}</span>
                    </>
                  ) : quote.contact ? (
                    <>
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        {quote.contact.firstName} {quote.contact.lastName}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={cn('text-xs', statusConfig[quote.status]?.color || 'bg-gray-100')}
                >
                  {statusConfig[quote.status]?.label || quote.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {quote.totalAmount ? formatCurrency(Number(quote.totalAmount)) : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {quote.validUntil ? formatDate(quote.validUntil) : '-'}
              </td>
              <td className="px-4 py-3 text-right">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {quote.status === 'DRAFT' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Enviar"
                      onClick={() => onSend(quote)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Duplicar"
                    onClick={() => onDuplicate(quote)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Arquivar"
                    onClick={() => onArchive(quote)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    onClick={() => onDelete(quote)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuoteCards({
  items,
  onEdit,
  onArchive,
  onDuplicate,
  onSend,
}: {
  items: any[];
  onEdit: (q: any) => void;
  onArchive: (q: any) => void;
  onDuplicate: (q: any) => void;
  onSend: (q: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((quote, i) => (
        <motion.div
          key={quote.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onEdit(quote)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-sm">{quote.title || quote.number}</div>
                  <div className="text-xs text-muted-foreground">{quote.number}</div>
                </div>
                <Badge
                  className={cn('text-xs', statusConfig[quote.status]?.color || 'bg-gray-100')}
                >
                  {statusConfig[quote.status]?.label || quote.status}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {quote.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {quote.company.name}
                  </span>
                )}
                {quote.contact && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {quote.contact.firstName} {quote.contact.lastName}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">
                  {quote.totalAmount ? formatCurrency(Number(quote.totalAmount)) : '-'}
                </div>
                {quote.validUntil && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(quote.validUntil)}
                  </span>
                )}
              </div>

              <div
                className="flex items-center justify-end gap-1 pt-1 border-t"
                onClick={(e) => e.stopPropagation()}
              >
                {quote.status === 'DRAFT' && (
                  <Button variant="ghost" size="sm" onClick={() => onSend(quote)}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Enviar
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onDuplicate(quote)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onArchive(quote)}>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
