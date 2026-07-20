'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Send, Trash2, CheckCheck, Megaphone, Eye, ExternalLink,
  Info, AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';

const typeIcons: Record<string, any> = { info: Info, warning: AlertTriangle, success: CheckCircle, error: XCircle, urgent: AlertTriangle };
const typeColors: Record<string, string> = { info: 'text-blue-400', warning: 'text-yellow-400', success: 'text-green-400', error: 'text-red-400', urgent: 'text-red-500' };
const channelLabels: Record<string, string> = { in_app: 'In-App', email: 'Email', push: 'Push', whatsapp: 'WhatsApp', sms: 'SMS', websocket: 'WebSocket' };

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');
  const [showSend, setShowSend] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [sendTitle, setSendTitle] = useState('');
  const [sendBody, setSendBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', tab],
    queryFn: () => api.get('/notifications', { params: { isRead: tab === 'unread' ? 'false' : undefined, limit: 30 } }).then(r => r.data),
  });
  const { data: stats } = useQuery({ queryKey: ['notifications', 'stats'], queryFn: () => api.get('/notifications/stats').then(r => r.data) });

  const readMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const sendMutation = useMutation({
    mutationFn: (d: any) => api.post('/notifications/send', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); setShowSend(false); setShowBroadcast(false); },
  });
  const broadcastMutation = useMutation({
    mutationFn: (d: any) => api.post('/notifications/broadcast', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); setShowBroadcast(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];

  if (!user) return null;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">Enterprise Notification Center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowBroadcast(true)}><Megaphone className="h-4 w-4 mr-1" /> Broadcast</Button>
          <Button size="sm" onClick={() => setShowSend(true)}><Send className="h-4 w-4 mr-1" /> Enviar</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats?.total || 0}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats?.sentToday || 0}</p><p className="text-xs text-muted-foreground">Hoje</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-red-400">{stats?.unread || 0}</p><p className="text-xs text-muted-foreground">Não Lidas</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats?.templates || 0}</p><p className="text-xs text-muted-foreground">Templates</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">Não Lidas</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" variant="ghost" onClick={() => readAllMutation.mutate()}><CheckCheck className="h-4 w-4 mr-1" /> Marcar todas lidas</Button>
      </div>

      <div className="space-y-2">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />) :
          notifications.length === 0 ? <div className="py-16 text-center text-muted-foreground"><Bell className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>Nenhuma notificação</p></div> :
          notifications.map((n: any) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <Card key={n.id} className={cn('hover:bg-accent/30 transition-colors', !n.isRead && 'border-l-2 border-l-primary')}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-muted shrink-0 mt-0.5"><Icon className={cn('h-4 w-4', typeColors[n.type] || '')} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm', !n.isRead && 'font-semibold')}>{n.title}</p>
                        <Badge variant="outline" className="text-[10px]">{channelLabels[n.channel] || n.channel}</Badge>
                        {n.category && <Badge variant="secondary" className="text-[10px]">{n.category}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body || n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                      {n.url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 mt-1 px-2 text-xs text-primary hover:text-primary/80"
                          onClick={() => {
                            if (!n.isRead) readMutation.mutate(n.id);
                            router.push(n.url);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => readMutation.mutate(n.id)}><Eye className="h-3.5 w-3.5" /></Button>}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMutation.mutate(n.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar Notificação</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1"><Label>Título</Label><Input value={sendTitle} onChange={e => setSendTitle(e.target.value)} /></div>
            <div className="space-y-1"><Label>Mensagem</Label><Input value={sendBody} onChange={e => setSendBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(false)}>Cancelar</Button>
            <Button disabled={!sendTitle} onClick={() => sendMutation.mutate({ title: sendTitle, body: sendBody, userId: user.id })}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBroadcast} onOpenChange={setShowBroadcast}>
        <DialogContent>
          <DialogHeader><DialogTitle>Broadcast</DialogTitle><DialogDescription>Enviar para todos os usuários.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1"><Label>Título</Label><Input value={sendTitle} onChange={e => setSendTitle(e.target.value)} /></div>
            <div className="space-y-1"><Label>Mensagem</Label><Input value={sendBody} onChange={e => setSendBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcast(false)}>Cancelar</Button>
            <Button disabled={!sendTitle} onClick={() => broadcastMutation.mutate({ title: sendTitle, body: sendBody })}>Broadcast</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
