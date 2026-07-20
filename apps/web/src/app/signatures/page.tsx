'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PenTool, Plus, Send, XCircle, Users, Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth.store';

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400', sent: 'bg-blue-500/10 text-blue-400',
  in_progress: 'bg-purple-500/10 text-purple-400', signed: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400', cancelled: 'bg-zinc-500/10 text-zinc-400',
  expired: 'bg-yellow-500/10 text-yellow-400',
};
const statusLabels: Record<string, string> = {
  draft: 'Rascunho', sent: 'Enviado', in_progress: 'Em andamento', signed: 'Assinado',
  rejected: 'Recusado', cancelled: 'Cancelado', expired: 'Expirado',
};
const signerStatusColors: Record<string, string> = {
  pending: 'bg-zinc-500/10 text-zinc-400', viewed: 'bg-blue-500/10 text-blue-400',
  signed: 'bg-green-500/10 text-green-400', rejected: 'bg-red-500/10 text-red-400',
};

export default function SignaturesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSignerName, setNewSignerName] = useState('');
  const [newSignerEmail, setNewSignerEmail] = useState('');
  const [newWorkflow, setNewWorkflow] = useState('single');

  const { data, isLoading } = useQuery({
    queryKey: ['signatures', search, statusFilter],
    queryFn: () => api.get('/signatures', { params: { search: search || undefined, status: statusFilter || undefined, limit: 30 } }).then(r => r.data),
  });
  const { data: stats } = useQuery({ queryKey: ['signatures', 'stats'], queryFn: () => api.get('/signatures/stats').then(r => r.data) });
  const { data: request } = useQuery({
    queryKey: ['signature', selectedId], queryFn: () => api.get(`/signatures/${selectedId}`).then(r => r.data), enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/signatures', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['signatures'] }); setShowCreate(false); },
  });
  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post('/signatures/send', { requestId: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['signatures'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post('/signatures/cancel', { requestId: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['signatures'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/signatures/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['signatures'] }); setSelectedId(null); },
  });

  const requests = data?.data || [];

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="w-80 lg:w-96 border-r flex flex-col shrink-0 bg-card/50">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Assinaturas</h1>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </div>
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="w-full">
              <TabsTrigger value="" className="flex-1">Todas</TabsTrigger>
              <TabsTrigger value="draft" className="flex-1">Rascunho</TabsTrigger>
              <TabsTrigger value="signed" className="flex-1">Assinadas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-4 gap-1 p-3 border-b text-center">
          <div><p className="font-bold text-green-400">{stats?.signed || 0}</p><p className="text-[10px] text-muted-foreground">Assinados</p></div>
          <div><p className="font-bold text-blue-400">{stats?.pending || 0}</p><p className="text-[10px] text-muted-foreground">Pendentes</p></div>
          <div><p className="font-bold text-purple-400">{stats?.templates || 0}</p><p className="text-[10px] text-muted-foreground">Templates</p></div>
          <div><p className="font-bold text-zinc-400">{stats?.total || 0}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4 border-b"><Skeleton className="h-12" /></div>) :
            requests.map((r: any) => (
              <button key={r.id} onClick={() => setSelectedId(r.id)} className={cn('w-full p-3 border-b text-left hover:bg-accent/50', selectedId === r.id && 'bg-accent')}>
                <div className="flex items-start justify-between">
                  <span className="font-medium text-sm truncate">{r.title}</span>
                  <Badge variant="outline" className={statusColors[r.status]}>{statusLabels[r.status]}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Users className="h-3 w-3" />
                  <span>{r.signers?.length || 0} signatários</span>
                  <span>•</span>
                  <span>{formatDate(r.createdAt)}</span>
                </div>
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center"><PenTool className="h-16 w-16 mx-auto mb-4 opacity-20" /><p className="text-lg font-medium">Selecione uma assinatura</p></div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{request?.title}</p>
                  <Badge className={statusColors[request?.status]}>{statusLabels[request?.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Workflow: {request?.workflow === 'single' ? 'Único' : request?.workflow === 'sequential' ? 'Sequencial' : 'Paralelo'} • {formatDate(request?.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1">
                {request?.status === 'draft' && (
                  <Button size="sm" onClick={() => sendMutation.mutate(selectedId)}><Send className="h-4 w-4 mr-1" /> Enviar</Button>
                )}
                {request?.status !== 'cancelled' && request?.status !== 'signed' && (
                  <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate(selectedId)}><XCircle className="h-4 w-4" /></Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(selectedId)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Signatários</p>
                  <div className="space-y-2">
                    {request?.signers?.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{s.order + 1}</div>
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={signerStatusColors[s.status]}>{s.status}</Badge>
                          {s.signedAt && <span className="text-xs text-muted-foreground">{formatDate(s.signedAt)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {request?.audit?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3">Timeline</p>
                    <div className="space-y-2">
                      {request.audit.map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="text-muted-foreground">{a.action}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{formatDate(a.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Assinatura</DialogTitle><DialogDescription>Crie uma solicitação de assinatura eletrônica.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1"><Label>Título</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Contrato de Prestação de Serviços" /></div>
            <div className="space-y-1"><Label>Workflow</Label>
              <Select value={newWorkflow} onValueChange={setNewWorkflow}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Único</SelectItem>
                  <SelectItem value="sequential">Sequencial</SelectItem>
                  <SelectItem value="parallel">Paralelo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Signatário</Label><Input value={newSignerName} onChange={e => setNewSignerName(e.target.value)} placeholder="Nome" /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={newSignerEmail} onChange={e => setNewSignerEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button disabled={!newTitle.trim()} onClick={() => createMutation.mutate({ title: newTitle, workflow: newWorkflow, signers: newSignerName ? [{ name: newSignerName, email: newSignerEmail }] : [] })}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
