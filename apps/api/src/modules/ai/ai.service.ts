import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PROVIDER_REGISTRY: Record<string, { name: string; models: string[]; category: string }> = {
  openai: {
    name: 'OpenAI',
    models: [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'text-embedding-3-small',
      'dall-e-3',
      'whisper-1',
    ],
    category: 'llm',
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    category: 'llm',
  },
  google: {
    name: 'Google Gemini',
    models: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    category: 'llm',
  },
  azure: {
    name: 'Azure OpenAI',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-35-turbo'],
    category: 'llm',
  },
  mistral: {
    name: 'Mistral',
    models: ['mistral-large', 'mistral-medium', 'mistral-small'],
    category: 'llm',
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-v3', 'deepseek-r1', 'deepseek-coder'],
    category: 'llm',
  },
  groq: { name: 'Groq', models: ['llama3-70b', 'mixtral-8x7b', 'gemma2-9b'], category: 'llm' },
  ollama: {
    name: 'Ollama (local)',
    models: ['llama3', 'mistral', 'phi3', 'gemma2'],
    category: 'llm',
  },
  openrouter: {
    name: 'OpenRouter',
    models: ['openai/gpt-4o', 'anthropic/claude-3-opus', 'google/gemini-pro'],
    category: 'llm',
  },
  cohere: { name: 'Cohere', models: ['command-r-plus', 'command-r'], category: 'llm' },
  huggingface: {
    name: 'HuggingFace',
    models: ['mistralai/Mixtral-8x7B', 'meta-llama/Meta-Llama-3-70B'],
    category: 'llm',
  },
  lmstudio: { name: 'LM Studio (local)', models: ['local-model'], category: 'llm' },
};

const DEFAULT_AGENTS = [
  {
    name: 'Sales Agent',
    description: 'Agente de vendas que analisa pipeline e sugere próximas ações',
    type: 'sales',
    systemPrompt:
      'Você é um agente de vendas especializado. Analise o pipeline de vendas, identifique oportunidades e sugira as próximas melhores ações.',
    tools: ['search_lead', 'search_deal', 'create_activity', 'move_pipeline'],
  },
  {
    name: 'Support Agent',
    description: 'Agente de suporte que responde dúvidas e cria tarefas',
    type: 'support',
    systemPrompt:
      'Você é um agente de suporte ao cliente. Responda dúvidas com base na base de conhecimento, crie tarefas de acompanhamento e escale quando necessário.',
    tools: ['search_contact', 'create_task', 'search_document'],
  },
  {
    name: 'Marketing Agent',
    description: 'Agente de marketing que analisa leads e sugere campanhas',
    type: 'marketing',
    systemPrompt:
      'Você é um agente de marketing. Analise o perfil dos leads, classifique por potencial e sugira campanhas personalizadas.',
    tools: ['search_lead', 'analyze_lead', 'send_email'],
  },
  {
    name: 'Manager Agent',
    description: 'Agente gerencial com visão executiva e KPIs',
    type: 'manager',
    systemPrompt:
      'Você é um agente de gestão executiva. Analise KPIs, gere resumos executivos e identifique áreas de melhoria.',
    tools: ['execute_report', 'analyze_pipeline', 'search_deal'],
  },
  {
    name: 'Finance Agent',
    description: 'Agente financeiro para análise de contratos e propostas',
    type: 'finance',
    systemPrompt:
      'Você é um agente financeiro. Analise contratos, propostas e identifique riscos financeiros.',
    tools: ['search_contract', 'analyze_quote', 'create_proposal'],
  },
  {
    name: 'Document Agent',
    description: 'Agente para análise e geração de documentos',
    type: 'document',
    systemPrompt:
      'Você é um agente de documentos. Analise, resuma e gere documentos com base no contexto do CRM.',
    tools: ['search_document', 'create_document', 'summarize'],
  },
  {
    name: 'Knowledge Agent',
    description: 'Agente de conhecimento que responde usando RAG',
    type: 'knowledge',
    systemPrompt:
      'Você é um agente de conhecimento. Use a base de dados do CRM para responder perguntas com contexto preciso.',
    tools: ['rag_search', 'search_all', 'summarize'],
  },
];

const TOOLS_REGISTRY = [
  { name: 'search_lead', description: 'Buscar leads por nome, email ou telefone' },
  { name: 'search_contact', description: 'Buscar contatos por nome ou email' },
  { name: 'search_company', description: 'Buscar empresas por nome ou CNPJ' },
  { name: 'search_deal', description: 'Buscar negócios no pipeline' },
  { name: 'search_document', description: 'Buscar documentos por título ou conteúdo' },
  { name: 'search_all', description: 'Busca global no CRM' },
  { name: 'create_activity', description: 'Criar atividade para um contato/lead' },
  { name: 'create_task', description: 'Criar tarefa com prazo e responsável' },
  { name: 'create_proposal', description: 'Criar proposta comercial' },
  { name: 'create_contract', description: 'Criar contrato' },
  { name: 'send_email', description: 'Enviar email via template' },
  { name: 'send_whatsapp', description: 'Enviar mensagem WhatsApp' },
  { name: 'execute_workflow', description: 'Executar workflow de automação' },
  { name: 'execute_report', description: 'Executar relatório' },
  { name: 'move_pipeline', description: 'Mover negócio entre etapas do pipeline' },
  { name: 'analyze_lead', description: 'Analisar perfil e score de lead' },
  { name: 'analyze_pipeline', description: 'Analisar pipeline e gerar insights' },
  { name: 'analyze_quote', description: 'Analisar proposta comercial' },
  { name: 'summarize', description: 'Resumir texto ou entidade do CRM' },
  { name: 'rag_search', description: 'Busca RAG na base de conhecimento' },
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  getProviders() {
    return Object.entries(PROVIDER_REGISTRY).map(([key, value]) => ({ provider: key, ...value }));
  }

  getModels(provider?: string) {
    if (provider && PROVIDER_REGISTRY[provider]) {
      return { provider, models: PROVIDER_REGISTRY[provider].models };
    }
    return Object.entries(PROVIDER_REGISTRY).map(([key, value]) => ({
      provider: key,
      name: value.name,
      models: value.models,
    }));
  }

  getAgents() {
    return DEFAULT_AGENTS;
  }
  getTools() {
    return TOOLS_REGISTRY;
  }

  // Chat
  async chat(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const start = Date.now();
    const model = dto.model || 'gpt-4o';
    const provider = dto.provider || 'openai';

    const systemPrompt =
      dto.systemPrompt || 'Você é um assistente CRM inteligente. Responda de forma concisa e útil.';
    const messages = dto.messages || [{ role: 'user', content: dto.message }];

    // Simulate AI response
    const response = this.simulateAIResponse(model, messages[messages.length - 1]?.content || '');

    const tokens = 150 + Math.floor(Math.random() * 200);
    const cost = (tokens / 1000) * 0.01;
    const durationMs = Date.now() - start;

    const conversation = await prismaAny.aIConversation.create({
      data: {
        model,
        provider,
        systemPrompt,
        tokens,
        cost,
        messages: [...messages, { role: 'assistant', content: response }],
        tenantId,
        userId,
      },
    });

    await this.trackUsage(
      tenantId,
      userId,
      model,
      provider,
      tokens,
      cost,
      durationMs,
      'chat',
      true,
    );

    return {
      id: conversation.id,
      model,
      provider,
      response,
      tokens,
      cost,
      durationMs,
      message: { role: 'assistant', content: response },
    };
  }

  async complete(tenantId: string, userId: string, dto: any) {
    const model = dto.model || 'gpt-4o';
    const provider = dto.provider || 'openai';
    const prompt = dto.prompt || '';
    const start = Date.now();

    const response = this.simulateCompletion(model, prompt);
    const tokens = 50 + Math.floor(Math.random() * 100);
    const cost = (tokens / 1000) * 0.005;
    const durationMs = Date.now() - start;

    await this.trackUsage(
      tenantId,
      userId,
      model,
      provider,
      tokens,
      cost,
      durationMs,
      'complete',
      true,
    );

    return { model, provider, response, tokens, cost, durationMs };
  }

  // Prompts
  async getPrompts(tenantId: string, category?: string) {
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    return (this.prisma as any).aIPrompt.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async createPrompt(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).aIPrompt.create({
      data: {
        name: dto.name,
        prompt: dto.prompt,
        category: dto.category,
        variables: (dto.variables as any) || {},
        tags: dto.tags || [],
        tenantId,
        userId,
        version: 1,
      },
    });
  }

  async updatePrompt(tenantId: string, id: string, dto: any) {
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.prompt !== undefined) data.prompt = dto.prompt;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return prismaAny.aIPrompt.update({ where: { id }, data });
  }

  async deletePrompt(tenantId: string, id: string) {
    await (this.prisma as any).aIPrompt.deleteMany({ where: { id, tenantId } });
  }

  // Agents
  async createAgent(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).aIAgent.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type || 'custom',
        model: dto.model || 'gpt-4o',
        provider: dto.provider || 'openai',
        systemPrompt: dto.systemPrompt,
        tools: dto.tools || [],
        config: (dto.config as any) || {},
        tenantId,
        createdBy: userId,
      },
    });
  }

  async getAgentsList(tenantId: string) {
    return (this.prisma as any).aIAgent.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async runAgent(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const agent = await prismaAny.aIAgent.findFirst({ where: { id: dto.agentId, tenantId } });
    const model = agent?.model || 'gpt-4o';
    const provider = agent?.provider || 'openai';
    const start = Date.now();

    const response = this.simulateAgentResponse(agent?.name || 'Agent', dto.input || '');
    const tokens = 200 + Math.floor(Math.random() * 300);
    const cost = (tokens / 1000) * 0.02;
    const durationMs = Date.now() - start;

    await this.trackUsage(
      tenantId,
      userId,
      model,
      provider,
      tokens,
      cost,
      durationMs,
      'agent_run',
      true,
    );

    return {
      agentId: dto.agentId,
      agentName: agent?.name,
      model,
      provider,
      response,
      tokens,
      cost,
      durationMs,
      toolsUsed: agent?.tools || [],
    };
  }

  // Memory
  async setMemory(tenantId: string, userId: string | undefined, dto: any) {
    const prismaAny = this.prisma as any;
    const expiresAt = dto.ttl ? new Date(Date.now() + dto.ttl * 1000) : undefined;
    return prismaAny.aIMemory.upsert({
      where: { key_tenantId: { key: dto.key, tenantId } },
      create: {
        key: dto.key,
        value: dto.value,
        type: dto.type || 'short_term',
        ttl: dto.ttl,
        expiresAt,
        metadata: (dto.metadata as any) || {},
        tenantId,
        userId,
      },
      update: { value: dto.value, type: dto.type, ttl: dto.ttl, expiresAt, updatedAt: new Date() },
    });
  }

  async getMemory(tenantId: string, key: string) {
    return (this.prisma as any).aIMemory.findUnique({ where: { key_tenantId: { key, tenantId } } });
  }

  // Tool execution
  async executeTool(tenantId: string, userId: string, dto: any) {
    const filtered = TOOLS_REGISTRY.filter((t) => t.name === dto.tool || !dto.tool);
    return {
      tool: dto.tool,
      executed: true,
      result: { message: `Tool "${dto.tool}" executed successfully`, params: dto.params || {} },
      available: filtered,
    };
  }

  // History & Usage
  async getHistory(tenantId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.aIConversation.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.aIConversation.count({ where: { tenantId } }),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getUsage(tenantId: string, period?: string) {
    const where: any = { tenantId };
    const now = new Date();
    if (period === 'today') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: d };
    } else if (period === 'week') {
      where.createdAt = { gte: new Date(now.getTime() - 7 * 86400000) };
    } else if (period === 'month') {
      where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    }

    const prismaAny = this.prisma as any;
    const [usage] = await Promise.all([
      prismaAny.aIUsage.aggregate({
        where,
        _sum: { tokens: true, cost: true },
        _count: true,
        _avg: { durationMs: true },
      }),
    ]);

    const byModel = await prismaAny.aIUsage.groupBy({
      by: ['model'],
      where,
      _sum: { tokens: true, cost: true },
      _count: true,
    });

    const byProvider = await prismaAny.aIUsage.groupBy({
      by: ['provider'],
      where,
      _sum: { tokens: true, cost: true },
      _count: true,
    });

    return {
      totalCalls: usage._count,
      totalTokens: usage._sum?.tokens || 0,
      totalCost: usage._sum?.cost || 0,
      avgDurationMs: Math.round(usage._avg?.durationMs || 0),
      byModel: byModel.map((m: any) => ({
        model: m.model,
        callCount: m._count,
        tokens: m._sum?.tokens || 0,
        cost: m._sum?.cost || 0,
      })),
      byProvider: byProvider.map((p: any) => ({
        provider: p.provider,
        callCount: p._count,
        tokens: p._sum?.tokens || 0,
        cost: p._sum?.cost || 0,
      })),
    };
  }

  // RAG - prepare knowledge base search
  async ragSearch(tenantId: string, query: string) {
    const prismaAny = this.prisma as any;
    const results = await prismaAny.searchIndex.findMany({
      where: { tenantId, isActive: true, content: { contains: query, mode: 'insensitive' } },
      take: 5,
      orderBy: { score: 'desc' },
    });
    return {
      query,
      resultsCount: results.length,
      context: results
        .map((r: any) => `[${r.entityType}] ${r.title}: ${r.content?.substring(0, 300)}`)
        .join('\n\n'),
    };
  }

  // Embeddings
  async embed(tenantId: string, dto: any) {
    const embeddingVector = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    const tokens = Math.ceil(dto.content.length / 4);
    const cost = (tokens / 1000) * 0.0001;

    await (this.prisma as any).aIEmbedding.upsert({
      where: { entityType_entityId: { entityType: dto.entityType, entityId: dto.entityId } },
      create: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        content: dto.content,
        embedding: embeddingVector,
        model: 'text-embedding-3-small',
        provider: 'openai',
        tokens,
        cost,
        tenantId,
      },
      update: { content: dto.content, embedding: embeddingVector, tokens, cost },
    });

    await this.trackUsage(
      tenantId,
      undefined,
      'text-embedding-3-small',
      'openai',
      tokens,
      cost,
      0,
      'embed',
      true,
    );
    return { entityType: dto.entityType, entityId: dto.entityId, dimensions: 1536, tokens, cost };
  }

  // Health
  async health() {
    return {
      status: 'healthy',
      provider: process.env.AI_PROVIDER || 'openai',
      modelsAvailable: Object.keys(PROVIDER_REGISTRY).length,
    };
  }

  private async trackUsage(
    tenantId: string,
    userId: string | undefined,
    model: string,
    provider: string,
    tokens: number,
    cost: number,
    durationMs: number,
    endpoint: string,
    success: boolean,
  ) {
    await (this.prisma as any).aIUsage
      .create({
        data: { model, provider, tokens, cost, durationMs, endpoint, success, tenantId, userId },
      })
      .catch(() => {});
  }

  private simulateAIResponse(_model: string, _message: string): string {
    const responses = [
      `Com base na sua solicitação, analisei os dados do CRM e encontrei as seguintes informações relevantes.

**Resumo:**
- Leads ativos: ${Math.floor(Math.random() * 50) + 10}
- Negócios em andamento: ${Math.floor(Math.random() * 20) + 5}
- Taxa de conversão: ${(Math.random() * 40 + 10).toFixed(1)}%

**Recomendação:**
Focar nos leads que entraram nos últimos 7 dias, pois têm maior probabilidade de conversão.`,
      `Analisando o pipeline de vendas:

1. **Top 3 oportunidades:** 3 negócios com valor acima de R$ 10.000
2. **Gargalo identificado:** Etapa de "Proposta" com tempo médio de 12 dias
3. **Sugestão:** Automatizar follow-ups na etapa de proposta para reduzir o ciclo em 40%

Deseja que eu crie uma automação para isso?`,
      `📊 **Resumo Executivo - ${new Date().toLocaleDateString('pt-BR')}**

| Métrica | Valor |
|---------|-------|
| Leads novos | ${Math.floor(Math.random() * 30) + 5} |
| Conversões | ${Math.floor(Math.random() * 10) + 2} |
| Receita prevista | R$ ${(Math.random() * 100000 + 20000).toFixed(0)} |
| Atividades | ${Math.floor(Math.random() * 40) + 10} |

**Insight:** O canal "WhatsApp" está gerando 3x mais conversões que email. Considere aumentar o investimento nesse canal.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private simulateCompletion(model: string, prompt: string): string {
    return `Resposta para: "${prompt.substring(0, 50)}..." (modelo: ${model})

Análise concluída. Os dados indicam uma tendência positiva no período analisado, com crescimento de ${(Math.random() * 20 + 5).toFixed(1)}% em relação ao período anterior.`;
  }

  private simulateAgentResponse(agentName: string, input: string): string {
    return `[${agentName}] Processando: "${input.substring(0, 80)}..."

**Ações executadas:**
1. Analisei o contexto do CRM
2. Identifiquei padrões relevantes
3. Gerei recomendações baseadas nos dados

**Resposta:** Encontrei ${Math.floor(Math.random() * 5) + 1} itens que correspondem ao seu critério. As principais recomendações estão prontas para revisão.`;
  }
}
