'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Workflow,
  Copy,
  ArrowLeft,
  Target,
  Mail,
  MessageCircle,
  Users,
  Phone,
  Bot,
  CheckSquare,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const templateIcons: Record<string, React.ReactNode> = {
  lead_welcome: <Target className="h-6 w-6" />,
  lead_followup: <Mail className="h-6 w-6" />,
  whatsapp_greeting: <MessageCircle className="h-6 w-6" />,
  deal_pipeline: <Workflow className="h-6 w-6" />,
  contract_signing: <CheckSquare className="h-6 w-6" />,
  contact_onboarding: <Users className="h-6 w-6" />,
  task_reminder: <Bot className="h-6 w-6" />,
  company_created: <Phone className="h-6 w-6" />,
};

const templates = [
  {
    id: 'tpl-lead-welcome',
    name: 'Boas-vindas ao Lead',
    description: 'Quando um lead for criado, envia email de boas-vindas e cria tarefa de follow-up',
    category: 'lead_welcome',
    trigger: 'lead.created',
    nodes: [
      {
        id: 't1',
        type: 'TRIGGER',
        label: 'Lead Criado',
        position: { x: 250, y: 0 },
        data: { type: 'TRIGGER', label: 'Lead Criado', config: { triggerType: 'lead.created' } },
      },
      {
        id: 't2',
        type: 'EMAIL',
        label: 'Email Boas-vindas',
        position: { x: 250, y: 100 },
        data: {
          type: 'EMAIL',
          label: 'Email Boas-vindas',
          config: { to: '{{lead.email}}', subject: 'Bem-vindo!', body: 'Ola {{lead.firstName}}!' },
        },
      },
      {
        id: 't3',
        type: 'CREATE_TASK',
        label: 'Criar Follow-up',
        position: { x: 250, y: 200 },
        data: {
          type: 'CREATE_TASK',
          label: 'Criar Follow-up',
          config: { title: 'Follow-up {{lead.firstName}}', assigneeId: '{{lead.ownerId}}' },
        },
      },
      {
        id: 't4',
        type: 'END',
        label: 'Fim',
        position: { x: 250, y: 300 },
        data: { type: 'END', label: 'Fim', config: {} },
      },
    ],
    edges: [
      { id: 'e1', source: 't1', target: 't2', animated: true, type: 'smoothstep' },
      { id: 'e2', source: 't2', target: 't3', animated: true, type: 'smoothstep' },
      { id: 'e3', source: 't3', target: 't4', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'tpl-lead-followup',
    name: 'Follow-up de Lead',
    description: 'Apos lead ser qualificado, envia email personalizado e notifica responsavel',
    category: 'lead_followup',
    trigger: 'lead.qualified',
    nodes: [
      {
        id: 'f1',
        type: 'TRIGGER',
        label: 'Lead Qualificado',
        position: { x: 250, y: 0 },
        data: {
          type: 'TRIGGER',
          label: 'Lead Qualificado',
          config: { triggerType: 'lead.converted' },
        },
      },
      {
        id: 'f2',
        type: 'IF',
        label: 'Tem Email?',
        position: { x: 250, y: 100 },
        data: { type: 'IF', label: 'Tem Email?', config: { field: 'email', operator: 'notEmpty' } },
      },
      {
        id: 'f3',
        type: 'EMAIL',
        label: 'Email Personalizado',
        position: { x: 100, y: 200 },
        data: { type: 'EMAIL', label: 'Email Personalizado', config: {} },
      },
      {
        id: 'f4',
        type: 'SEND_NOTIFICATION',
        label: 'Notificar',
        position: { x: 400, y: 200 },
        data: { type: 'SEND_NOTIFICATION', label: 'Notificar', config: {} },
      },
      {
        id: 'f5',
        type: 'END',
        label: 'Fim',
        position: { x: 250, y: 300 },
        data: { type: 'END', label: 'Fim', config: {} },
      },
    ],
    edges: [
      { id: 'fe1', source: 'f1', target: 'f2', animated: true, type: 'smoothstep' },
      {
        id: 'fe2',
        source: 'f2',
        target: 'f3',
        sourceHandle: 'true',
        animated: true,
        type: 'smoothstep',
      },
      {
        id: 'fe3',
        source: 'f2',
        target: 'f4',
        sourceHandle: 'false',
        animated: true,
        type: 'smoothstep',
      },
      { id: 'fe4', source: 'f3', target: 'f5', animated: true, type: 'smoothstep' },
      { id: 'fe5', source: 'f4', target: 'f5', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'tpl-deal-pipeline',
    name: 'Pipeline de Negocio',
    description: 'Move deal entre etapas, cria tarefas e notifica equipe automaticamente',
    category: 'deal_pipeline',
    trigger: 'deal.created',
    nodes: [
      {
        id: 'd1',
        type: 'TRIGGER',
        label: 'Deal Criado',
        position: { x: 250, y: 0 },
        data: { type: 'TRIGGER', label: 'Deal Criado', config: { triggerType: 'deal.created' } },
      },
      {
        id: 'd2',
        type: 'CREATE_TASK',
        label: 'Tarefa Inicial',
        position: { x: 250, y: 100 },
        data: {
          type: 'CREATE_TASK',
          label: 'Tarefa Inicial',
          config: { title: 'Qualificar {{deal.title}}' },
        },
      },
      {
        id: 'd3',
        type: 'MOVE_PIPELINE',
        label: 'Mover Pipeline',
        position: { x: 250, y: 200 },
        data: { type: 'MOVE_PIPELINE', label: 'Mover Pipeline', config: { stageId: 'next' } },
      },
      {
        id: 'd4',
        type: 'END',
        label: 'Fim',
        position: { x: 250, y: 300 },
        data: { type: 'END', label: 'Fim', config: {} },
      },
    ],
    edges: [
      { id: 'de1', source: 'd1', target: 'd2', animated: true, type: 'smoothstep' },
      { id: 'de2', source: 'd2', target: 'd3', animated: true, type: 'smoothstep' },
      { id: 'de3', source: 'd3', target: 'd4', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'tpl-contract-signed',
    name: 'Contrato Assinado',
    description: 'Quando contrato for assinado, cria deal ganho, tarefas e notifica time',
    category: 'contract_signing',
    trigger: 'contract.signed',
    nodes: [
      {
        id: 'c1',
        type: 'TRIGGER',
        label: 'Contrato Assinado',
        position: { x: 250, y: 0 },
        data: {
          type: 'TRIGGER',
          label: 'Contrato Assinado',
          config: { triggerType: 'contract.signed' },
        },
      },
      {
        id: 'c2',
        type: 'UPDATE_FIELDS',
        label: 'Atualizar Deal',
        position: { x: 250, y: 100 },
        data: {
          type: 'UPDATE_FIELDS',
          label: 'Atualizar Deal',
          config: { entity: 'deal', status: 'WON' },
        },
      },
      {
        id: 'c3',
        type: 'CREATE_ACTIVITY',
        label: 'Criar Atividade',
        position: { x: 250, y: 200 },
        data: {
          type: 'CREATE_ACTIVITY',
          label: 'Criar Atividade',
          config: { type: 'CALL', subject: 'Onboarding' },
        },
      },
      {
        id: 'c4',
        type: 'END',
        label: 'Fim',
        position: { x: 250, y: 300 },
        data: { type: 'END', label: 'Fim', config: {} },
      },
    ],
    edges: [
      { id: 'ce1', source: 'c1', target: 'c2', animated: true, type: 'smoothstep' },
      { id: 'ce2', source: 'c2', target: 'c3', animated: true, type: 'smoothstep' },
      { id: 'ce3', source: 'c3', target: 'c4', animated: true, type: 'smoothstep' },
    ],
  },
];

export default function WorkflowTemplatesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  const createFromTemplate = async (template: (typeof templates)[0]) => {
    setLoadingTemplate(template.id);
    try {
      const { data } = await api.post('/workflows', {
        name: template.name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        tags: ['template'],
        isTemplate: false,
      });
      toast.success('Workflow criado a partir do template');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      router.push(`/workflows/${data.id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao criar workflow');
    } finally {
      setLoadingTemplate(null);
    }
  };

  if (!user) return null;

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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/workflows')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Templates de Workflow</h1>
            <p className="text-muted-foreground">Modelos prontos para acelerar suas automacoes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {templateIcons[template.category] || <Workflow className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {template.nodes.length} nodes
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {template.edges.length} conexoes
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Trigger: {template.trigger}
                  </Badge>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createFromTemplate(template)}
                  disabled={loadingTemplate === template.id}
                >
                  {loadingTemplate === template.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Criando...
                    </span>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" /> Usar Template
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
