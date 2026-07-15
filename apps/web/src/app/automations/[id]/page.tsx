'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Play,
  TestTube,
  Rocket,
  Plus,
  Trash2,
  Copy,
  Zap,
  AlertCircle,
  Clock,
  Settings,
  Code,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Workflow,
  User,
  Users,
  Building2,
  Phone,
  FileText,
  Tag,
  Upload,
  TrendingUp,
  Bot,
  PenLine,
  History,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TRIGGER_TYPES = [
  { value: 'LEAD_CREATED', label: 'Lead Criado', icon: User },
  { value: 'LEAD_UPDATED', label: 'Lead Atualizado', icon: User },
  { value: 'LEAD_CONVERTED', label: 'Lead Convertido', icon: TrendingUp },
  { value: 'DEAL_CREATED', label: 'Negócio Criado', icon: Workflow },
  { value: 'DEAL_WON', label: 'Negócio Ganho', icon: TrendingUp },
  { value: 'DEAL_LOST', label: 'Negócio Perdido', icon: AlertCircle },
  { value: 'CONTACT_CREATED', label: 'Contato Criado', icon: Phone },
  { value: 'COMPANY_CREATED', label: 'Empresa Criada', icon: Building2 },
  { value: 'PRODUCT_CREATED', label: 'Produto Criado', icon: Tag },
  { value: 'CONTRACT_CREATED', label: 'Contrato Criado', icon: FileText },
  { value: 'CONTRACT_EXPIRING', label: 'Contrato Expirando', icon: Clock },
  { value: 'CONTRACT_RENEWED', label: 'Contrato Renovado', icon: FileText },
  { value: 'QUOTE_SENT', label: 'Proposta Enviada', icon: Mail },
  { value: 'QUOTE_ACCEPTED', label: 'Proposta Aceita', icon: CheckCircle2 },
  { value: 'ACTIVITY_CREATED', label: 'Atividade Criada', icon: Activity },
  { value: 'TASK_COMPLETED', label: 'Tarefa Concluída', icon: CheckCircle2 },
  { value: 'FORM_SUBMITTED', label: 'Formulário Enviado', icon: FileText },
  { value: 'WORKFLOW_COMPLETED', label: 'Workflow Concluído', icon: Workflow },
  { value: 'USER_CREATED', label: 'Usuário Criado', icon: Users },
  { value: 'WEBHOOK_RECEIVED', label: 'Webhook Recebido', icon: Globe },
  { value: 'CUSTOM_EVENT', label: 'Evento Personalizado', icon: Code },
  { value: 'MANUAL', label: 'Manual', icon: Play },
];

const ACTION_TYPES = [
  { value: 'SEND_EMAIL', label: 'Enviar Email', icon: Mail },
  { value: 'SEND_WHATSAPP', label: 'Enviar WhatsApp', icon: MessageSquare },
  { value: 'SEND_SMS', label: 'Enviar SMS', icon: Smartphone },
  { value: 'SEND_PUSH', label: 'Enviar Push', icon: Bell },
  { value: 'SEND_NOTIFICATION', label: 'Criar Notificação', icon: Bell },
  { value: 'CREATE_LEAD', label: 'Criar Lead', icon: User },
  { value: 'CREATE_CONTACT', label: 'Criar Contato', icon: Phone },
  { value: 'CREATE_COMPANY', label: 'Criar Empresa', icon: Building2 },
  { value: 'CREATE_DEAL', label: 'Criar Negócio', icon: Workflow },
  { value: 'CREATE_TASK', label: 'Criar Tarefa', icon: CheckCircle2 },
  { value: 'CREATE_ACTIVITY', label: 'Criar Atividade', icon: Activity },
  { value: 'CREATE_PRODUCT', label: 'Criar Produto', icon: Tag },
  { value: 'CREATE_DOCUMENT', label: 'Criar Documento', icon: FileText },
  { value: 'MOVE_PIPELINE', label: 'Mover Pipeline', icon: TrendingUp },
  { value: 'UPDATE_DEAL', label: 'Atualizar Negócio', icon: PenLine },
  { value: 'UPDATE_CONTACT', label: 'Atualizar Contato', icon: PenLine },
  { value: 'UPDATE_FIELDS', label: 'Atualizar Campos', icon: Settings },
  { value: 'EXECUTE_WORKFLOW', label: 'Executar Workflow', icon: Workflow },
  { value: 'EXECUTE_AI', label: 'Executar IA', icon: Bot },
  { value: 'EXECUTE_API', label: 'Executar API REST', icon: Globe },
  { value: 'EXECUTE_SCRIPT', label: 'Executar Script', icon: Code },
  { value: 'WEBHOOK', label: 'Webhook', icon: Globe },
  { value: 'CREATE_TIMELINE', label: 'Criar Timeline', icon: History },
  { value: 'CREATE_AUDIT', label: 'Criar Auditoria', icon: FileText },
  { value: 'CREATE_COMMENT', label: 'Criar Comentário', icon: MessageSquare },
  { value: 'CREATE_TAG', label: 'Criar Tag', icon: Tag },
  { value: 'ADD_FILE', label: 'Adicionar Arquivo', icon: Upload },
];

const CONDITION_OPERATORS = [
  { value: 'EQUALS', label: 'Igual' },
  { value: 'NOT_EQUALS', label: 'Diferente' },
  { value: 'GREATER_THAN', label: 'Maior que' },
  { value: 'LESS_THAN', label: 'Menor que' },
  { value: 'GREATER_OR_EQUAL', label: 'Maior ou igual' },
  { value: 'LESS_OR_EQUAL', label: 'Menor ou igual' },
  { value: 'CONTAINS', label: 'Contém' },
  { value: 'NOT_CONTAINS', label: 'Não contém' },
  { value: 'STARTS_WITH', label: 'Começa com' },
  { value: 'ENDS_WITH', label: 'Termina com' },
  { value: 'IS_EMPTY', label: 'Está vazio' },
  { value: 'IS_NOT_EMPTY', label: 'Não está vazio' },
  { value: 'IN', label: 'Está em' },
  { value: 'NOT_IN', label: 'Não está em' },
  { value: 'BETWEEN', label: 'Entre' },
  { value: 'REGEX', label: 'Regex' },
  { value: 'BEFORE', label: 'Antes de' },
  { value: 'AFTER', label: 'Depois de' },
  { value: 'IS_TRUE', label: 'É verdadeiro' },
  { value: 'IS_FALSE', label: 'É falso' },
];

import { CheckCircle2 } from 'lucide-react';

interface Trigger {
  id?: string;
  type: string;
  config?: Record<string, unknown>;
  isEnabled: boolean;
}

interface Condition {
  id?: string;
  field: string;
  operator: string;
  value: string;
  logic: string;
  groupId?: string;
  sortOrder: number;
}

interface Action {
  id?: string;
  type: string;
  config?: Record<string, unknown>;
  sortOrder: number;
  delay: number;
  isEnabled: boolean;
}

interface Variable {
  id?: string;
  name: string;
  key: string;
  value: string;
  type: string;
  isSecret: boolean;
}

export default function AutomationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('DRAFT');
  const [priority, setPriority] = useState(0);
  const [maxRetries, setMaxRetries] = useState(3);
  const [cooldown, setCooldown] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [stopOnError, setStopOnError] = useState(false);

  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);

  const [testResult, setTestResult] = useState<any>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testInput, setTestInput] = useState('{}');

  const { data: automationData, isLoading } = useQuery({
    queryKey: ['automation', id],
    queryFn: () => api.get(`/automations/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (automationData) {
      const data = automationData as any;
      setName(data.name || '');
      setDescription(data.description || '');
      setStatus(data.status || 'DRAFT');
      setPriority(data.priority || 0);
      setMaxRetries(data.maxRetries || 3);
      setCooldown(data.cooldown || 0);
      setTags(data.tags || []);
      setStopOnError(data.config?.stopOnError || false);
      setTriggers(data.triggers || []);
      setConditions(data.conditions || []);
      setActions(data.actions || []);
      setVariables(data.variables || []);
    }
  }, [automationData]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/automations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', id] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/automations/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', id] });
      setStatus('ACTIVE');
    },
  });

  const runMutation = useMutation({
    mutationFn: () => api.post(`/automations/${id}/run`, { trigger: 'MANUAL', input: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', id] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (input: any) => api.post(`/automations/${id}/test`, { trigger: 'MANUAL', input }),
    onSuccess: (r: any) => {
      setTestResult(r.data);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => api.post(`/automations/${id}/duplicate`),
    onSuccess: (r: any) => {
      router.push(`/automations/${r.data.id}`);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      name,
      description,
      status,
      priority,
      maxRetries,
      cooldown,
      tags,
      config: { stopOnError },
      triggers,
      conditions,
      actions,
      variables,
    });
  };

  const addTrigger = () => {
    setTriggers([...triggers, { type: 'LEAD_CREATED', isEnabled: true }]);
  };

  const removeTrigger = (index: number) => {
    setTriggers(triggers.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    const groupId = crypto.randomUUID();
    setConditions([
      ...conditions,
      {
        field: '',
        operator: 'EQUALS',
        value: '',
        logic: 'AND',
        groupId,
        sortOrder: conditions.length,
      },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        type: 'SEND_EMAIL',
        config: { subject: '', body: '' },
        sortOrder: actions.length,
        delay: 0,
        isEnabled: true,
      },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const addVariable = () => {
    setVariables([...variables, { name: '', key: '', value: '', type: 'string', isSecret: false }]);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/automations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-2xl font-bold h-auto py-1 border-0 bg-transparent hover:bg-accent/50 focus:bg-accent/50 max-w-xl"
          />
          <Badge
            className={cn(
              status === 'ACTIVE' && 'bg-green-500/10 text-green-400',
              status === 'DRAFT' && 'bg-blue-500/10 text-blue-400',
            )}
          >
            {status === 'ACTIVE' ? 'Ativo' : 'Rascunho'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTestDialog(true)}>
            <TestTube className="h-4 w-4 mr-2" />
            Testar
          </Button>
          <Button variant="outline" onClick={() => runMutation.mutate()}>
            <Play className="h-4 w-4 mr-2" />
            Executar
          </Button>
          <Button variant="outline" onClick={() => publishMutation.mutate()}>
            <Rocket className="h-4 w-4 mr-2" />
            Publicar
          </Button>
          <Button variant="outline" onClick={() => duplicateMutation.mutate()}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição da automação..."
        className="border-0 bg-transparent hover:bg-accent/50 focus:bg-accent/50 text-muted-foreground"
      />

      <Tabs defaultValue="triggers">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="triggers">Gatilhos ({triggers.length})</TabsTrigger>
          <TabsTrigger value="conditions">Condições ({conditions.length})</TabsTrigger>
          <TabsTrigger value="actions">Ações ({actions.length})</TabsTrigger>
          <TabsTrigger value="variables">Variáveis ({variables.length})</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Defina quais eventos disparam esta automação. Você pode adicionar múltiplos gatilhos.
            </p>
            <Button variant="outline" size="sm" onClick={addTrigger}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Gatilho
            </Button>
          </div>
          {triggers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Nenhum gatilho configurado</p>
                <Button variant="outline" size="sm" onClick={addTrigger}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Gatilho
                </Button>
              </CardContent>
            </Card>
          ) : (
            triggers.map((trigger, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Select
                      value={trigger.type}
                      onValueChange={(v) => {
                        const updated = [...triggers];
                        updated[i].type = v;
                        setTriggers(updated);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-2">
                              <t.icon className="h-4 w-4" />
                              {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = [...triggers];
                        updated[i].isEnabled = !updated[i].isEnabled;
                        setTriggers(updated);
                      }}
                    >
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          trigger.isEnabled ? 'bg-green-500' : 'bg-zinc-500',
                        )}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeTrigger(i)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="conditions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Condições que precisam ser satisfeitas para as ações serem executadas.
            </p>
            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Condição
            </Button>
          </div>
          {conditions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Nenhuma condição configurada</p>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Condição
                </Button>
              </CardContent>
            </Card>
          ) : (
            conditions.map((cond, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {i > 0 && (
                      <Select
                        value={cond.logic}
                        onValueChange={(v) => {
                          const updated = [...conditions];
                          updated[i].logic = v;
                          setConditions(updated);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">E</SelectItem>
                          <SelectItem value="OR">OU</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      placeholder="Campo (ex: status)"
                      value={cond.field}
                      onChange={(e) => {
                        const updated = [...conditions];
                        updated[i].field = e.target.value;
                        setConditions(updated);
                      }}
                      className="flex-1 min-w-[150px]"
                    />
                    <Select
                      value={cond.operator}
                      onValueChange={(v) => {
                        const updated = [...conditions];
                        updated[i].operator = v;
                        setConditions(updated);
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Valor"
                      value={cond.value}
                      onChange={(e) => {
                        const updated = [...conditions];
                        updated[i].value = e.target.value;
                        setConditions(updated);
                      }}
                      className="flex-1 min-w-[150px]"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeCondition(i)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Ações que serão executadas quando os gatilhos forem disparados e as condições
              satisfeitas.
            </p>
            <Button variant="outline" size="sm" onClick={addAction}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Ação
            </Button>
          </div>
          {actions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Play className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Nenhuma ação configurada</p>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ação
                </Button>
              </CardContent>
            </Card>
          ) : (
            actions.map((action, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-muted-foreground font-mono w-6 text-right">
                      {i + 1}
                    </span>
                    <Select
                      value={action.type}
                      onValueChange={(v) => {
                        const updated = [...actions];
                        updated[i].type = v;
                        setActions(updated);
                      }}
                    >
                      <SelectTrigger className="flex-1 min-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            <span className="flex items-center gap-2">
                              <a.icon className="h-4 w-4" />
                              {a.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Delay (ms)"
                      value={action.delay}
                      onChange={(e) => {
                        const updated = [...actions];
                        updated[i].delay = parseInt(e.target.value) || 0;
                        setActions(updated);
                      }}
                      className="w-28"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = [...actions];
                        updated[i].isEnabled = !updated[i].isEnabled;
                        setActions(updated);
                      }}
                    >
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          action.isEnabled ? 'bg-green-500' : 'bg-zinc-500',
                        )}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeAction(i)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="variables" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Variáveis disponíveis para uso nas condições e ações.
            </p>
            <Button variant="outline" size="sm" onClick={addVariable}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Variável
            </Button>
          </div>
          {variables.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Code className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Nenhuma variável configurada</p>
                <Button variant="outline" size="sm" onClick={addVariable}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Variável
                </Button>
              </CardContent>
            </Card>
          ) : (
            variables.map((v, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Input
                      placeholder="Nome"
                      value={v.name}
                      onChange={(e) => {
                        const updated = [...variables];
                        updated[i].name = e.target.value;
                        setVariables(updated);
                      }}
                      className="flex-1 min-w-[120px]"
                    />
                    <Input
                      placeholder="Chave"
                      value={v.key}
                      onChange={(e) => {
                        const updated = [...variables];
                        updated[i].key = e.target.value;
                        setVariables(updated);
                      }}
                      className="flex-1 min-w-[120px]"
                    />
                    <Input
                      placeholder="Valor"
                      value={v.isSecret ? '••••••••' : v.value}
                      type={v.isSecret ? 'password' : 'text'}
                      onChange={(e) => {
                        const updated = [...variables];
                        updated[i].value = e.target.value;
                        setVariables(updated);
                      }}
                      className="flex-1 min-w-[120px]"
                    />
                    <Select
                      value={v.type}
                      onValueChange={(val) => {
                        const updated = [...variables];
                        updated[i].type = val;
                        setVariables(updated);
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = [...variables];
                        updated[i].isSecret = !updated[i].isSecret;
                        setVariables(updated);
                      }}
                    >
                      <div
                        className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          v.isSecret
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-zinc-500/10 text-zinc-400',
                        )}
                      >
                        {v.isSecret ? 'Secreto' : 'Público'}
                      </div>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeVariable(i)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Números maiores têm maior prioridade
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retries">Máximo de Tentativas</Label>
                  <Input
                    id="retries"
                    type="number"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Com backoff exponencial</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cooldown">Cooldown (ms)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    value={cooldown}
                    onChange={(e) => setCooldown(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Tempo mínimo entre execuções</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="tag1, tag2, tag3"
                    value={tags.join(', ')}
                    onChange={(e) =>
                      setTags(
                        e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="stopOnError"
                  checked={stopOnError}
                  onChange={(e) => setStopOnError(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="stopOnError" className="cursor-pointer">
                  Parar execução em caso de erro em qualquer ação
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/automations/${id}/history`} className="text-primary hover:underline">
          Ver Histórico de Execuções →
        </Link>
        <span>•</span>
        <Link href={`/automations/${id}/logs`} className="text-primary hover:underline">
          Ver Logs →
        </Link>
      </div>

      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Testar Automação</DialogTitle>
            <DialogDescription>
              Simule a execução da automação com dados de entrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Input (JSON)</Label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-lg border bg-background font-mono text-sm"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                try {
                  testMutation.mutate(JSON.parse(testInput));
                } catch {
                  testMutation.mutate({});
                }
              }}
              disabled={testMutation.isPending}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testMutation.isPending ? 'Testando...' : 'Executar Teste'}
            </Button>
            {testResult && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div
                    className={cn(
                      'flex items-center gap-2 font-semibold',
                      testResult.conditionsPassed ? 'text-green-400' : 'text-red-400',
                    )}
                  >
                    {testResult.conditionsPassed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {testResult.conditionsPassed
                      ? 'Condições satisfeitas'
                      : 'Condições não satisfeitas'}
                  </div>
                  <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  {testResult.actionsExecuted?.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-sm font-medium">Ações simuladas:</p>
                      {testResult.actionsExecuted.map((a: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm p-2 rounded bg-accent/50"
                        >
                          <span className="font-mono text-xs text-muted-foreground">{a.type}</span>
                          {a.simulated && (
                            <Badge variant="secondary" className="text-xs">
                              Simulado
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <pre className="text-xs font-mono bg-accent/50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
