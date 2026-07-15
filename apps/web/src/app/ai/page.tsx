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
  DollarSign,
  Clock,
  Plus,
  MessageSquare,
  Database,
  Search,
  Loader2,
  ListTree,
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
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<any>(null);
  const [usagePeriod, setUsagePeriod] = useState('month');
  const [, setShowAgentCreate] = useState(false);
  const [, setShowPromptCreate] = useState(false);

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

  const chatMutation = useMutation({
    mutationFn: (m: string) =>
      api.post('/ai/chat', { message: m, messages: chatHistory.slice(-10) }),
    onSuccess: (r: any) => {
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: r.data.response },
      ]);
      setMessage('');
    },
  });

  const ragMutation = useMutation({
    mutationFn: (q: string) => api.post('/ai/rag', { query: q }),
    onSuccess: (r: any) => setRagResults(r.data),
  });

  if (!user) return null;

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usage?.totalCalls || 0}</p>
                <p className="text-xs text-muted-foreground">Chamadas IA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Database className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(usage?.totalTokens || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Tokens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(usage?.totalCost || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Custo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usage?.avgDurationMs || 0}ms</p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
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

        <TabsContent value="chat" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-[400px] overflow-y-auto p-4 space-y-3">
                {chatHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Inicie uma conversa com a IA do CRM</p>
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
                          'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                          msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {chatMutation.isPending && (
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
                    e.key === 'Enter' && message.trim() && chatMutation.mutate(message)
                  }
                  placeholder="Pergunte sobre leads, pipeline, negócios..."
                  className="flex-1"
                />
                <Button
                  onClick={() => chatMutation.mutate(message)}
                  disabled={!message.trim() || chatMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4 mt-4">
          <div className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              {agentsData?.builtIn?.length || 0} agentes disponíveis
            </p>
            <Button size="sm" onClick={() => setShowAgentCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Agente
            </Button>
          </div>
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
          <div className="flex justify-between">
            <p className="text-sm text-muted-foreground">{prompts?.length || 0} prompts</p>
            <Button size="sm" onClick={() => setShowPromptCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Prompt
            </Button>
          </div>
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
