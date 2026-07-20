'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Target,
  Building2,
  User,
  Calendar,
  MessageSquare,
  Clock,
  Plus,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  NEW: 'secondary',
  CONTACTED: 'default',
  QUALIFIED: 'success',
  UNQUALIFIED: 'destructive',
  CONVERTED: 'default',
  LOST: 'destructive',
};

const activityTypeIcons: Record<string, string> = {
  CALL: '📞',
  MEETING: '🤝',
  EMAIL: '📧',
  TASK: '✅',
  NOTE: '📝',
  OTHER: '📋',
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const leadId = params.id as string;
  const [tab, setTab] = useState('timeline');
  const [showActivity, setShowActivity] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get(`/leads/${leadId}`).then((r) => r.data),
    enabled: !!leadId,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', 'lead', leadId],
    queryFn: () =>
      api
        .get('/timeline', { params: { entity: 'lead', entityId: leadId, limit: 50 } })
        .then((r) => r.data),
    enabled: !!leadId && tab === 'timeline',
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations', 'lead', leadId],
    queryFn: () =>
      api.get('/conversations', { params: { leadId: leadId, limit: 20 } }).then((r) => r.data),
    enabled: !!leadId && tab === 'conversations',
  });

  const { data: activities } = useQuery({
    queryKey: ['activities', 'lead', leadId],
    queryFn: () =>
      api.get('/activities', { params: { leadId: leadId, limit: 50 } }).then((r) => r.data),
    enabled: !!leadId && tab === 'activities',
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <AdminLayout
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        }}
      >
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        }}
      >
        <div className="p-6">
          <p className="text-muted-foreground">Lead não encontrado.</p>
          <Button variant="ghost" className="mt-4" onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      }}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="text-muted-foreground">
              {lead.email || 'Sem email'} {lead.phone ? `· ${lead.phone}` : ''}
            </p>
          </div>
          <Badge variant={(statusColors[lead.status] as any) || 'secondary'}>{lead.status}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Responsável</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : 'Não atribuído'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Empresa</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{lead.companyName || '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Origem</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{lead.source}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Criado em</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{formatDate(lead.createdAt)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="conversations">Conversas</TabsTrigger>
              <TabsTrigger value="activities">Atividades</TabsTrigger>
            </TabsList>
            {tab === 'activities' && (
              <Button size="sm" onClick={() => setShowActivity(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Atividade
              </Button>
            )}
          </div>

          <TabsContent value="timeline" className="mt-4">
            <TimelineTab data={timeline} />
          </TabsContent>

          <TabsContent value="conversations" className="mt-4">
            <ConversationsTab data={conversations} />
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <ActivitiesTab data={activities} />
          </TabsContent>
        </Tabs>

        <ActivityDialog
          open={showActivity}
          onClose={() => setShowActivity(false)}
          leadId={leadId}
        />
      </div>
    </AdminLayout>
  );
}

function TimelineTab({ data }: { data: any }) {
  if (!data?.data?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum evento na timeline ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.data.map((event: any) => (
        <Card key={event.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{event.summary || event.action}</p>
                {event.payload && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {typeof event.payload === 'string'
                      ? event.payload
                      : JSON.stringify(event.payload).substring(0, 120)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{formatDate(event.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ConversationsTab({ data }: { data: any }) {
  const router = useRouter();

  if (!data?.data?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma conversa associada a este lead.</p>
          <Link href="/conversations">
            <Button variant="outline" className="mt-4" size="sm">
              <MessageSquare className="h-4 w-4 mr-1" /> Ir para Conversas
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.data.map((conv: any) => (
        <Card
          key={conv.id}
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => router.push('/conversations')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{conv.subject || 'Sem assunto'}</p>
                <p className="text-xs text-muted-foreground">
                  {conv.channel} · {conv.status}
                </p>
              </div>
              <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                {conv.status}
              </Badge>
            </div>
            {conv.lastMessagePreview && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {conv.lastMessagePreview}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivitiesTab({ data }: { data: any }) {
  if (!data?.data?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma atividade registrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.data.map((activity: any) => (
        <Card key={activity.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">{activityTypeIcons[activity.type] || '📋'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.subject}</p>
                {activity.description && (
                  <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(activity.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityDialog({
  open,
  onClose,
  leadId,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ subject: '', description: '', type: 'OTHER', dueDate: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/activities', { ...form, leadId });
      toast.success('Atividade criada');
      queryClient.invalidateQueries({ queryKey: ['activities', 'lead', leadId] });
      onClose();
      setForm({ subject: '', description: '', type: 'OTHER', dueDate: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao criar atividade');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL">Ligação</SelectItem>
                <SelectItem value="MEETING">Reunião</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="TASK">Tarefa</SelectItem>
                <SelectItem value="NOTE">Nota</SelectItem>
                <SelectItem value="OTHER">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assunto *</Label>
            <Input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
