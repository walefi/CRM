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
