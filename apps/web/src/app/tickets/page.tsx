'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket, Plus, CheckCircle2, Trash2, Send } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth.store';

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  open: 'bg-yellow-500/10 text-yellow-400',
  in_progress: 'bg-purple-500/10 text-purple-400',
  waiting: 'bg-orange-500/10 text-orange-400',
  resolved: 'bg-green-500/10 text-green-400',
  closed: 'bg-zinc-500/10 text-zinc-400',
};
const priorityColors: Record<string, string> = {
  low: 'bg-zinc-500/10 text-zinc-400',
  normal: 'bg-blue-500/10 text-blue-400',
  high: 'bg-orange-500/10 text-orange-400',
  urgent: 'bg-red-500/10 text-red-400',
  critical: 'bg-red-600/10 text-red-500',
};
const statusLabels: Record<string, string> = {
  new: 'Novo',
  open: 'Aberto',
  in_progress: 'Em andamento',
  waiting: 'Aguardando',
  resolved: 'Resolvido',
  closed: 'Fechado',
};
const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
  critical: 'Crítica',
};
const queueLabels: Record<string, string> = {
  support_n1: 'Suporte N1',
  support_n2: 'Suporte N2',
  support_n3: 'Suporte N3',
  financial: 'Financeiro',
  commercial: 'Comercial',
  implementation: 'Implantação',
  development: 'Desenvolvimento',
};

export default function TicketsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [newQueue, setNewQueue] = useState('support_n1');
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', search, statusFilter],
    queryFn: () =>
      api
        .get('/tickets', {
          params: { search: search || undefined, status: statusFilter || undefined, limit: 50 },
        })
        .then((r) => r.data),
  });
  const { data: stats } = useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: () => api.get('/tickets/stats').then((r) => r.data),
  });
  const { data: ticket } = useQuery({
    queryKey: ['ticket', selectedId],
    queryFn: () => api.get(`/tickets/${selectedId}`).then((r) => r.data),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/tickets', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowCreate(false);
    },
  });
  const closeMutation = useMutation({
    mutationFn: (id: string) => api.post('/tickets/close', { ticketId: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });
  const commentMutation = useMutation({
    mutationFn: () => api.post('/tickets/comment', { ticketId: selectedId, content: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', selectedId] });
      setComment('');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setSelectedId(null);
    },
  });

  const tickets = data?.data || [];

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="w-80 lg:w-96 border-r flex flex-col shrink-0 bg-card/50">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Tickets</h1>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </div>
          <Input
            placeholder="Buscar tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="w-full">
              <TabsTrigger value="" className="flex-1">
                Todos
              </TabsTrigger>
              <TabsTrigger value="open" className="flex-1">
                Abertos
              </TabsTrigger>
              <TabsTrigger value="closed" className="flex-1">
                Fechados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-4 gap-1 p-3 border-b text-center">
          <div>
            <p className="font-bold text-green-400">{stats?.openTickets || 0}</p>
            <p className="text-[10px] text-muted-foreground">Abertos</p>
          </div>
          <div>
            <p className="font-bold text-blue-400">{stats?.resolvedToday || 0}</p>
            <p className="text-[10px] text-muted-foreground">Resolvidos</p>
          </div>
          <div>
            <p className="font-bold text-red-400">{stats?.slaBreached || 0}</p>
            <p className="text-[10px] text-muted-foreground">SLA</p>
          </div>
          <div>
            <p className="font-bold text-purple-400">{stats?.backlog || 0}</p>
            <p className="text-[10px] text-muted-foreground">Backlog</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border-b">
                  <Skeleton className="h-12" />
                </div>
              ))
            : tickets.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    'w-full p-4 border-b text-left hover:bg-accent/50',
                    selectedId === t.id && 'bg-accent',
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm truncate">{t.subject}</span>
                    <Badge variant="outline" className={statusColors[t.status]}>
                      {statusLabels[t.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge className={priorityColors[t.priority]}>
                      {priorityLabels[t.priority]}
                    </Badge>
                    <span>{queueLabels[t.queue] || t.queue}</span>
                  </div>
                </button>
              ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Ticket className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Selecione um ticket</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{ticket?.subject}</p>
                  <Badge className={statusColors[ticket?.status || 'new']}>
                    {statusLabels[ticket?.status] || ticket?.status}
                  </Badge>
                  <Badge className={priorityColors[ticket?.priority || 'normal']}>
                    {priorityLabels[ticket?.priority]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {queueLabels[ticket?.queue] || ticket?.queue} • Criado{' '}
                  {formatDate(ticket?.createdAt)}
                  {ticket?.slaDeadline && <> • SLA: {formatDate(ticket.slaDeadline)}</>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => closeMutation.mutate(selectedId)}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(selectedId)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>

            <div className="p-4 border-b bg-muted/30 shrink-0">
              <p className="text-sm">{ticket?.description || 'Sem descrição'}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {ticket?.comments?.map((c: any, i: number) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    c.isInternal ? 'justify-start bg-yellow-500/5 rounded-lg p-3' : '',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                      !c.isInternal && 'bg-muted rounded-bl-md',
                    )}
                  >
                    {c.isInternal && (
                      <Badge
                        variant="outline"
                        className="text-[10px] mb-1 text-yellow-400 border-yellow-500/30"
                      >
                        Nota Interna
                      </Badge>
                    )}
                    <p>{c.content}</p>
                    <p className="text-[10px] mt-1 opacity-60">{formatDate(c.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2 shrink-0">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && comment.trim() && commentMutation.mutate()}
                placeholder="Adicionar comentário..."
              />
              <Button onClick={() => commentMutation.mutate()} disabled={!comment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Ticket</DialogTitle>
            <DialogDescription>Abra um novo ticket de suporte.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label>Assunto</Label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Assunto do ticket"
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descreva o problema"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fila</Label>
                <Select value={newQueue} onValueChange={setNewQueue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(queueLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newSubject.trim()}
              onClick={() =>
                createMutation.mutate({
                  subject: newSubject,
                  description: newDesc,
                  priority: newPriority,
                  queue: newQueue,
                })
              }
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
