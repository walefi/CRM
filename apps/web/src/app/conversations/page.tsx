'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Inbox, Archive, CheckCircle2, UserPlus, Search, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  EMAIL: 'Email',
  SMS: 'SMS',
  WEBCHAT: 'Webchat',
  TELEGRAM: 'Telegram',
  SLACK: 'Slack',
  DISCORD: 'Discord',
  PHONE: 'Telefone',
};
const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  assigned: 'bg-blue-500/10 text-blue-400',
  waiting: 'bg-yellow-500/10 text-yellow-400',
  resolved: 'bg-zinc-500/10 text-zinc-400',
  archived: 'bg-zinc-500/10 text-zinc-400',
};
const statusLabels: Record<string, string> = {
  active: 'Ativo',
  assigned: 'Atribuído',
  waiting: 'Aguardando',
  resolved: 'Resolvido',
  archived: 'Arquivado',
};

export default function ConversationsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', search, statusFilter],
    queryFn: () =>
      api
        .get('/conversations', {
          params: { search: search || undefined, status: statusFilter || undefined, limit: 30 },
        })
        .then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['conversations', 'stats'],
    queryFn: () => api.get('/conversations/stats').then((r) => r.data),
  });

  const { data: conversation } = useQuery({
    queryKey: ['conversation', selectedId],
    queryFn: () => api.get(`/conversations/${selectedId}`).then((r) => r.data),
    enabled: !!selectedId,
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => api.get(`/conversations/${selectedId}/messages`).then((r) => r.data),
    enabled: !!selectedId,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post('/conversations/send', {
        conversationId: selectedId,
        content,
        channel: conversation?.channel || 'WEBCHAT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      setMessage('');
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/conversations/${selectedId}/assign`, { userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.post(`/conversations/${selectedId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedId(null);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => api.post(`/conversations/${selectedId}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] }),
  });

  const conversations = data?.data || [];
  const messagesList = messages?.data || [];

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="w-80 lg:w-96 border-r flex flex-col shrink-0 bg-card/50">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Inbox</h1>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['conversations'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="w-full">
              <TabsTrigger value="" className="flex-1">
                Todas
              </TabsTrigger>
              <TabsTrigger value="active" className="flex-1">
                Ativas
              </TabsTrigger>
              <TabsTrigger value="waiting" className="flex-1">
                Fila
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1">
                Resolvidas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-3 gap-1 p-3 border-b">
          <div className="text-center">
            <p className="text-lg font-bold text-green-400">{stats?.activeConversations || 0}</p>
            <p className="text-[10px] text-muted-foreground">Ativas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-400">{stats?.messagesToday || 0}</p>
            <p className="text-[10px] text-muted-foreground">Msg Hoje</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-400">{stats?.onlineAgents || 0}</p>
            <p className="text-[10px] text-muted-foreground">Online</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 border-b">
                <Skeleton className="h-12" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma conversa</div>
          ) : (
            conversations.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'w-full p-4 border-b text-left hover:bg-accent/50 transition-colors',
                  selectedId === c.id && 'bg-accent',
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm truncate">
                    {c.subject || `Conversa ${c.id.slice(0, 8)}`}
                  </span>
                  <Badge variant="outline" className={statusColors[c.status]}>
                    {statusLabels[c.status] || c.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">
                    {channelLabels[c.channel] || c.channel}
                  </Badge>
                  {c.lastMessagePreview && <span className="truncate">{c.lastMessagePreview}</span>}
                </div>
                {c.unreadCount > 0 && <Badge className="mt-1 text-[10px]">{c.unreadCount}</Badge>}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Inbox className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">Selecione uma conversa</p>
              <p className="text-sm">
                Escolha uma conversa na lista ao lado para começar a atender.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div>
                <p className="font-semibold">
                  {conversation?.subject || `Conversa ${selectedId.slice(0, 8)}`}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {channelLabels[conversation?.channel] || conversation?.channel}
                  </Badge>
                  <span>{formatDate(conversation?.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => assignMutation.mutate(user?.id || 'agent')}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => archiveMutation.mutate()}>
                  <Archive className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resolveMutation.mutate()}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messagesList.map((m: any, i: number) => (
                <div
                  key={m.id || i}
                  className={cn(
                    'flex',
                    m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                      m.direction === 'OUTBOUND'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md',
                    )}
                  >
                    <p>{m.content}</p>
                    <p className="text-[10px] mt-1 opacity-60 text-right">
                      {formatDate(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2 shrink-0">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && message.trim() && sendMutation.mutate(message)
                }
                placeholder="Digite sua mensagem..."
                className="flex-1"
              />
              <Button
                onClick={() => sendMutation.mutate(message)}
                disabled={!message.trim() || sendMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
