'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Rocket,
  Zap,
  User,
  TrendingUp,
  Clock,
  FileText,
  DollarSign,
  Gift,
  RefreshCw,
  Workflow,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';

const BUILT_IN_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    description: 'Envia email de boas-vindas automaticamente quando um novo lead é criado.',
    category: 'onboarding',
    icon: User,
    trigger: 'LEAD_CREATED',
    actions: ['SEND_EMAIL'],
    config: {
      triggers: [{ type: 'LEAD_CREATED', isEnabled: true }],
      conditions: [],
      actions: [
        {
          type: 'SEND_EMAIL',
          sortOrder: 0,
          delay: 0,
          isEnabled: true,
          config: {
            subject: 'Bem-vindo(a) {{firstName}}!',
            body: 'Olá {{firstName}}, obrigado por se cadastrar!',
          },
        },
      ],
    },
  },
  {
    id: 'followup',
    name: 'Follow-up',
    description: 'Cria tarefa de follow-up 3 dias após criar um negócio.',
    category: 'sales',
    icon: Rocket,
    trigger: 'DEAL_CREATED',
    actions: ['CREATE_TASK'],
    config: {
      triggers: [{ type: 'DEAL_CREATED', isEnabled: true }],
      conditions: [],
      actions: [
        {
          type: 'CREATE_TASK',
          sortOrder: 0,
          delay: 259200000,
          isEnabled: true,
          config: { title: 'Follow-up com {{companyName}}' },
        },
      ],
    },
  },
  {
    id: 'stale_lead',
    name: 'Lead Parado',
    description: 'Notifica o responsável quando um lead fica sem interação por 7 dias.',
    category: 'sales',
    icon: Clock,
    trigger: 'LEAD_UPDATED',
    actions: ['SEND_NOTIFICATION'],
    config: {
      triggers: [{ type: 'LEAD_UPDATED', isEnabled: true }],
      conditions: [
        {
          field: 'lastContactAt',
          operator: 'BEFORE',
          value: '{{7daysAgo}}',
          logic: 'AND',
          sortOrder: 0,
        },
      ],
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          sortOrder: 0,
          delay: 0,
          isEnabled: true,
          config: { title: 'Lead {{firstName}} {{lastName}} precisa de atenção' },
        },
      ],
    },
  },
  {
    id: 'inactive_client',
    name: 'Cliente Inativo',
    description:
      'Identifica clientes que não compram há mais de 30 dias e cria tarefa para o vendedor.',
    category: 'retention',
    icon: TrendingUp,
    trigger: 'DEAL_LOST',
    actions: ['CREATE_TASK', 'SEND_EMAIL'],
    config: {
      triggers: [{ type: 'DEAL_LOST', isEnabled: true }],
      conditions: [
        {
          field: 'daysSinceLastPurchase',
          operator: 'GREATER_THAN',
          value: '30',
          logic: 'AND',
          sortOrder: 0,
        },
      ],
      actions: [
        {
          type: 'CREATE_TASK',
          sortOrder: 0,
          delay: 0,
          isEnabled: true,
          config: { title: 'Recuperar cliente {{companyName}}' },
        },
        {
          type: 'SEND_EMAIL',
          sortOrder: 1,
          delay: 3600000,
          isEnabled: true,
          config: { subject: 'Sentimos sua falta!' },
        },
      ],
    },
  },
  {
    id: 'contract_expiring',
    name: 'Contrato Expirando',
    description:
      'Alerta sobre contratos que expiram nos próximos 15 dias e cria tarefa de renovação.',
    category: 'contracts',
    icon: FileText,
    trigger: 'CONTRACT_EXPIRING',
    actions: ['CREATE_TASK', 'SEND_NOTIFICATION'],
    config: {
      triggers: [{ type: 'CONTRACT_EXPIRING', isEnabled: true }],
      conditions: [
        {
          field: 'daysUntilExpiry',
          operator: 'LESS_OR_EQUAL',
          value: '15',
          logic: 'AND',
          sortOrder: 0,
        },
      ],
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          sortOrder: 0,
          delay: 0,
          isEnabled: true,
          config: { title: 'Contrato {{contractName}} expira em {{daysUntilExpiry}} dias' },
        },
        {
          type: 'CREATE_TASK',
          sortOrder: 1,
          delay: 0,
          isEnabled: true,
          config: { title: 'Renovar contrato {{contractName}}' },
        },
      ],
    },
  },
  {
    id: 'quote_expiring',
    name: 'Proposta Vencendo',
    description: 'Envia lembrete sobre propostas que vencem em 3 dias.',
    category: 'sales',
    icon: DollarSign,
    trigger: 'QUOTE_SENT',
    actions: ['SEND_EMAIL'],
    config: {
      triggers: [{ type: 'QUOTE_SENT', isEnabled: true }],
      conditions: [
        {
          field: 'daysUntilExpiry',
          operator: 'LESS_OR_EQUAL',
          value: '3',
          logic: 'AND',
          sortOrder: 0,
        },
      ],
      actions: [
        {
          type: 'SEND_EMAIL',
          sortOrder: 0,
          delay: 86400000,
          isEnabled: true,
          config: { subject: 'Sua proposta expira em breve!' },
        },
      ],
    },
  },
  {
    id: 'payment_reminder',
    name: 'Cobrança',
    description: 'Envia lembretes de cobrança para faturas vencidas.',
    category: 'finance',
    icon: DollarSign,
    trigger: 'DEAL_WON',
    actions: ['SEND_EMAIL', 'SEND_WHATSAPP'],
    config: {
      triggers: [{ type: 'DEAL_WON', isEnabled: true }],
      conditions: [
        {
          field: 'paymentStatus',
          operator: 'EQUALS',
          value: 'overdue',
          logic: 'AND',
          sortOrder: 0,
        },
      ],
      actions: [
        {
          type: 'SEND_EMAIL',
          sortOrder: 0,
          delay: 0,
          isEnabled: true,
          config: { subject: 'Fatura vencida - {{companyName}}' },
        },
        {
          type: 'SEND_WHATSAPP',
          sortOrder: 1,
          delay: 86400000,
          isEnabled: true,
          config: { message: 'Sua fatura está vencida. Regularize para evitar bloqueios.' },
        },
      ],
    },
  },
  {
    id: 'birthday',
    name: 'Aniversário',
    description: 'Envia mensagem de feliz aniversário para contatos aniversariantes.',
    category: 'marketing',
    icon: Gift,
    trigger: 'CONTACT_CREATED',
    actions: ['SEND_EMAIL', 'SEND_WHATSAPP'],
    config: {
      triggers: [
        { type: 'CONTACT_CREATED', isEnabled: true, config: { cronExpression: '0 9 * * *' } },
      ],
      conditions: [
        { field: 'birthday.isToday', operator: 'IS_TRUE', value: '', logic: 'AND', sortOrder: 0 },
      ],
      actions: [
        {
          type: 'SEND_WHATSAPP',
          sortOrder: 0,
          delay: 0,
          isEnabled: true,
          config: { message: 'Feliz aniversário, {{firstName}}! 🎉' },
        },
        {
          type: 'SEND_EMAIL',
          sortOrder: 1,
          delay: 0,
          isEnabled: true,
          config: { subject: 'Feliz Aniversário, {{firstName}}!' },
        },
      ],
    },
  },
  {
    id: 'opportunity_recovery',
    name: 'Recuperação de Oportunidade',
    description: 'Ao perder um negócio, cria follow-up automático para tentar recuperar.',
    category: 'sales',
    icon: RefreshCw,
    trigger: 'DEAL_LOST',
    actions: ['CREATE_TASK', 'SEND_EMAIL'],
    config: {
      triggers: [{ type: 'DEAL_LOST', isEnabled: true }],
      conditions: [
        {
          field: 'lostReason',
          operator: 'CONTAINS',
          value: 'preco',
          logic: 'OR',
          sortOrder: 0,
          groupId: '1',
        },
        {
          field: 'value',
          operator: 'GREATER_THAN',
          value: '5000',
          logic: 'OR',
          sortOrder: 1,
          groupId: '1',
        },
      ],
      actions: [
        {
          type: 'CREATE_TASK',
          sortOrder: 0,
          delay: 86400000,
          isEnabled: true,
          config: { title: 'Oferecer condição especial para {{companyName}}' },
        },
        {
          type: 'SEND_EMAIL',
          sortOrder: 1,
          delay: 604800000,
          isEnabled: true,
          config: { subject: 'Preparamos uma proposta especial para você' },
        },
      ],
    },
  },
  {
    id: 'auto_pipeline',
    name: 'Pipeline Automático',
    description: 'Move negócios automaticamente entre etapas do pipeline baseado em ações.',
    category: 'automation',
    icon: Workflow,
    trigger: 'ACTIVITY_COMPLETED',
    actions: ['MOVE_PIPELINE', 'SEND_NOTIFICATION'],
    config: {
      triggers: [{ type: 'ACTIVITY_COMPLETED', isEnabled: true }],
      conditions: [
        { field: 'activityType', operator: 'EQUALS', value: 'call', logic: 'AND', sortOrder: 0 },
      ],
      actions: [
        {
          type: 'MOVE_PIPELINE',
          sortOrder: 0,
          delay: 0,
          isEnabled: true,
          config: { targetStageId: '' },
        },
        {
          type: 'SEND_NOTIFICATION',
          sortOrder: 1,
          delay: 0,
          isEnabled: true,
          config: { title: 'Negócio movido no pipeline' },
        },
      ],
    },
  },
];

export default function AutomationTemplatesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [newName, setNewName] = useState('');

  const { data: serverTemplates, isLoading } = useQuery({
    queryKey: ['automations', 'templates'],
    queryFn: () => api.get('/automations/templates').then((r) => r.data),
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const res = await api.post('/automations', {
        name: newName || template.name,
        description: template.description,
        tags: [template.category],
        triggers: template.config?.triggers || [],
        conditions: template.config?.conditions || [],
        actions: template.config?.actions || [],
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setShowUseDialog(false);
      router.push(`/automations/${data.id}`);
    },
  });

  const allTemplates = [
    ...BUILT_IN_TEMPLATES,
    ...(Array.isArray(serverTemplates)
      ? serverTemplates.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          category: t.category || 'custom',
          icon: Zap,
          trigger: t.triggers?.[0]?.type || 'MANUAL',
          actions: t.actions || [],
          config: t,
          isServer: true,
        }))
      : []),
  ];

  const filtered = search
    ? allTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase()),
      )
    : allTemplates;

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/automations">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          </div>
          <p className="text-muted-foreground">
            Use templates prontos para criar automações rapidamente.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
          : filtered.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:border-primary/50 transition-colors h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <template.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.trigger}
                      </Badge>
                      {Array.isArray(template.actions) &&
                        template.actions.map((a: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {typeof a === 'string' ? a : a.type || 'Ação'}
                          </Badge>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setNewName(template.name);
                        setShowUseDialog(true);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Usar Template
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Automação a partir do Template</DialogTitle>
            <DialogDescription>
              Configure o nome da nova automação baseada no template selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tname">Nome da Automação</Label>
              <Input id="tname" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newName.trim() || useTemplateMutation.isPending}
              onClick={() => selectedTemplate && useTemplateMutation.mutate(selectedTemplate)}
            >
              {useTemplateMutation.isPending ? 'Criando...' : 'Criar Automação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
