'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Search,
  MessageSquare,
  Bookmark,
  User,
  Building2,
  Target,
  FileText,
  Workflow,
  Ticket,
  Bell,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';

const moduleIcons: Record<string, any> = {
  lead: User,
  contact: User,
  company: Building2,
  deal: Target,
  product: FileText,
  contract: FileText,
  quote: FileText,
  document: FileText,
  workflow: Workflow,
  automation: Workflow,
  notification: Bell,
  ticket: Ticket,
  user: User,
};
const moduleLabels: Record<string, string> = {
  lead: 'Lead',
  contact: 'Contato',
  company: 'Empresa',
  deal: 'Negócio',
  product: 'Produto',
  contract: 'Contrato',
  quote: 'Proposta',
  document: 'Documento',
  workflow: 'Workflow',
  automation: 'Automação',
  notification: 'Notificação',
  ticket: 'Ticket',
  user: 'Usuário',
};

export default function TimelinePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [comment, setComment] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showAllModules] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', search, moduleFilter],
    queryFn: () =>
      api
        .get('/timeline', {
          params: { search: search || undefined, module: moduleFilter || undefined, limit: 30 },
        })
        .then((r) => r.data),
  });
  const { data: stats } = useQuery({
    queryKey: ['timeline', 'stats'],
    queryFn: () => api.get('/timeline/stats').then((r) => r.data),
  });

  const commentMutation = useMutation({
    mutationFn: (d: { timelineId: string; content: string }) => api.post('/timeline/comment', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setComment('');
    },
  });
  const reactionMutation = useMutation({
    mutationFn: (d: { timelineId: string; reaction: string }) => api.post('/timeline/reaction', d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeline'] }),
  });
  const bookmarkMutation = useMutation({
    mutationFn: (timelineId: string) => api.post('/timeline/bookmark', { timelineId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeline'] }),
  });

  const events = data?.data || [];
  const displayModules = showAllModules
    ? Object.keys(moduleLabels)
    : Object.keys(moduleLabels).slice(0, 6);

  if (!user) return null;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timeline 360°</h1>
          <p className="text-muted-foreground">
            Histórico unificado de todas as atividades do CRM.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats?.totalEvents || 0}</p>
            <p className="text-xs text-muted-foreground">Total de Eventos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats?.eventsToday || 0}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats?.modules?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Módulos</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na timeline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={moduleFilter} onValueChange={setModuleFilter}>
          <TabsList>
            <TabsTrigger value="">Todos</TabsTrigger>
            {displayModules.map((m) => (
              <TabsTrigger key={m} value={m}>
                {moduleLabels[m]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pl-10">
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ))
          ) : events.length === 0 ? (
            <div className="pl-10 py-16 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum evento na timeline</p>
            </div>
          ) : (
            events.map((event: any) => {
              const Icon = moduleIcons[event.module] || Clock;
              return (
                <div key={event.id} className="relative pl-10">
                  <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center z-10">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {moduleLabels[event.module] || event.module}
                            </Badge>
                            <span className="text-sm font-medium">
                              {event.summary || event.action}
                            </span>
                          </div>
                          {event.payload && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              {JSON.stringify(event.payload).substring(0, 120)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-3 border-t pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            reactionMutation.mutate({ timelineId: event.id, reaction: '👍' })
                          }
                        >
                          👍
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            reactionMutation.mutate({ timelineId: event.id, reaction: '❤️' })
                          }
                        >
                          ❤️
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setActiveCommentId(activeCommentId === event.id ? null : event.id)
                          }
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => bookmarkMutation.mutate(event.id)}
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                        </Button>
                        <div className="flex-1" />
                        {event.entity && event.entityId && (
                          <Link
                            href={`/${event.entity}s`}
                            className="text-xs text-primary hover:underline"
                          >
                            Ver {moduleLabels[event.entity] || event.entity}
                          </Link>
                        )}
                      </div>

                      {activeCommentId === event.id && (
                        <div className="mt-3 border-t pt-3">
                          <div className="flex gap-2">
                            <Input
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === 'Enter' &&
                                comment.trim() &&
                                commentMutation.mutate({ timelineId: event.id, content: comment })
                              }
                              placeholder="Adicionar comentário..."
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() =>
                                commentMutation.mutate({ timelineId: event.id, content: comment })
                              }
                              disabled={!comment.trim()}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
