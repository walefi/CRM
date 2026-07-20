'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Send,
  Bot,
  Brain,
  BookOpen,
  BarChart3,
  MessageSquare,
  Search,
  Loader2,
  ListTree,
  Target,
  Lightbulb,
  History,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Flame,
  Snowflake,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';

export default function AiPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('assistant');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<any>(null);
  const [usagePeriod, setUsagePeriod] = useState('month');
  const [scoreFilter, setScoreFilter] = useState('quente');

  const { data: dashboard } = useQuery({
    queryKey: ['ai', 'dashboard'],
    queryFn: () => api.get('/ai').then((r) => r.data),
  });

  const { data: agentsData } = useQuery({
    queryKey: ['ai', 'agents'],
    queryFn: () => api.get('/ai/agents').then((r) => r.data),
  });

  const { data: prompts } = useQuery({
    queryKey: ['ai', 'prompts'],
    queryFn: () => api.get('/ai/prompts').then((r) => r.data),
  });

  const { data: usage } = useQuery({
    queryKey: ['ai', 'usage', usagePeriod],
    queryFn: () => api.get('/ai/usage', { params: { period: usagePeriod } }).then((r) => r.data),
  });

  const { data: recommendations, refetch: refetchRecs } = useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: () => api.get('/ai/recommendations').then((r) => r.data),
    enabled: activeTab === 'recommendations',
  });

  const { data: scoreStats } = useQuery({
    queryKey: ['ai', 'score-stats'],
    queryFn: () => api.get('/ai/score/stats').then((r) => r.data),
    enabled: activeTab === 'scoring',
  });

  const { data: scoredLeads } = useQuery({
    queryKey: ['ai', 'score-classification', scoreFilter],
    queryFn: () => api.get(`/ai/score/classification/${scoreFilter}`).then((r) => r.data),
    enabled: activeTab === 'scoring',
  });

  const { data: insights } = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: () => api.get('/ai/insights').then((r) => r.data),
    enabled: activeTab === 'insights',
  });

  const { data: logs } = useQuery({
    queryKey: ['ai', 'logs'],
    queryFn: () => api.get('/ai/logs').then((r) => r.data),
    enabled: activeTab === 'history',
  });

  const askMutation = useMutation({
    mutationFn: (q: string) => api.post('/ai/ask', { question: q }),
    onSuccess: (r: any) => {
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: r.data.answer },
      ]);
      setMessage('');
    },
  });

  const scoreMutation = useMutation({
    mutationFn: (leadId: string) => api.post('/ai/score', { leadId }),
  });

  const batchScoreMutation = useMutation({
    mutationFn: () => api.post('/ai/score/batch'),
  });

  const acceptRecMutation = useMutation({
    mutationFn: (id: string) => api.post(`/ai/recommendations/${id}/accept`),
    onSuccess: () => refetchRecs(),
  });

  const dismissRecMutation = useMutation({
    mutationFn: (id: string) => api.post(`/ai/recommendations/${id}/dismiss`),
    onSuccess: () => refetchRecs(),
  });

  const ragMutation = useMutation({
    mutationFn: (q: string) => api.post('/ai/rag', { query: q }),
    onSuccess: (r: any) => setRagResults(r.data),
  });

  if (!user) return null;

  const scoreStatsData = dashboard?.scoreStats || scoreStats;
  const recsList = recommendations || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Platform</h1>
          <p className="text-muted-foreground mt-1">
            Inteligência Artificial centralizada para todo o CRM.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Flame className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scoreStatsData?.hotLeads || 0}</p>
                <p className="text-xs text-muted-foreground">Leads Quentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Snowflake className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scoreStatsData?.coldLeads || 0}</p>
                <p className="text-xs text-muted-foreground">Leads Frios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scoreStatsData?.avgScore || 0}</p>
                <p className="text-xs text-muted-foreground">Score Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Lightbulb className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recsList.length || 0}</p>
                <p className="text-xs text-muted-foreground">Recomendações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Brain className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {dashboard?.usage?.totalCalls || usage?.totalCalls || 0}
                </p>
                <p className="text-xs text-muted-foreground">Chamadas IA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="assistant">
            <Bot className="h-4 w-4 mr-2" /> Assistente
          </TabsTrigger>
          <TabsTrigger value="scoring">
            <Target className="h-4 w-4 mr-2" /> Lead Scoring
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb className="h-4 w-4 mr-2" /> Recomendações
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Zap className="h-4 w-4 mr-2" /> Insights
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" /> Chat
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot className="h-4 w-4 mr-2" /> Agentes
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <ListTree className="h-4 w-4 mr-2" /> Prompts
          </TabsTrigger>
          <TabsTrigger value="rag">
            <BookOpen className="h-4 w-4 mr-2" /> RAG
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="h-4 w-4 mr-2" /> Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-[400px] overflow-y-auto p-4 space-y-3">
                {chatHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Pergunte sobre leads, pipeline, negócios...</p>
                      <p className="text-xs mt-2">
                        Ex: "Quais leads têm maior chance de conversão?"
                      </p>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg: any, i: number) => (
                    <div
                      key={i}
                      className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap',
                          msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {askMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-4 py-3 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t p-3 flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && message.trim() && askMutation.mutate(message)
                  }
                  placeholder="Ex: Quais negócios estão parados? Tarefas atrasadas? Desempenho da equipe?"
                  className="flex-1"
                />
                <Button
                  onClick={() => askMutation.mutate(message)}
                  disabled={!message.trim() || askMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['frio', 'morno', 'interessado', 'quente', 'muitoQuente'].map((f) => (
                <Badge
                  key={f}
                  variant={scoreFilter === f ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setScoreFilter(f)}
                >
                  {f === 'muitoQuente' ? 'Muito Quente' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Badge>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => batchScoreMutation.mutate()}
              disabled={batchScoreMutation.isPending}
            >
              {batchScoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Target className="h-4 w-4 mr-1" />
              )}
              Recalcular Todos
            </Button>
          </div>
          {scoreStatsData && (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(scoreStatsData.classifications || {}).map(([key, val]) => (
                <Card key={key}>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{val as number}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{key}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {scoredLeads?.map((lead: any) => (
              <Card key={lead.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        (lead.score || 0) >= 60 ? 'bg-orange-500/10' : 'bg-blue-500/10',
                      )}
                    >
                      {(lead.score || 0) >= 60 ? (
                        <Flame className="h-4 w-4 text-orange-400" />
                      ) : (
                        <Snowflake className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.companyName || 'Sem empresa'} · {lead.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={(lead.score || 0) >= 60 ? 'default' : 'secondary'}>
                      Score: {lead.score || 0}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => scoreMutation.mutate(lead.id)}
                      disabled={scoreMutation.isPending}
                    >
                      <Target className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {scoredLeads?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum lead nesta categoria
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-4">
          <div className="flex justify-between">
            <p className="text-sm text-muted-foreground">{recsList.length} recomendações</p>
            <Button size="sm" onClick={() => refetchRecs()}>
              Atualizar
            </Button>
          </div>
          <div className="space-y-3">
            {recsList.map((rec: any) => (
              <Card key={rec.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          rec.priority === 'high'
                            ? 'bg-red-500/10'
                            : rec.priority === 'medium'
                              ? 'bg-yellow-500/10'
                              : 'bg-muted',
                        )}
                      >
                        <Lightbulb
                          className={cn(
                            'h-4 w-4',
                            rec.priority === 'high'
                              ? 'text-red-400'
                              : rec.priority === 'medium'
                                ? 'text-yellow-400'
                                : 'text-muted-foreground',
                          )}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {rec.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {rec.entityType}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {rec.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acceptRecMutation.mutate(rec.id)}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissRecMutation.mutate(rec.id)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {recsList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma recomendação pendente
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Leads por Status</p>
                  <div className="space-y-2">
                    {insights.leads?.byStatus?.map((s: any) => (
                      <div key={s.status} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{s.status}</span>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Negócios por Status</p>
                  <div className="space-y-2">
                    {insights.deals?.byStatus?.map((s: any) => (
                      <div key={s.status} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{s.status}</span>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Tarefas por Status</p>
                  <div className="space-y-2">
                    {insights.tasks?.byStatus?.map((s: any) => (
                      <div key={s.status} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{s.status}</span>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Atividades por Tipo</p>
                  <div className="space-y-2">
                    {insights.activities?.byType?.map((s: any) => (
                      <div key={s.type} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{s.type}</span>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Log de Execuções IA</p>
              <div className="space-y-2">
                {logs?.data?.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      )}
                      <span className="font-medium">{log.action}</span>
                      {log.entityType && (
                        <Badge variant="outline" className="text-[10px]">
                          {log.entityType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{log.durationMs}ms</span>
                      <span>{log.tokens} tokens</span>
                      <span>{new Date(log.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
                {(!logs?.data || logs.data.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum log de execução
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-[400px] overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Chat com IA (OpenAI/Anthropic)</p>
                    <p className="text-xs mt-2">Configure um provedor de IA para habilitar</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentsData?.builtIn?.map((a: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {a.tools?.slice(0, 4).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!prompts || prompts.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
                Nenhum prompt cadastrado
              </p>
            ) : (
              prompts.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <p className="font-semibold mb-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.prompt}</p>
                    {p.category && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        {p.category}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="rag" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder="Buscar na base de conhecimento..."
              onKeyDown={(e) =>
                e.key === 'Enter' && ragQuery.trim() && ragMutation.mutate(ragQuery)
              }
            />
            <Button
              onClick={() => ragMutation.mutate(ragQuery)}
              disabled={!ragQuery.trim() || ragMutation.isPending}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {ragResults && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">{ragResults.resultsCount} resultados</p>
                <pre className="text-xs font-mono bg-muted p-3 rounded-lg whitespace-pre-wrap">
                  {ragResults.context}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4 mt-4">
          <div className="flex gap-2 mb-4">
            {['today', 'week', 'month'].map((p) => (
              <Badge
                key={p}
                variant={usagePeriod === p ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setUsagePeriod(p)}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
              </Badge>
            ))}
          </div>
          <Card>
            <CardContent className="p-4">
              {usage?.byModel?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-3">Por Modelo</p>
                  {usage.byModel.map((m: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                    >
                      <span className="font-medium">{m.model}</span>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{m.callCount} chamadas</span>
                        <span>{m.tokens.toLocaleString()} tokens</span>
                        <span>${m.cost.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum dado de uso ainda
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
