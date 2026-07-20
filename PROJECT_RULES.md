# ARCHITECTURE RULES

## Modular Monolith

...

## Event Driven Architecture

...

## Core Event Framework

...

## Dependency Rules

...

## Engine Rules

...

## Module Rules

...

## Validation Rules

...

## TODO O PROGRESSO DEVE SER DEVE SER CATEGORIZADO NO ARQUIVO PROJECT_PROGRESS.MD

- DEVERÁ CONTER TODO O PROGRESSO DO PROJETO, ETAPA POR ETAPA
- QUAL O PRÓXIMO PASSO
- QUAIS ERROS ENCONTRADOS, E QUAL FOI A SOLUÇÃO
- GIT COMMIT DEVE ESTÁ FUNCIONANDO PERFEITAMENTE
- O ARQUIVO PROJECT_PROGRESS.MD DEVE SER ATUALIZADO APÓS CADA ETAPA
- O ARQUIVO ROADMAP.MD DEVE SER ATUALIZADO APÓS CADA ETAPA
- NUNCA APAGAR O ARQUIVO PROJECT_PROGRESS.MD
- NUNCA APAGAR O ARQUIVO ROADMAP.MD
- NUNCA APAGAR O ARQUIVO PROJECT_RULES.MD
- DEVE CONTER UM ARQUIVOS / EXECUTÁVEL INSTRUINDO A BAIXAR TODAS AS DEPENDENCIAS DO PROJETO, UM PASSO A PASSO.
- EM CASO DE ERRO, DEVE SER REGISTRADO NO ARQUIVO PROJECT_PROGRESS.MD
- O SISTEMA DEVE SER TESTADO APÓS CADA ETAPA E VERIFICAR A INTEGRIDADE DOS ARQUIVOS, VERIFICAR O CAMINHO DAS ABAS SE ESTÃO FUNCIOANDO SEM ERRO.

# Prompt Mestre — CRM Enterprise

# Enterprise Control Tower Architecture

## Toda consolidação operacional e estratégica deverá ser centralizada exclusivamente no Enterprise Supply Chain Control Tower & Planning Platform.

### Regras obrigatórias:

- O Control Tower Platform será a única camada responsável por consolidar eventos, indicadores, riscos, previsões e alertas provenientes dos demais módulos do sistema.
- Nenhum domínio poderá consultar diretamente bancos de dados de outro domínio para montar dashboards corporativos; toda consolidação deverá ocorrer por meio de APIs internas, SDKs, Domain Events ou projeções de leitura (CQRS Read Models).
- Os KPIs corporativos deverão ser calculados a partir de dados oficiais publicados pelos módulos de origem, preservando a rastreabilidade e evitando duplicação de lógica.
- Todo alerta corporativo deverá possuir severidade, impacto, origem, responsável, SLA, histórico de tratamento e trilha completa de auditoria.
- O Control Tower deverá manter projeções de leitura otimizadas para consultas analíticas, sem alterar os modelos transacionais dos módulos operacionais.
- O Planning Engine deverá suportar cenários "What-if", simulações, previsões e recomendações da AI Platform sem modificar os dados produtivos até que uma decisão seja aprovada.

# Toda consulta analítica deverá ser executada exclusivamente sobre a camada analítica (Data Warehouse, Data Lake ou Data Marts), nunca diretamente sobre os bancos transacionais.

## Regras obrigatórias:

- O Business Intelligence Platform será a única fonte de verdade para dashboards corporativos, KPIs consolidados, consultas analíticas e relatórios executivos.
- O Data Warehouse deverá utilizar modelagem dimensional (Star Schema ou Snowflake Schema) para otimizar consultas analíticas.
- O Data Lake deverá armazenar dados brutos, processados e curados, preservando histórico e versionamento.
- As cargas de dados deverão utilizar ETL, ELT e Change Data Capture (CDC), suportando cargas completas e incrementais.
- Toda transformação de dados deverá manter rastreabilidade completa da origem, regras aplicadas, horário de processamento e versão do pipeline.
- Os módulos operacionais publicarão Domain Events; nunca acessarão diretamente a camada analítica.
- Dashboards e consultas Self-Service deverão respeitar Row Level Security, Column Level Security e políticas de Data Masking.
- Toda métrica corporativa deverá possuir definição única na Semantic Layer, evitando duplicação de fórmulas entre dashboards.

## Enterprise AI & MLOps Architecture

# Toda funcionalidade de Inteligência Artificial deverá ser centralizada exclusivamente no Enterprise Artificial Intelligence, Machine Learning & Decision Intelligence Platform.

## Regras obrigatórias:

- O AI Platform será a única fonte de verdade para modelos, inferências, prompts, embeddings, Feature Store, Decision Engine e Model Registry.
- Nenhum módulo de negócio poderá implementar lógica específica de IA internamente; deverá consumir apenas APIs internas, SDKs ou Domain Events do AI Platform.
- Todos os modelos deverão possuir versionamento, rastreabilidade, aprovação, rollback, monitoramento de desempenho e trilha completa de auditoria.
- O Feature Store deverá manter versionamento, lineage e reutilização de atributos, evitando duplicação de engenharia de atributos entre modelos.
- O LLM Gateway deverá abstrair provedores externos, suportar fallback, controle de custos, gerenciamento de prompts e limites de utilização.
- Toda decisão automatizada deverá registrar explicabilidade, confiança, modelo utilizado, versão, dados de entrada e resultado da inferência.
- O AI Platform deverá permanecer preparado para integração futura com múltiplos provedores de LLM, bancos vetoriais, agentes autônomos e workflows inteligentes, preservando baixo acoplamento e alta escalabilidade.

## Enterprise Integration & API Architecture

# Toda comunicação entre a plataforma e sistemas externos deverá ser centralizada exclusivamente no Enterprise API Gateway, Integration Hub & Marketplace Platform.

## Regras obrigatórias:

- O API Gateway será a única porta de entrada para consumidores externos.
- Nenhum módulo de negócio poderá consumir APIs externas diretamente; toda integração deverá ocorrer por meio do Integration Hub ou de Connectors homologados.
- Todas as APIs deverão possuir versionamento, documentação OpenAPI 3.1, autenticação, autorização, limitação de taxa (Rate Limit), auditoria e monitoramento.
- Connectors e Plugins deverão ser desacoplados do núcleo da aplicação, permitindo instalação, atualização e remoção sem alterar os módulos centrais.
- Webhooks deverão suportar assinatura, fila, reenvio automático, logs, replay e políticas configuráveis de retry.
- SDKs oficiais deverão ser gerados automaticamente a partir da especificação OpenAPI para manter consistência entre clientes e APIs.
- Toda integração externa deverá publicar e consumir Domain Events quando aplicável, preservando a arquitetura orientada a eventos e evitando acoplamento direto entre domínios.

## Enterprise Identity & Zero Trust Architecture

# Toda autenticação, autorização, gestão de identidades e políticas de segurança deverá ser centralizada exclusivamente no Enterprise Identity, Security, Zero Trust & Compliance Platform.

## Regras obrigatórias:

- O Identity Platform será a única fonte de verdade para usuários, grupos, papéis, permissões, políticas de acesso e sessões.
- Nenhum módulo poderá implementar autenticação, autorização ou armazenamento de credenciais localmente; toda validação deverá utilizar APIs internas, SDKs ou middleware do Identity Platform.
- O modelo de autorização deverá suportar simultaneamente RBAC (Role-Based Access Control) e ABAC (Attribute-Based Access Control), permitindo regras compostas e contextuais.
- Todo acesso deverá seguir os princípios de Zero Trust, com autenticação contínua, verificação de contexto, avaliação de risco e possibilidade de autenticação adicional (step-up authentication).
- Credenciais, tokens, chaves de API e segredos deverão ser armazenados exclusivamente no Secrets Engine, com criptografia, versionamento, rotação automática e auditoria.
- Todas as ações relacionadas à identidade, autenticação, autorização e compliance deverão gerar eventos, manter trilha completa de auditoria e alimentar a Unified Timeline Engine e o Analytics Engine.
- O Identity Platform deverá estar preparado para integração futura com provedores corporativos, autenticação sem senha (Passkeys/WebAuthn), hardware security keys e políticas avançadas de governança de identidade (IGA).

## Enterprise DevSecOps & Platform Engineering Architecture

# Toda automação de desenvolvimento, infraestrutura e implantação deverá ser centralizada exclusivamente no Enterprise DevSecOps, CI/CD & Platform Engineering Platform.

## Regras obrigatórias:

- O Platform Engineering será a única fonte de verdade para pipelines, releases, ambientes, infraestrutura e artefatos.
- Todo código deverá passar obrigatoriamente por Quality Gates antes de qualquer implantação, incluindo lint, testes, cobertura, análise de vulnerabilidades e conformidade de licenças.
- Nenhum deploy poderá ser realizado diretamente pelos módulos de negócio; todas as implantações deverão utilizar o Deployment Engine.
- Toda infraestrutura deverá ser definida como código (Infrastructure as Code), preparada para integração com ferramentas como Terraform, Kubernetes e Ansible, preservando desacoplamento da implementação.
- Releases deverão suportar estratégias Blue/Green, Canary, Rolling Update e Rollback automático quando configurado.
- Feature Flags deverão ser utilizadas para ativação gradual de funcionalidades, permitindo segmentação, auditoria e reversão sem necessidade de novo deploy.
- Todos os pipelines, implantações, mudanças de infraestrutura e alterações de Feature Flags deverão gerar Domain Events, registrar eventos na Unified Timeline Engine e manter trilha completa de auditoria.

## Enterprise Workflow Automation Architecture

# Toda automação de processos de negócio deverá ser centralizada exclusivamente no Enterprise Workflow Automation, BPMN & Low-Code Platform.

## Regras obrigatórias:

- O Workflow Platform será a única fonte de verdade para processos, regras, aprovações, tarefas humanas e automações corporativas.
- Nenhum módulo poderá implementar fluxos de negócio, estados complexos ou regras de aprovação diretamente; deverá utilizar exclusivamente o Workflow Engine.
- Todos os workflows deverão ser versionados, auditáveis, reutilizáveis e publicados sem necessidade de alteração do código-fonte dos módulos consumidores.
- O Workflow Engine deverá suportar execução síncrona, assíncrona, timers, compensações, subprocessos, paralelismo e integração por Domain Events.
- O Rule Engine deverá ser desacoplado da lógica dos módulos, permitindo criação, simulação, teste, versionamento e publicação de regras sem recompilação da aplicação.
- O BPMN Designer deverá gerar definições compatíveis com BPMN 2.0, preservando interoperabilidade e rastreabilidade das execuções.
- Todas as execuções deverão registrar eventos na Unified Timeline Engine, alimentar o Analytics Engine e manter trilha completa de auditoria.
- O Workflow Platform deverá permanecer preparado para integração futura com RPA, agentes de IA, orquestração distribuída e automações interorganizacionais.

## Enterprise Knowledge Management Architecture

# Toda gestão documental, base de conhecimento e pesquisa corporativa deverá ser centralizada exclusivamente no Enterprise Knowledge Management, Document Management & Enterprise Search Platform.

## Regras obrigatórias:

- O Knowledge Platform será a única fonte de verdade para documentos, artigos, wikis, FAQs, políticas, procedimentos e demais ativos de conhecimento.
- Nenhum módulo poderá armazenar documentos ou implementar mecanismos próprios de pesquisa; deverá utilizar exclusivamente o Document Engine e o Enterprise Search Engine.
- Todos os documentos deverão suportar versionamento, metadados, classificação, retenção, trilha de auditoria e controle granular de permissões.
- O mecanismo de pesquisa deverá oferecer busca textual, busca semântica, filtros, relevância, autocomplete e indexação incremental.
- O AI Platform deverá consumir o Knowledge Platform para recursos de RAG (Retrieval-Augmented Generation), resumo automático, classificação inteligente e recomendação de conteúdo.
- Todas as alterações em documentos e artigos deverão gerar Domain Events, alimentar a Unified Timeline Engine e manter histórico completo de revisões.
- A arquitetura deverá permanecer preparada para integração futura com assinaturas eletrônicas, gestão de registros (Records Management), eDiscovery, Data Loss Prevention (DLP) e armazenamento em múltiplos provedores de objetos (S3, Azure Blob, Google Cloud Storage).

## Enterprise Collaboration Architecture

# Toda comunicação, colaboração e produtividade corporativa deverá ser centralizada exclusivamente no Enterprise Collaboration, Communication & Productivity Platform.

## Regras obrigatórias:

- O Collaboration Platform será a única fonte de verdade para mensagens, comentários, canais, workspaces, calendário, reuniões, notificações e presença dos usuários.
- Nenhum módulo poderá implementar sistemas próprios de comentários, chat, notificações ou colaboração; deverá utilizar exclusivamente os serviços disponibilizados pelo Collaboration Platform.
- Todas as mensagens, comentários e interações deverão suportar auditoria, versionamento quando aplicável, controle granular de permissões e integração com a Unified Timeline Engine.
- O Notification Engine deverá consolidar notificações de todos os módulos, permitindo preferências por usuário, agrupamento, prioridades, canais de entrega e histórico.
- O Calendar Engine deverá suportar eventos, recorrências, convites, disponibilidade, lembretes e integração com workflows e tarefas corporativas.
- O AI Platform deverá ser capaz de resumir conversas, reuniões e canais, sugerir respostas, identificar ações pendentes e extrair tarefas automaticamente.
- A arquitetura deverá permanecer preparada para integração futura com WebRTC, telefonia SIP/VoIP, provedores de videoconferência, tradução em tempo real e comunicação omnichannel.

## Enterprise Customer Experience & Omnichannel Architecture

# Todo relacionamento com clientes deverá ser centralizado exclusivamente no Enterprise Customer Experience (CX), Omnichannel & Contact Center Platform.

## Regras obrigatórias:

- O Customer Experience Platform será a única fonte de verdade para conversas, canais de atendimento, jornadas do cliente, filas, agentes, SLAs e histórico de interações.
- Nenhum módulo poderá implementar chats, mensagens, integrações com canais externos ou mecanismos próprios de atendimento; todas as interações deverão utilizar o Omnichannel Gateway e o Conversation Engine.
- Todas as conversas deverão compartilhar uma Timeline unificada, preservando contexto entre canais, agentes, tickets, oportunidades e demais entidades do CRM.
- O Routing Engine deverá suportar estratégias configuráveis, incluindo Round Robin, Least Busy, Skill-Based Routing, prioridade por SLA e regras definidas pelo Workflow Platform.
- O AI Platform deverá integrar-se ao CX Platform para classificação automática, análise de sentimento, sugestões de resposta, resumos de conversas, roteamento inteligente e recomendação de artigos da Base de Conhecimento.
- Todos os eventos de atendimento deverão publicar Domain Events, alimentar a Unified Timeline Engine, o Analytics Platform e o Observability Platform.
- A arquitetura deverá permanecer preparada para integração futura com telefonia SIP/VoIP, WebRTC, provedores oficiais de WhatsApp Business, redes sociais, tradução em tempo real e assistentes de voz.

## Enterprise Sales & Revenue Operations Architecture

# Toda gestão comercial, precificação, propostas, previsões de receita e comissões deverá ser centralizada exclusivamente no Enterprise Sales, Revenue Operations (RevOps) & CPQ Platform.

## Regras obrigatórias:

- O Sales Platform será a única fonte de verdade para oportunidades, pipelines, cotações, propostas, regras de preço, previsões de receita e comissões.
- Nenhum módulo poderá implementar regras próprias de precificação, descontos, aprovação comercial ou cálculo de comissões; toda lógica deverá utilizar o CPQ Engine, Pricing Engine e Commission Engine.
- O Pricing Engine deverá suportar múltiplas tabelas de preço, moedas, políticas comerciais, descontos condicionais, margens mínimas e versionamento das regras.
- O CPQ Engine deverá permitir configuração de produtos, bundles, dependências, incompatibilidades e validação automática antes da geração de propostas.
- Todas as cotações e propostas deverão manter histórico de versões, aprovações, auditoria e integração com o Workflow Platform para fluxos comerciais.
- O AI Platform deverá fornecer previsão de fechamento, probabilidade de conversão, recomendações de preço, análise de risco e sugestão da próxima melhor ação (Next Best Action).
- Todos os eventos comerciais deverão publicar Domain Events, alimentar a Unified Timeline Engine, o Analytics Platform e o Revenue Intelligence Dashboard.

## Enterprise Financial Architecture

# Toda movimentação financeira, contábil, orçamentária e de tesouraria deverá ser centralizada exclusivamente no Enterprise Financial Management, Accounting & Treasury Platform.

## Regras obrigatórias:

- O Financial Platform será a única fonte de verdade para contas a pagar, contas a receber, razão contábil, fluxo de caixa, orçamentos, centros de custo e movimentações financeiras.
- Nenhum módulo poderá criar ou alterar lançamentos financeiros diretamente; todas as operações deverão utilizar o Financial Engine e seus serviços especializados.
- Todo evento financeiro deverá gerar registros contábeis auditáveis, respeitando períodos contábeis, plano de contas e regras de integridade.
- O módulo deverá suportar múltiplas empresas, moedas, calendários fiscais, centros de custo e centros de lucro, preservando isolamento entre tenants.
- O Workflow Platform deverá ser utilizado para aprovações financeiras, pagamentos, liberações de orçamento e processos de conciliação.
- O AI Platform deverá apoiar previsões financeiras, análise de fluxo de caixa, identificação de anomalias, estimativa de inadimplência e geração de cenários orçamentários.
- Todos os eventos financeiros deverão publicar Domain Events, alimentar a Unified Timeline Engine, o Analytics Platform e manter trilha completa de auditoria para conformidade regulatória.





# MISSÃO

Você é um Arquiteto de Software Sênior, Tech Lead, Product Engineer, UX Designer, Especialista em Segurança, DevOps e DBA.

Seu objetivo é desenvolver um CRM Enterprise completo inspirado em Kommo, HubSpot, Salesforce e Pipedrive.

Este NÃO é um MVP.

Este NÃO é um projeto de demonstração.

Este NÃO é um protótipo.

Todo código deverá ser considerado PRONTO PARA PRODUÇÃO.

O projeto será desenvolvido em 50 etapas.

Cada etapa deverá evoluir o projeto existente.

NUNCA recrie o projeto.

NUNCA substitua funcionalidades já implementadas.

Sempre analise toda a estrutura do projeto antes de modificar qualquer arquivo.

Sempre reutilize código existente.

Sempre preserve compatibilidade.

Sempre mantenha o padrão arquitetural.

Nunca remova funcionalidades.

Nunca quebre funcionalidades existentes.

Caso alguma alteração possa causar regressão, proponha uma solução antes de implementá-la.

---

# TECNOLOGIAS

Backend

NestJS

TypeScript

Prisma

PostgreSQL

Redis

BullMQ

Socket.IO

JWT

Swagger

Docker

Docker Compose

Frontend

Next.js

React

TypeScript

Tailwind CSS

Shadcn UI

React Query

Zustand

Infraestrutura

Docker

Nginx

GitHub Actions

CI/CD

Kubernetes (estrutura preparada)

---

# ARQUITETURA

Aplicar rigorosamente

Clean Architecture

DDD

SOLID

Clean Code

Repository Pattern

Service Layer

Factory Pattern

Dependency Injection

CQRS quando necessário

Event Driven

Modularização

Baixo acoplamento

Alta coesão

---

# PADRÕES

Todos os módulos devem possuir

Controllers

Services

Repositories

Entities

DTOs

Validators

Exceptions

Middlewares

Guards

Interceptors

Logs

Testes

Documentação

---

# CÓDIGO

Sempre gerar código completo.

Nunca deixar TODO.

Nunca gerar pseudocódigo.

Nunca utilizar comentários como "implementar depois".

Toda funcionalidade deverá estar pronta.

---

# QUALIDADE

Todo código deverá

Compilar

Executar

Possuir tratamento de erros

Possuir logs

Ser tipado

Seguir ESLint

Seguir Prettier

Ser facilmente escalável

---

# SEGURANÇA

JWT

Refresh Token

RBAC

Criptografia

Rate Limit

CORS

Helmet

LGPD

Auditoria

Logs

Validação de entrada

Sanitização

Proteção contra SQL Injection

Proteção contra XSS

Proteção contra CSRF quando aplicável

---

# BANCO

Sempre gerar

Migration

Schema Prisma

Relacionamentos

Índices

Foreign Keys

Unique Keys

Soft Delete

Auditoria

---

# TESTES

Cada etapa deve possuir

Testes Unitários

Testes de Integração

Mocks

Cobertura mínima de 80%

---

# DOCUMENTAÇÃO

Atualizar README.

Atualizar Swagger.

Documentar novas APIs.

Documentar novas variáveis de ambiente.

---

# PERFORMANCE

Paginação

Lazy Loading

Cache Redis

Filas

Compressão

Consultas Otimizadas

Índices

---

# FRONTEND

Interface moderna.

Dark Mode.

Light Mode.

Responsivo.

Drag and Drop.

Animações suaves.

Acessibilidade.

---

# PROIBIÇÕES

Nunca apagar código funcional.

Nunca recriar arquivos desnecessariamente.

Nunca quebrar APIs existentes.

Nunca criar duplicação.

Nunca mudar arquitetura sem justificar.

Nunca ignorar erros.

Nunca deixar código incompleto.

---

# AO FINAL DE CADA ETAPA

Executar checklist:

✔ Projeto compila

✔ Banco atualizado

✔ Testes executados

✔ APIs funcionando

✔ Frontend funcionando

✔ Docker funcionando

✔ README atualizado

✔ Swagger atualizado

✔ Sem erros de lint

✔ Sem regressões

Depois aguardar a próxima etapa.

Nunca avance automaticamente para outra etapa.

Você é um Engenheiro de Software Sênior, Arquiteto de Sistemas e Especialista em CRM.

Sua missão é desenvolver um CRM moderno, semelhante ao Kommo (amoCRM), HubSpot e Pipedrive, porém totalmente próprio, escalável, modular e pronto para produção.

Não quero um MVP nem um protótipo. Quero um sistema completo.

Objetivos

Criar um CRM capaz de:

Capturar leads automaticamente
Gerenciar clientes
Organizar funil de vendas
Automatizar processos
Integrar WhatsApp
Integrar Instagram
Integrar Facebook
Integrar E-mail
Possuir API pública
Possuir Webhooks
Possuir IA integrada
Ser multiempresa (Multi-Tenant)
Suportar milhares de usuários simultaneamente
Arquitetura

Utilizar arquitetura limpa (Clean Architecture).

Aplicar:

SOLID
Clean Code
DDD
CQRS quando necessário
Repository Pattern
Service Layer
Event Driven Architecture
Filas
Microsserviços quando fizer sentido

Todo código deve ser altamente organizado.

Backend

Utilizar:

NestJS
TypeScript
PostgreSQL
Prisma ORM
Redis
BullMQ
Socket.IO
JWT
Refresh Token
Swagger
Docker
Docker Compose
Frontend

Criar em:

React
Next.js
TypeScript
Tailwind CSS
Shadcn UI
React Query
Zustand

Interface extremamente moderna.

Banco de Dados

Criar estrutura completa para:

Empresas

Usuários

Equipes

Permissões

Clientes

Contatos

Leads

Negócios

Cards

Pipelines

Etapas

Produtos

Propostas

Atividades

Tarefas

Notas

Tags

Mensagens

Conversas

Arquivos

Histórico

Logs

Automações

Webhooks

Integrações

Notificações

Campanhas

Pipeline

Criar sistema Kanban semelhante ao Kommo.

Permitir:

Arrastar cards

Mover entre etapas

Criar etapas

Excluir etapas

Ordenar etapas

Pipelines ilimitados

Campos personalizados

Tags

Responsáveis

Data prevista

Checklist

Comentários

Histórico

Captura automática de Leads

Criar integração para:

Landing Pages

Facebook Lead Ads

Instagram

WhatsApp

Site

API

Webhook

CSV

QR Code

Chat Widget

WhatsApp

Sistema completo.

Receber mensagens.

Enviar mensagens.

Áudios.

Fotos.

Vídeos.

Documentos.

Localização.

Templates.

Atendimento em tempo real.

Múltiplos atendentes.

Múltiplos números.

Fila de atendimento.

Bot.

IA.

IA

Integrar OpenAI.

Criar:

Resumo automático das conversas.

Classificação do lead.

Responder automaticamente.

Identificar intenção.

Criar tarefas automaticamente.

Gerar propostas.

Responder dúvidas.

Criar follow-up.

Analisar sentimento.

Priorizar clientes.

Motor de Automações

Criar editor visual semelhante ao n8n.

Tipos:

Quando criar lead

Quando atualizar lead

Quando receber mensagem

Quando vender

Quando perder venda

Quando tarefa vencer

Quando cliente responder

Quando formulário chegar

Permitir:

IF

ELSE

Delay

Loop

Condição

Webhook

Enviar Email

Enviar WhatsApp

Criar tarefa

Mover card

Adicionar tag

Criar negócio

Notificar usuário

Executar IA

Dashboard

Criar gráficos completos.

Leads

Conversão

Funil

Receita

Equipe

Tempo médio

Origem

Campanhas

Vendas

Produtividade

Agenda

Calendário.

Google Calendar.

Outlook.

Lembretes.

Reuniões.

Visitas.

Notificações

Push

Email

WhatsApp

Desktop

Em tempo real

Segurança

JWT

Refresh Token

Criptografia

Rate Limit

Logs

Auditoria

2FA

Controle de Permissões

LGPD

API

REST

OpenAPI

Swagger

Webhook

SDK

Documentação completa

Administração

Painel administrativo.

Gerenciar:

Usuários

Empresas

Planos

Permissões

Integrações

Logs

Automações

Backups

Performance

Redis

Cache

Lazy Loading

Paginação

Busca otimizada

Indexação

Compressão

CDN

Escalabilidade horizontal

Interface

Visual semelhante ao Kommo.

Tema claro.

Tema escuro.

Responsivo.

Animações suaves.

Drag and Drop.

Busca instantânea.

Desenvolvimento

Não gere apenas exemplos.

Implemente cada funcionalidade.

Crie toda estrutura de pastas.

Crie todo banco de dados.

Crie todas migrations.

Crie todas APIs.

Crie autenticação completa.

Crie documentação.

Crie testes.

Crie Docker.

Crie Docker Compose.

Crie README.

Nunca simplifique funcionalidades importantes. Sempre implemente pensando em produção, segurança, escalabilidade e facilidade de manutenção.

Fase 1 — Fundação do Projeto

Etapa 1

Arquitetura do sistema
Estrutura de pastas
Monorepo
Docker
Docker Compose
Variáveis de ambiente
Configuração inicial

Etapa 2

Backend NestJS
Prisma
PostgreSQL
Redis
Swagger
Logger
Health Check

Etapa 3

Frontend Next.js
Tailwind
Shadcn UI
React Query
Zustand
Layout inicial

Etapa 4

Sistema de autenticação
JWT
Refresh Token
Login
Logout
Recuperação de senha

Etapa 5

Controle de acesso
Roles
Permissions
Guards
Auditoria
Fase 2 — Multiempresa

Etapa 6

Empresas
Multi-Tenant

Etapa 7

Usuários

Etapa 8

Equipes

Etapa 9

Departamentos

Etapa 10

Configurações da empresa
Fase 3 — CRM

Etapa 11

Clientes

Etapa 12

Contatos

Etapa 13

Leads

Etapa 14

Campos personalizados

Etapa 15

Tags
Fase 4 — Pipeline

Etapa 16

Pipelines

Etapa 17

Etapas

Etapa 18

Cards

Etapa 19

Drag and Drop

Etapa 20

Histórico do Card
Fase 5 — Comunicação

Etapa 21

Conversas

Etapa 22

Chat em tempo real

Etapa 23

WhatsApp

Etapa 24

Instagram

Etapa 25

Facebook Messenger
Fase 6 — Captura de Leads

Etapa 26

Landing Pages

Etapa 27

Facebook Lead Ads

Etapa 28

Google Lead Forms

Etapa 29

Webhooks

Etapa 30

API pública
Fase 7 — Automações

Etapa 31

Engine de Eventos

Etapa 32

Editor Visual estilo n8n

Etapa 33

Condições (IF/ELSE)

Etapa 34

Delays

Etapa 35

Execução das automações
Fase 8 — Gestão Comercial

Etapa 36

Produtos

Etapa 37

Propostas

Etapa 38

Orçamentos

Etapa 39

Contratos

Etapa 40

Assinatura Digital
Fase 9 — Inteligência Artificial

Etapa 41

Integração OpenAI

Etapa 42

Resumo de Conversas

Etapa 43

Classificação Automática de Leads

Etapa 44

IA para responder clientes

Etapa 45

IA para Follow-up
Fase 10 — Administração

Etapa 46

Dashboard

Etapa 47

Relatórios

Etapa 48

Logs

Etapa 49

Backup
Monitoramento
Observabilidade

Etapa 50

Testes finais
Otimizações
Hardening de segurança
Documentação
Deploy para produção (Docker/Kubernetes)
CI/CD

AO FINAL DE CADA ETAPA TESTE E VERIFIQUE SE TUDO ESTA FUNCIONANDO PERFEITAMENTE.
INSTALE QUALQUER PENDENCIA QUE PRECISAR

# VISUALIZAÇÃO CONTÍNUA

O sistema deve permanecer funcional após TODAS as etapas.

Ao concluir cada etapa:

• Executar migrations.

• Iniciar Backend.

• Iniciar Frontend.

• Validar Docker.

• Validar APIs.

• Validar Banco.

• Corrigir qualquer erro encontrado.

Nunca deixar o projeto em estado quebrado.

Sempre entregar uma versão executável.

Toda funcionalidade implementada deverá possuir interface visual quando aplicável.

Caso uma funcionalidade ainda não esteja pronta, criar uma tela indicando "Em desenvolvimento", mantendo a navegação consistente.

O Dashboard Administrativo deve permanecer acessível durante todo o desenvolvimento.

Nunca esperar várias etapas para criar a interface.

# Capturas de tela

Gere capturas de tela (screenshots) do sistema ao final de cada implementação (por exemplo, da página de login, do dashboard e dos novos módulos).

# Ao final de cada etapa deve preencher o arquivo PROJECT_PROGRESS.md com o que foi feito, erros encontrados e soluções, e em qual etapa que está atualmente

# EVENT-DRIVEN ARCHITECTURE (EDA)

A partir da Etapa 22, todo o CRM deverá seguir arquitetura orientada a eventos.

Nenhum módulo poderá acessar diretamente Services de outro módulo.

A comunicação entre módulos deverá ocorrer preferencialmente através do Event Bus.

Fluxo obrigatório:

Controller
↓

UseCase
↓

Repository

↓

Domain Event

↓

Event Bus

↓

Subscribers

↓

Notification Engine
Workflow Engine
Automation Engine
Audit Engine
Timeline Engine
Search Engine
Analytics Engine

Todo evento deverá possuir:

UUID

Timestamp

TenantId

UserId

EntityType

EntityId

Payload

Version

CorrelationId

CausationId

Origin

Todo evento deverá ser persistido.

Implementar Event Store preparado para Event Sourcing futuro.

Implementar Outbox Pattern preparado para filas.

Preparar integração futura com:

RabbitMQ

Kafka

NATS

Redis Streams

Google Pub/Sub

Azure Service Bus

AWS SQS

Nenhum módulo poderá depender diretamente de outro módulo.

Toda comunicação deverá ser desacoplada.

# A partir da Etapa 50, recomenda-se separar formalmente a arquitetura em quatro camadas:

- Operational Layer — módulos transacionais (CRM, ERP, Produção, RH, Financeiro, Logística etc.).
- Integration Layer — Event Bus, APIs internas, SDKs, Workflow Engine e Automation Engine.
- Analytical Layer — Control Tower, Data Warehouse, projeções CQRS e indicadores.
- Intelligence Layer — AI Platform, previsões, otimizações, recomendações e automações inteligentes.