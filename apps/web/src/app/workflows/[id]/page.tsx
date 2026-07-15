'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft,
  Save,
  Play,
  FlaskConical,
  Send,
  Undo2,
  Redo2,
  History,
  GitBranch,
  Target,
  CheckSquare,
  Mail,
  MessageCircle,
  Bell,
  Globe,
  Webhook,
  Workflow,
  Brain,
  Code2,
  Settings,
  Clock,
  AlertCircle,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const nodeColors: Record<string, string> = {
  TRIGGER: 'border-green-500 bg-green-50 dark:bg-green-950',
  CONDITION: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  IF: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  ELSE: 'border-orange-500 bg-orange-50 dark:bg-orange-950',
  DELAY: 'border-purple-500 bg-purple-50 dark:bg-purple-950',
  WAIT: 'border-purple-500 bg-purple-50 dark:bg-purple-950',
  LOOP: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950',
  SWITCH: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950',
  EMAIL: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
  WHATSAPP: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950',
  SMS: 'border-teal-500 bg-teal-50 dark:bg-teal-950',
  PUSH: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950',
  WEBHOOK: 'border-sky-500 bg-sky-50 dark:bg-sky-950',
  HTTP_REQUEST: 'border-sky-500 bg-sky-50 dark:bg-sky-950',
  DATABASE: 'border-slate-500 bg-slate-50 dark:bg-slate-950',
  SCRIPT: 'border-rose-500 bg-rose-50 dark:bg-rose-950',
  AI: 'border-pink-500 bg-pink-50 dark:bg-pink-950',
  END: 'border-red-500 bg-red-50 dark:bg-red-950',
  MOVE_PIPELINE: 'border-violet-500 bg-violet-50 dark:bg-violet-950',
  SEND_NOTIFICATION: 'border-amber-500 bg-amber-50 dark:bg-amber-950',
  UPDATE_FIELDS: 'border-lime-500 bg-lime-50 dark:bg-lime-950',
  CREATE_LEAD: 'border-green-600 bg-green-50 dark:bg-green-950',
  CREATE_CONTACT: 'border-blue-600 bg-blue-50 dark:bg-blue-950',
  CREATE_COMPANY: 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950',
  CREATE_DEAL: 'border-orange-600 bg-orange-50 dark:bg-orange-950',
  CREATE_TASK: 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950',
  CREATE_ACTIVITY: 'border-teal-600 bg-teal-50 dark:bg-teal-950',
  CREATE_DOCUMENT: 'border-stone-600 bg-stone-50 dark:bg-stone-950',
};

const nodeIcons: Record<string, React.ReactNode> = {
  TRIGGER: <Target className="h-4 w-4" />,
  CONDITION: <AlertCircle className="h-4 w-4" />,
  IF: <GitBranch className="h-4 w-4" />,
  ELSE: <GitBranch className="h-4 w-4" />,
  DELAY: <Clock className="h-4 w-4" />,
  WAIT: <Clock className="h-4 w-4" />,
  LOOP: <Workflow className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  WHATSAPP: <MessageCircle className="h-4 w-4" />,
  SMS: <MessageCircle className="h-4 w-4" />,
  PUSH: <Bell className="h-4 w-4" />,
  WEBHOOK: <Webhook className="h-4 w-4" />,
  HTTP_REQUEST: <Globe className="h-4 w-4" />,
  SCRIPT: <Code2 className="h-4 w-4" />,
  AI: <Brain className="h-4 w-4" />,
  END: <CheckSquare className="h-4 w-4" />,
};

const nodeLabels: Record<string, string> = {
  TRIGGER: 'Trigger',
  CONDITION: 'Condicao',
  IF: 'Se',
  ELSE: 'Senao',
  DELAY: 'Delay',
  WAIT: 'Aguardar',
  LOOP: 'Loop',
  SWITCH: 'Switch',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  PUSH: 'Push',
  WEBHOOK: 'Webhook',
  HTTP_REQUEST: 'HTTP',
  DATABASE: 'Database',
  SCRIPT: 'Script',
  AI: 'IA',
  END: 'Fim',
  MOVE_PIPELINE: 'Pipeline',
  SEND_NOTIFICATION: 'Notificacao',
  UPDATE_FIELDS: 'Atualizar',
  CREATE_LEAD: 'Criar Lead',
  CREATE_CONTACT: 'Criar Contato',
  CREATE_COMPANY: 'Criar Empresa',
  CREATE_DEAL: 'Criar Deal',
  CREATE_TASK: 'Criar Tarefa',
  CREATE_ACTIVITY: 'Criar Atividade',
  CREATE_DOCUMENT: 'Criar Documento',
};

const nodeTypeCategories = [
  { label: 'Triggers', items: ['TRIGGER'] },
  { label: 'Condicoes', items: ['IF', 'ELSE', 'CONDITION', 'SWITCH'] },
  { label: 'Controle', items: ['DELAY', 'WAIT', 'LOOP'] },
  { label: 'Comunicacao', items: ['EMAIL', 'WHATSAPP', 'SMS', 'PUSH', 'SEND_NOTIFICATION'] },
  { label: 'Integracoes', items: ['WEBHOOK', 'HTTP_REQUEST'] },
  {
    label: 'CRM',
    items: [
      'CREATE_LEAD',
      'CREATE_CONTACT',
      'CREATE_COMPANY',
      'CREATE_DEAL',
      'CREATE_TASK',
      'CREATE_ACTIVITY',
      'CREATE_DOCUMENT',
      'MOVE_PIPELINE',
      'UPDATE_FIELDS',
    ],
  },
  { label: 'Avancado', items: ['AI', 'SCRIPT', 'DATABASE'] },
  { label: 'Fluxo', items: ['END'] },
];

function WorkflowNodeComponent({ data }: { data: { label: string; type: string; config?: any } }) {
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 shadow-sm min-w-[140px] cursor-pointer transition-shadow hover:shadow-md',
        nodeColors[data.type] || 'border-gray-500 bg-gray-50 dark:bg-gray-900',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {nodeIcons[data.type] || <Settings className="h-4 w-4" />}
        <span>{data.label}</span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

let nodeIdCounter = 0;
function generateNodeId() {
  nodeIdCounter += 1;
  return `node_${Date.now()}_${nodeIdCounter}`;
}

export default function WorkflowEditorPage() {
  const { user } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const workflowId = params.id as string;
  const [name, setName] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [showHistory, setShowHistory] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [undoStack, setUndoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const { data } = await api.get(`/workflows/${workflowId}`);
      return data;
    },
    enabled: !!workflowId,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useState(() => {
    if (workflow) {
      setName(workflow.name || '');
      setStatus(workflow.status || 'DRAFT');
      const parsedNodes = (workflow.nodes || []).map((n: any) => ({
        ...n,
        type: 'workflowNode',
      }));
      setNodes(parsedNodes);
      setEdges(workflow.edges || []);
    }
  });

  const onConnect = useCallback(
    (connection: Connection) => {
      saveUndoState();
      setEdges((eds) => addEdge({ ...connection, animated: true, type: 'smoothstep' }, eds));
    },
    [setEdges],
  );

  function saveUndoState() {
    setUndoStack((prev) => [...prev.slice(-50), { nodes: [...nodes], edges: [...edges] }]);
    setRedoStack([]);
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, { nodes: [...nodes], edges: [...edges] }]);
    setUndoStack((u) => u.slice(0, -1));
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, { nodes: [...nodes], edges: [...edges] }]);
    setRedoStack((r) => r.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/workflows/${workflowId}`, {
        name,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data?.type || 'TRIGGER',
          label: n.data?.label || '',
          position: n.position,
          config: n.data?.config || {},
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      toast.success('Workflow salvo');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${workflowId}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      setStatus('PUBLISHED');
      toast.success('Workflow publicado');
    },
    onError: () => toast.error('Erro ao publicar'),
  });

  const runMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${workflowId}/run`, { trigger: 'manual', input: {} }),
    onSuccess: () => {
      toast.success('Workflow executado');
      queryClient.invalidateQueries({ queryKey: ['workflow-history', workflowId] });
    },
    onError: () => toast.error('Erro ao executar'),
  });

  const testMutation = useMutation({
    mutationFn: () => api.post(`/workflows/${workflowId}/test`, { trigger: 'manual', input: {} }),
    onSuccess: (res: any) => {
      toast.success(`Teste concluido: ${res.data?.status || 'OK'}`);
    },
    onError: () => toast.error('Erro no teste'),
  });

  function addNodeToCanvas(type: string) {
    saveUndoState();
    const newNode: Node = {
      id: generateNodeId(),
      type: 'workflowNode',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 300 },
      data: { label: nodeLabels[type] || type, type, config: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  if (!user) return null;

  const statusColors: Record<string, string> = {
    DRAFT: 'secondary',
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    PUBLISHED: 'success',
    ERROR: 'destructive',
  };

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
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-background shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.push('/workflows')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            className="max-w-[300px] font-semibold text-lg border-0 focus-visible:ring-0"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do Workflow"
          />
          <Badge variant={(statusColors[status] as any) || 'secondary'}>{status}</Badge>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={undo} disabled={undoStack.length === 0}>
            <Undo2 className="h-4 w-4 mr-1" /> Desfazer
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 className="h-4 w-4 mr-1" /> Refazer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            Painel
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="h-4 w-4 mr-1" /> Historico
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)}>
            <GitBranch className="h-4 w-4 mr-1" /> Versoes
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            <FlaskConical className="h-4 w-4 mr-1" /> Testar
          </Button>
          {status !== 'PUBLISHED' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" /> Publicar
            </Button>
          )}
          <Button
            size="sm"
            variant="default"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
          >
            <Play className="h-4 w-4 mr-1" /> Executar
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {showSidebar && (
            <div className="w-56 border-r bg-card overflow-y-auto shrink-0 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Nodes</p>
              {nodeTypeCategories.map((cat) => (
                <div key={cat.label}>
                  <p className="text-xs text-muted-foreground mb-1 px-1">{cat.label}</p>
                  <div className="space-y-1">
                    {cat.items.map((type) => (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/reactflow-type', type);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => addNodeToCanvas(type)}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs cursor-grab active:cursor-grabbing hover:bg-accent transition-colors',
                          nodeColors[type] || 'border-gray-300',
                        )}
                      >
                        {nodeIcons[type] || <Settings className="h-3 w-3" />}
                        <span className="truncate">{nodeLabels[type] || type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-96 w-full m-6" />
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                snapToGrid
                snapGrid={[20, 20]}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
                onDrop={(e) => {
                  e.preventDefault();
                  const type = e.dataTransfer.getData('application/reactflow-type');
                  if (!type) return;
                  saveUndoState();
                  const position = { x: e.clientX - 300, y: e.clientY - 150 };
                  const newNode: Node = {
                    id: generateNodeId(),
                    type: 'workflowNode',
                    position,
                    data: { label: nodeLabels[type] || type, type, config: {} },
                  };
                  setNodes((nds) => [...nds, newNode]);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
              >
                <Controls />
                <MiniMap
                  nodeColor={(n) => {
                    const colorMap: Record<string, string> = {
                      TRIGGER: '#22c55e',
                      CONDITION: '#eab308',
                      IF: '#eab308',
                      ELSE: '#f97316',
                      DELAY: '#a855f7',
                      WAIT: '#a855f7',
                      EMAIL: '#3b82f6',
                      WHATSAPP: '#10b981',
                      SMS: '#14b8a6',
                      PUSH: '#06b6d4',
                      AI: '#ec4899',
                      END: '#ef4444',
                    };
                    return colorMap[n.data?.type] || '#6b7280';
                  }}
                />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              </ReactFlow>
            )}
          </div>
        </div>

        {showHistory && (
          <div className="h-48 border-t bg-card overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Historico de Execucoes</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <WorkflowHistoryPanel workflowId={workflowId} />
          </div>
        )}

        {showVersions && (
          <div className="h-48 border-t bg-card overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Historico de Versoes</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowVersions(false)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <WorkflowVersionsPanel workflowId={workflowId} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function WorkflowHistoryPanel({ workflowId }: { workflowId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['workflow-history', workflowId],
    queryFn: async () => {
      const { data: res } = await api.get(`/workflows/${workflowId}/history`, {
        params: { page: 1, limit: 20 },
      });
      return res;
    },
    enabled: !!workflowId,
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const executions = data?.data || [];

  if (executions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma execucao encontrada</p>;
  }

  return (
    <div className="space-y-2">
      {executions.map((exec: any) => (
        <div key={exec.id} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/30">
          <Badge
            variant={
              exec.status === 'COMPLETED'
                ? 'success'
                : exec.status === 'FAILED'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {exec.status}
          </Badge>
          <span className="text-muted-foreground">{exec.trigger || 'manual'}</span>
          <span className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {exec.duration ? `${exec.duration}ms` : '—'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(exec.createdAt).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
}

function WorkflowVersionsPanel({ workflowId }: { workflowId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['workflow-versions', workflowId],
    queryFn: async () => {
      const { data: res } = await api.get(`/workflows/${workflowId}/versions`);
      return res;
    },
    enabled: !!workflowId,
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const versions = Array.isArray(data) ? data : [];

  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma versao anterior</p>;
  }

  return (
    <div className="space-y-2">
      {versions.map((v: any) => (
        <div key={v.id} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/30">
          <Badge variant="outline">v{v.version}</Badge>
          <span className="text-muted-foreground">{v.reason || 'Snapshot'}</span>
          <span className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {new Date(v.createdAt).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
}
