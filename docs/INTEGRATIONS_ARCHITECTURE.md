# INTEGRATIONS ARCHITECTURE — Email & WhatsApp

**Data:** 2026-07-18
**Escopo:** Auditoria e Arquitetura para Integrações de Email e WhatsApp
**Status:** FASE 65.2 COMPLETA — Email Sending implementado

---

## 1. ARQUITETURA ATUAL

### 1.1 Módulos Relacionados

| Módulo | Arquivos | Status |
|--------|----------|--------|
| Conversations | controller, service, module | Implementado (genérico, sem integrações reais) |
| Timeline | controller, service, subscriber | Implementado (event-driven) |
| Integrations | controller, service, module | Implementado (provider registry, sem conexões reais) |
| Notifications | controller, service, module | Implementado (in-app only) |
| Event Bus | event-bus, event-store, domain-events | Implementado (EventEmitter2 + Prisma) |
| Queue | queue.service.ts | Infraestrutura pronta (BullMQ), IntegrationWorker registrado |
| Webhooks | webhooks-receiver, controller | Implementado (POST /webhooks/:provider, idempotência) |
| Encryption | encryption.service.ts | Implementado (AES-256-GCM, global) |
| Company Settings | SMTP config + test email | Implementado (nodemailer para teste) |

### 1.2 Infraestrutura Disponível

- **Event Bus:** EventEmitter2 com persistência em Prisma (EventStore + EventOutbox + DeadLetter)
- **BullMQ:** QueueService + IntegrationWorker registrados
- **Webhooks:** POST /webhooks/:provider com verificação de assinatura + idempotência
- **Encryption:** AES-256-GCM com ENCRYPTION_KEY, global via EncryptionModule
- **File Storage:** Local filesystem (uploads/)
- **Cache:** Redis com ioredis
- **Auth:** JWT双-token (access + refresh), sem OAuth
- **Observability:** Winston structured logging, AuditInterceptor
- **Guards:** JwtAuthGuard, TenantGuard, RolesGuard, PermissionGuard

### 1.3 Frontend

- `/email` → redirect para `/conversations?channel=EMAIL`
- `/whatsapp` → redirect para `/conversations?channel=WHATSAPP`
- `/integrations` → página funcional com provider registry de 28 provedores
- `/conversations` → inbox unificado com filtro por canal
- `/settings` → configuração SMTP + teste de email

---

## 2. PROBLEMAS ENCONTRADOS

### 2.1 Sobreposição de Modelos (CRÍTICO)

Existem **3 camadas** representando o mesmo conceito:

| Camada | Modelos | Propósito |
|--------|---------|-----------|
| **Plataforma** | `WhatsAppAccount`, `InstagramAccount`, `FacebookAccount` | Credenciais por plataforma |
| **Channel** | `Channel` (com `ChannelType` enum) | Canais de comunicação genéricos |
| **Integration** | `Integration` + `IntegrationConnection` | Integrações de terceiros |

**Problema:** Não há relação entre esses modelos. Um WhatsApp pode existir como:
- `WhatsAppAccount` (phoneNumber + credentials)
- `Channel` (type=WHATSAPP + credentials)
- `Integration` (type="whatsapp" + credentials)

...totalmente independentes, sem linkage.

### 2.2 Templates Duplicados

| Modelo | Uso |
|--------|-----|
| `EmailTemplate` | Templates de email (subject + body) |
| `NotificationTemplate` | Templates de notificação (multi-canal) |
| `MessageTemplate` | Templates de mensagem (conversas) |

`NotificationTemplate` com `channel="email"` é funcionalmente equivalente a `EmailTemplate`.

### 2.3 Webhooks Duplicados

| Modelo | Escopo |
|--------|--------|
| `WebhookEndpoint` | Webhooks genéricos (top-level) |
| `IntegrationWebhook` | Webhooks por integração |

Ambos possuem URL, secret, events, retries. Diferença: `IntegrationWebhook` é filho de `Integration`.

### 2.4 Orphaned Foreign Keys

| Modelo | Campo | Aponta para | Problema |
|--------|-------|-------------|----------|
| `WebhookDelivery` | `endpointId` | `WebhookEndpoint.id` | Sem `@relation` |
| `Notification` | `templateId` | `NotificationTemplate.id`? | Sem `@relation`, string solta |
| `NotificationDelivery` | `notificationId` | `Notification.id`? | Sem `@relation` |
| `TimelineBookmark` | `timelineId` | `Timeline.id` | Sem `@relation` |

### 2.5 Canal Padrão Incompatível

O service de conversas usa `'WEBCHAT'` como padrão, mas o enum `ChannelType` não inclui `WEBCHAT` — apenas `CHAT`. Isso causa erro em runtime.

### 2.6 Sem Webhooks Reais

- `simulateWebhookDelivery()` registra intenção mas não faz HTTP real
- `test()` no IntegrationsService retorna always `success: false`
- Nenhum worker/consumer para processar filas

### 2.7 Sem Criptografia de Credenciais

`ENCRYPTION_KEY` existe como variável de ambiente mas não é utilizada. Tokens e credenciais são armazenados em texto puro no banco.

### 2.8 Conversations Sem Event Bus

O módulo conversations não publica nem consome eventos. Não há:
- Evento de mensagem recebida
- Evento de mensagem enviada
- Evento de conversa criada/atualizada
- Subscriber para notificações em tempo real

### 2.9 Timeline Sem Messages

A Timeline não ouve eventos de mensagens. Não há:
- `message.received`
- `message.sent`
- `message.delivered`

### 2.10 Sem WebSocket

Não há gateway WebSocket para entregas em tempo real. Mensagens são obtidas via polling REST.

---

## 3. ESTADO ATUAL — EMAIL

### 3.1 O que existe

| Componente | Status | Detalhes |
|------------|--------|----------|
| `EmailTemplate` model | ✅ Criado | name, subject, body, variables, category |
| `ChannelType.EMAIL` | ✅ Criado | Enum value |
| `Channel` (type=EMAIL) | ✅ Criado | credentials, config, webhookUrl |
| SMTP config (settings) | ✅ Implementado | smtpHost, smtpPort, smtpUser, smtpPassword |
| `testEmail()` | ✅ Implementado | nodemailer via company-settings |
| `PATCH /company/settings/smtp` | ✅ Implementado | Salva config SMTP por tenant |
| `POST /company/test-email` | ✅ Implementado | Testa conexão SMTP |
| `/email` redirect | ✅ Implementado | Redireciona para conversations |
| Workflow `EMAIL` node | ⚠️ Stub | Apenas log: "Would send email" |
| Automation `SEND_EMAIL` | ⚠️ Stub | Apenas log |
| AI `send_email` tool | ⚠️ Stub | Registrado, não funcional |

### 3.2 O que NÃO existe

- Envio real de email (fora do teste SMTP)
- Recebimento de email (IMAP/POP3/webhook)
- Sincronização de caixa de entrada
- Threading de emails (conversas encadeadas)
- Anexos de email
- Rate limiting de envio
- Retry com backoff
- Registro de envios/recebimentos
- Webhook de recebimento
- OAuth2 para Gmail/Microsoft

---

## 4. ESTADO ATUAL — WHATSAPP

### 4.1 O que existe

| Componente | Status | Detalhes |
|------------|--------|----------|
| `WhatsAppAccount` model | ✅ Criado | phoneNumber, name, credentials |
| `ChannelType.WHATSAPP` | ✅ Criado | Enum value |
| `Channel` (type=WHATSAPP) | ✅ Criado | credentials, config, webhookUrl |
| `Integration` (whatsapp) | ✅ Criado | PROVIDER_REGISTRY entry |
| `/whatsapp` redirect | ✅ Implementado | Redireciona para conversations |
| Workflow `WHATSAPP` node | ⚠️ Stub | Apenas log: "Would send WhatsApp" |
| Automation `SEND_WHATSAPP` | ⚠️ Stub | Apenas log |
| AI `send_whatsapp` tool | ⚠️ Stub | Registrado, não funcional |

### 4.2 O que NÃO existe

- Conexão com WhatsApp Business API
- Envio de mensagens
- Recebimento de mensagens (webhook)
- Validação de assinatura de webhook
- Templates de mensagens (WhatsApp Business)
- Status de entrega (sent/delivered/read)
- Rate limiting
- Retry com backoff
- Sessões/múltiplos números
- Gestão de contatos
- Webhook receiver endpoint

---

## 5. ARQUITETURA RECOMENDADA

### 5.1 Princípios

1. **Não duplicar:** Usar os modelos existentes (`Channel`, `Conversation`, `Message`) como base
2. **Consolidar:** Eliminar sobreposições (`WhatsAppAccount` → `Channel`)
3. **Event-driven:** Toda mensagem publica eventos para Timeline, Notifications, Search
4. **Multi-tenant:** Isolamento completo por tenant
5. **Idempotência:** Webhooks podem ser reenviados sem efeito colateral
6. **Retry com backoff:** Falhas transitórias são retentadas
7. **Segredos criptografados:** Nunca texto puro em produção

### 5.2 Decisões de Modelo

| Modelo Atual | Decisão | Ação |
|--------------|---------|------|
| `Channel` | **MANTER** como modelo primário de canal | É o modelo correto para represents canais de comunicação |
| `WhatsAppAccount` | **CONSOLIDAR** → `Channel` | Migrar dados para `Channel` (type=WHATSAPP), depois remover modelo |
| `InstagramAccount` | **CONSOLIDAR** → `Channel` | Migrar dados para `Channel` (type=INSTAGRAM), depois remover modelo |
| `FacebookAccount` | **CONSOLIDAR** → `Channel` | Migrar dados para `Channel` (type=FACEBOOK), depois remover modelo |
| `Integration` | **MANTER** para integrações de terceiros genéricas (CRM, payment, etc.) | Não usar para canais de comunicação |
| `EmailTemplate` | **CONSOLIDAR** → `MessageTemplate` | `MessageTemplate` já suporta `channel` field |
| `NotificationTemplate` | **MANTER** para notificações internas | Não confundir com templates de mensagem |
| `WebhookEndpoint` | **MANTER** para webhooks genéricos de saída | |
| `IntegrationWebhook` | **MANTER** para webhooks específicos de integração | |

### 5.3 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
│  /conversations (inbox unificado)                   │
│  /email (composição + inbox dedicado)               │
│  /whatsapp (composição + inbox dedicado)            │
│  /settings/channels (configuração de canais)        │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                API LAYER (NestJS)                    │
│  ConversationsController (genérico)                 │
│  EmailController (email específico)                 │
│  WhatsAppController (whatsapp específico)           │
│  WebhookReceiverController (endpoints de webhook)   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              SERVICE LAYER                          │
│  ConversationsService (CRUD genérico)               │
│  EmailService (send/receive/sync)                   │
│  WhatsAppService (send/receive/templates)           │
│  ChannelService (gestão de canais)                  │
│  WebhookReceiverService (validação + idempotência)  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           INTEGRATION ADAPTERS                      │
│  EmailAdapter (interface)                           │
│  ├── SmtpAdapter (nodemailer)                       │
│  ├── ResendAdapter                                  │
│  ├── SendGridAdapter                                │
│  └── AmazonSesAdapter                               │
│  WhatsAppAdapter (interface)                        │
│  ├── MetaCloudApiAdapter (WhatsApp Business API)    │
│  └── TwilioAdapter                                  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              EVENT BUS (EventEmitter2)              │
│  message.received → Timeline, Search, Notifications │
│  message.sent     → Timeline, Analytics             │
│  message.delivered → Timeline, Status update        │
│  channel.connected → Notifications                  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           PERSISTENCE (Prisma + PostgreSQL)         │
│  Channel, Conversation, Message, MessageAttachment  │
│  Timeline, Notification, IntegrationLog             │
└─────────────────────────────────────────────────────┘
```

### 5.4 Padrão de Adapter

```typescript
// Interface comum para qualquer provedor de email
interface EmailAdapter {
  send(params: SendEmailParams): Promise<SendEmailResult>;
  receive?(webhookPayload: unknown): Promise<IncomingEmail>;
  validateSignature?(headers: Record<string, string>, body: string): boolean;
}

// Interface comum para qualquer provedor de WhatsApp
interface WhatsAppAdapter {
  send(params: SendWhatsAppParams): Promise<SendWhatsAppResult>;
  receive?(webhookPayload: unknown): Promise<IncomingWhatsAppMessage>;
  validateSignature?(headers: Record<string, string>, body: string): boolean;
  getTemplateStatus?(templateId: string): Promise<TemplateStatus>;
}

// Resultado padrão
interface SendResult {
  externalId: string;       // ID no provedor externo
  status: 'sent' | 'queued' | 'failed';
  errorCode?: string;
  errorMessage?: string;
}
```

---

## 6. MODELO DE DADOS RECOMENDADO

### 6.1 Modelos a MANTER (sem alteração significativa)

| Modelo | Justificativa |
|--------|---------------|
| `Channel` | Modelo primário para canais (EMAIL, WHATSAPP, etc.) |
| `Conversation` | Já suporta `channel` field, links com contact/deal/company |
| `Message` | Já suporta `direction`, `channel`, `externalId`, `status`, `attachments` |
| `MessageAttachment` | Anexos de mensagens |
| `MessageTemplate` | Templates de mensagem por canal |
| `ConversationQueue` | Filas de atendimento |
| `ConversationAssignment` | Histórico de atribuições |
| `ConversationNote` | Notas internas |
| `Timeline` | Timeline unificada |
| `Integration` | Para integrações genéricas (CRMs, payments, etc.) |
| `IntegrationLog` | Logs de integração |
| `WebhookEndpoint` | Webhooks de saída |
| `WebhookDelivery` | Entregas de webhooks |
| `Notification` | Notificações in-app |
| `EmailTemplate` | Manter até migração para `MessageTemplate` |

### 6.2 Modelos a ADICIONAR

#### `EmailAccount` (substitui implicitamente o uso de `Channel` para email)

```prisma
model EmailAccount {
  id            String   @id @default(uuid())
  channel_id    String   // FK para Channel (type=EMAIL)
  email         String   // endereço de email
  name          String?  // nome de exibição
  provider      String   // "smtp", "resend", "sendgrid", "ses", "gmail", "microsoft"
  credentials   Json     // { host, port, user, password, clientId, clientSecret, etc. }
  config        Json?    // { fromName, fromEmail, replyTo, maxSendRate, etc. }
  isActive      Boolean  @default(true)
  isConnected   Boolean  @default(false)
  lastSyncAt    DateTime?
  syncStatus    String?
  healthScore   String   @default("unknown")
  tenantId      String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  messages      EmailMessage[]

  @@unique([channel_id])
  @@index([tenantId])
  @@map("email_accounts")
}
```

#### `EmailMessage` (rastreamento de emails enviados/recebidos)

```prisma
model EmailMessage {
  id              String   @id @default(uuid())
  externalId      String?  // ID no provedor (Message-ID, etc.)
  messageId       String?  // FK para Message (conversa unificada)
  conversationId  String?  // FK para Conversation
  accountId       String   // FK para EmailAccount
  direction       String   // "inbound" | "outbound"
  from            String   // remetente
  to              String[] // destinatários
  cc              String[]
  bcc             String[]
  subject         String
  bodyText        String?  // corpo em texto puro
  bodyHtml        String?  // corpo em HTML
  threadId        String?  // ID do thread (para threading)
  inReplyTo       String?  // Message-ID do email respondido
  status          String   @default("pending") // pending, sent, delivered, failed, bounced
  sentAt          DateTime?
  deliveredAt     DateTime?
  readAt          DateTime?
  bouncedAt       DateTime?
  bounceReason    String?
  errorMessage    String?
  metadata        Json?    // headers, tags, etc.
  tenantId        String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  account         EmailAccount @relation(fields: [accountId], references: [id])
  tenant          Tenant       @relation(fields: [tenantId], references: [id])

  @@unique([externalId, tenantId])
  @@index([tenantId])
  @@index([accountId])
  @@index([conversationId])
  @@index([threadId])
  @@index([status])
  @@index([createdAt])
  @@map("email_messages")
}
```

#### `WhatsAppMessage` (rastreamento específico de WhatsApp)

```prisma
model WhatsAppMessage {
  id              String   @id @default(uuid())
  externalId      String?  // WhatsApp Message ID
  messageId       String?  // FK para Message (conversa unificada)
  conversationId  String?  // FK para Conversation
  channel_id      String   // FK para Channel (type=WHATSAPP)
  direction       String   // "inbound" | "outbound"
  from            String   // número de telefone
  to              String   // número de telefone
  messageType     String   @default("text") // text, image, video, audio, document, location, template
  content         Json?    // conteúdo variável por tipo
  templateName    String?  // nome do template (para templates aprovados)
  templateParams  String[] // parâmetros do template
  status          String   @default("pending") // pending, sent, delivered, read, failed
  sentAt          DateTime?
  deliveredAt     DateTime?
  readAt          DateTime?
  failedAt        DateTime?
  errorCode       String?
  errorMessage    String?
  metadata        Json?    // wa_id, system_metadata, etc.
  tenantId        String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  channel         Channel  @relation(fields: [channel_id], references: [id])
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([externalId, tenantId])
  @@index([tenantId])
  @@index([channel_id])
  @@index([conversationId])
  @@index([status])
  @@index([createdAt])
  @@map("whatsapp_messages")
}
```

#### `WebhookLog` (logs de webhooks recebidos)

```prisma
model WebhookLog {
  id              String   @id @default(uuid())
  provider        String   // "email", "whatsapp", "instagram", etc.
  direction       String   // "inbound" | "outbound"
  headers         Json
  body            Json
  signatureValid  Boolean?
  processed       Boolean  @default(false)
  errorMessage    String?
  metadata        Json?
  tenantId        String?
  createdAt       DateTime @default(now())

  @@index([provider])
  @@index([tenantId])
  @@index([createdAt])
  @@map("webhook_logs")
}
```

### 6.3 Alterações em Modelos Existentes

#### `Channel` — adicionar campos

```prisma
model Channel {
  // ... campos existentes ...
  config        Json?    // adicionar: { defaultSignature, sendRateLimit, etc. }
  // Adicionar relação:
  emailAccount  EmailAccount?
  whatsappMessages WhatsAppMessage[]
}
```

#### `Message` — adicionar campos

```prisma
model Message {
  // ... campos existentes ...
  emailMessageId  String?  // FK para EmailMessage (se direction=EMAIL)
  whatsappMessageId String? // FK para WhatsAppMessage (se direction=WHATSAPP)
}
```

---

## 7. FLUXO DE EMAIL

### 7.1 Envio

```
Usuário compõe email
    ↓
API: POST /conversations/messages (channel=EMAIL)
    ↓
ConversationsService.sendMessage()
    ↓
EmailService.send()
    ↓
1. Criar Message (status=pending)
2. Criar EmailMessage (status=pending)
3. Selecionar EmailAdapter (baseado no provider da conta)
4. Adapter.send()
    ↓
5a. Sucesso → status=sent, sentAt=now()
5b. Falha → status=failed, errorMessage
    ↓
6. Publicar evento: message.sent
7. TimelineSubscriber grava na Timeline
8. Atualizar Conversation.lastMessageAt
```

### 7.2 Recebimento (Webhook)

```
Provedor envia webhook (ex: SendGrid Inbound Parse)
    ↓
API: POST /webhooks/email
    ↓
WebhookReceiverService.processEmail()
    ↓
1. Validar assinatura (HMAC-SHA256)
2. Verificar idempotência (externalId)
3. Parsear payload
    ↓
4. Buscar ou criar Contact (por email do remetente)
5. Buscar ou criar Conversation (channel=EMAIL, contactId)
6. Criar Message (direction=INBOUND)
7. Criar EmailMessage (direction=inbound)
    ↓
8. Publicar evento: message.received
9. TimelineSubscriber grava na Timeline
10. SearchSubscriber indexa conteúdo
11. NotificationService envia notificação in-app
```

### 7.3 Threading

```
Email recebido com In-Reply-To
    ↓
1. Buscar EmailMessage existente pelo threadId
2. Se encontrada → adicionar à Conversation existente
3. Se não → criar nova Conversation
4. Message.replyToId = Message anterior
```

### 7.4 Retry

```
Falha no envio
    ↓
1. Registrar falha no EmailMessage
2. Se retryCount < maxRetries:
   a. Agendar job na fila com delay exponencial
   b. delay = baseDelay * 2^retryCount
3. Se retryCount >= maxRetries:
   a. Status = failed permanently
   b. Notificar admin
   c. Registrar em IntegrationLog
```

---

## 8. FLUXO DE WHATSAPP

### 8.1 Envio

```
Usuário compõe mensagem
    ↓
API: POST /conversations/messages (channel=WHATSAPP)
    ↓
ConversationsService.sendMessage()
    ↓
WhatsAppService.send()
    ↓
1. Criar Message (status=pending)
2. Criar WhatsAppMessage (status=pending)
3. Selecionar WhatsAppAdapter (baseado no provider)
4. Validar: número formatado, template aprovado (se aplicável)
5. Adapter.send()
    ↓
6a. Sucesso → status=sent, externalId, sentAt
6b. Falha → status=failed, errorCode, errorMessage
    ↓
7. Publicar evento: message.sent
```

### 8.2 Recebimento (Webhook)

```
Meta Cloud API envia webhook
    ↓
API: POST /webhooks/whatsapp
    ↓
WebhookReceiverService.processWhatsApp()
    ↓
1. Validar assinatura (X-Hub-Signature-256)
2. Verificar idempotência (externalId)
3. Parsear payload (entry[0].changes[0].value)
    ↓
4. Determinar tipo: message, status, template_status
5. Para messages:
   a. Extrair: from, to, type, content, timestamp
   b. Buscar ou criar Contact (por número)
   c. Buscar ou criar Conversation (channel=WHATSAPP)
   d. Criar Message (direction=INBOUND)
   e. Criar WhatsAppMessage
6. Para status:
   a. Atualizar WhatsAppMessage.status
   b. Atualizar Message.status
    ↓
7. Publicar evento: message.received ou message.delivered
```

### 8.3 Templates

```
Envio de template aprovado
    ↓
1. Verificar se template está aprovado no Meta
2. Substituir parâmetros
3. Enviar via API
4. Registrar templateName + templateParams no WhatsAppMessage
```

### 8.4 Rate Limiting

```
WhatsApp Business API limits:
- 100 mensagens/segundo (Utility)
- 10 mensagens/segundo (Marketing)
- 10 mensagens/segundo (Authentication)

Implementação:
1. Fila BullMQ por conta WhatsApp
2. Rate limiter por conta (token bucket)
3. Retry com backoff exponencial
```

---

## 9. FLUXO DA TIMELINE

### 9.1 Eventos de Mensagem

| Evento | Entidade | EventType | Summary |
|--------|----------|-----------|---------|
| `message.received` | message | received | "Email recebido de {from}" / "Mensagem WhatsApp recebida" |
| `message.sent` | message | sent | "Email enviado para {to}" / "Mensagem WhatsApp enviada" |
| `message.delivered` | message | delivered | "Email entregue" / "Mensagem entregue" |
| `message.read` | message | read | "Email lido" / "Mensagem lida" |
| `message.failed` | message | failed | "Falha no envio: {error}" |
| `channel.connected` | channel | connected | "Canal {type} conectado" |
| `channel.disconnected` | channel | disconnected | "Canal {type} desconectado" |

### 9.2 Integração com Timeline Unificada

```
Mensagem recebida/enviada
    ↓
Publicar DomainEvent (message.received / message.sent)
    ↓
TimelineSubscriber.record()
    ↓
TimelineService.recordEvent({
  module: 'message',
  action: 'message.received',
  entity: 'Message',
  entityId: message.id,
  eventType: 'received',
  summary: 'Email recebido de john@example.com',
  payload: {
    channel: 'EMAIL',
    direction: 'INBOUND',
    from: 'john@example.com',
    subject: 'Re: Proposta Comercial',
    conversationId: '...',
    contactId: '...',
  },
  userId: recipientUserId,
  tenantId: tenantId,
})
```

### 9.3 Evitar Duplicação

- **Conversation** = container de mensagens (por canal + contato)
- **Message** = mensagem individual (texto + anexos + status)
- **Timeline** = registro de auditoria (evento + contexto)
- **Activity** = registro de atividade CRM (call, meeting, task)

**Regra:** Uma mensagem cria:
1. Um registro em `Message` (dados operacionais)
2. Um registro em `Timeline` (auditoria, via evento)
3. Opcionalmente, um registro em `Activity` (se for uma atividade CRM)

NÃO criar:
- Um `Activity` para cada mensagem (seria ruído)
- Um `Timeline` manualmente (usar eventos)

---

## 10. WEBHOOKS

### 10.1 Webhooks de Entrada (Recebidos)

#### Email

| Provedor | Endpoint | Validação |
|----------|----------|-----------|
| SendGrid Inbound Parse | `POST /webhooks/email/sendgrid` | Webhook ID |
| Amazon SES | `POST /webhooks/email/ses` | HMAC-SHA256 (AWS) |
| Mailgun | `POST /webhooks/email/mailgun` | HMAC-SHA256 |
| Resend | `POST /webhooks/email/resend` | Signature header |
| Postmark | `POST /webhooks/email/postmark` | X-Postmark-Signature |

#### WhatsApp

| Provedor | Endpoint | Validação |
|----------|----------|-----------|
| Meta Cloud API | `POST /webhooks/whatsapp/meta` | X-Hub-Signature-256 |
| Twilio | `POST /webhooks/whatsapp/twilio` | X-Twilio-Signature |

### 10.2 Webhooks de Saída (Enviados)

Usar `WebhookEndpoint` existente + `WebhookDelivery` para tracking.

Eventos disponíveis para webhooks de saída:
- `message.received`
- `message.sent`
- `message.delivered`
- `channel.connected`
- `channel.disconnected`

### 10.3 Endpoints de Webhook

```
POST /api/v1/webhooks/email/:tenantId/:channelId
POST /api/v1/webhooks/whatsapp/:tenantId/:channelId
POST /api/v1/webhooks/instagram/:tenantId/:channelId
POST /api/v1/webhooks/facebook/:tenantId/:channelId
```

**Autenticação:** Bearer token por tenant + validação de assinatura do provedor.

---

## 11. IDEMPOTÊNCIA

### 11.1 Mecanismo

```typescript
// Em WebhookReceiverService
async function processWebhook(provider: string, payload: WebhookPayload) {
  // 1. Extrair externalId do payload
  const externalId = extractExternalId(provider, payload);

  // 2. Verificar se já processado
  const existing = await this.prisma.webhookLog.findFirst({
    where: { provider, externalId, processed: true }
  });
  if (existing) return { status: 'duplicate' };

  // 3. Registrar tentativa
  const log = await this.prisma.webhookLog.create({
    data: { provider, externalId, headers: payload.headers, body: payload.body, processed: false }
  });

  // 4. Processar
  try {
    await processMessage(provider, payload);
    await this.prisma.webhookLog.update({ where: { id: log.id }, data: { processed: true } });
    return { status: 'processed' };
  } catch (error) {
    await this.prisma.webhookLog.update({ where: { id: log.id }, data: { errorMessage: error.message } });
    throw error;
  }
}
```

### 11.2 Chave de Idempotência

- **Email:** `Message-ID` header (unique per email)
- **WhatsApp:** `wa_id` + `timestamp` (unique per message)

---

## 12. RETRY

### 12.1 Estratégia

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,      // 1 segundo
  maxDelay: 300000,     // 5 minutos
  backoffMultiplier: 2, // exponencial
  retryableErrors: [
    'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED',
    'rate_limit_exceeded', 'temporary_error',
  ],
};
```

### 12.2 Implementação com BullMQ

```typescript
// Enviar email com retry
await this.queueService.addJob('email-outbound', 'send', {
  messageId: message.id,
  retryCount: 0,
}, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
});
```

---

## 13. MULTI-TENANCY

### 13.1 Isolamento

| Modelo | Campo Tenant | Isolamento |
|--------|-------------|------------|
| `Channel` | `tenantId` | ✅ Query scope |
| `Conversation` | `tenantId` | ✅ Query scope |
| `Message` | `tenantId` | ✅ Query scope |
| `EmailAccount` | `tenantId` | ✅ Query scope |
| `EmailMessage` | `tenantId` | ✅ Query scope |
| `WhatsAppMessage` | `tenantId` | ✅ Query scope |
| `Integration` | `tenantId` | ✅ Query scope |

### 13.2 Isolamento de Credenciais

```
Cada tenant possui:
- Suas próprias credenciais de email (SMTP/API key)
- Suas próprias credenciais de WhatsApp (phone number + token)
- Seus próprios webhooks
- Seus próprios logs

Nunca compartilhar credenciais entre tenants.
```

### 13.3 Controle de Permissões

| Ação | Roles Permitidos |
|------|-----------------|
| Configurar canal | admin |
| Enviar mensagem | agent, admin, manager |
| Receber mensagem | system (webhook) |
| Visualizar conversas | agent (próprias + atribuídas), admin (todas) |
| Excluir mensagem | admin |
| Gerenciar templates | admin, manager |

---

## 14. SEGURANÇA

### 14.1 Armazenamento de Tokens

| Campo | Criptografia | Observação |
|-------|-------------|------------|
| `Channel.credentials` | AES-256-GCM | Usar ENCRYPTION_KEY |
| `EmailAccount.credentials` | AES-256-GCM | Usar ENCRYPTION_KEY |
| `WhatsAppMessage.credentials` | AES-256-GCM | Usar ENCRYPTION_KEY |
| `Integration.credentials` | AES-256-GCM | Usar ENCRYPTION_KEY |
| `IntegrationConnection.accessToken` | AES-256-GCM | Usar ENCRYPTION_KEY |
| `IntegrationConnection.refreshToken` | AES-256-GCM | Usar ENCRYPTION_KEY |
| `Channel.webhookSecret` | AES-256-GCM | Usar ENCRYPTION_KEY |

### 14.2 Webhook Signature Validation

```typescript
// Email (ex: SendGrid)
function validateSendGridSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// WhatsApp (Meta)
function validateMetaSignature(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### 14.3 CSRF

- Webhooks de entrada: não necessitam CSRF (são chamadas server-to-server)
- Ações de envio via frontend: protegidas por JWT + SameSite cookies

### 14.4 Rate Limiting

```
Rate limits por endpoint:
- POST /webhooks/*     → 1000/min por IP (webhooks são frequentes)
- POST /messages       → 60/min por usuário
- GET /conversations   → 120/min por usuário

Implementação: ThrottlerGuard (já existe no projeto)
```

### 14.5 Logs Sem Dados Sensíveis

```typescript
// NÃO logar:
// - Senhas SMTP
// - Tokens de acesso
// - Refresh tokens
// - Content de mensagens (opcional, LGPD)

// SIM logar:
// - IDs de mensagem
// - Status de entrega
// - Erros (sem credenciais)
// - Metadados (canal, dirección, timestamps)
```

### 14.6 Proteção de Anexos

```
Anexos de email/WhatsApp:
1. Download via URL assinada (expira em 1h)
2. Validação de MIME type
3. Limite de tamanho: 25MB (email), 16MB (WhatsApp)
4. Scan de vírus (opcional, para produção)
```

---

## 15. PROVEDORES AVALIADOS

### 15.1 Email

| Provedor | Envio | Recebimento | OAuth | Multi-tenant | Custo | Recomendação |
|----------|-------|-------------|-------|-------------|-------|--------------|
| **SMTP (nodemailer)** | ✅ | ❌ | ❌ | ✅ | Grátis (próprio) | **Fase 1** — mais simples, já implementado para teste |
| **Resend** | ✅ | ✅ (webhooks) | ❌ | ✅ | $20/mês (50k) | **Fase 2** — moderno, bom DX |
| **SendGrid** | ✅ | ✅ (Inbound Parse) | ❌ | ✅ | Grátis (100/dia) | **Fase 2** — alternativa madura |
| **Amazon SES** | ✅ | ✅ (SNS) | ❌ | ✅ | $0.10/1000 | **Fase 3** — mais barato em escala |
| **Gmail API** | ✅ | ✅ (push) | ✅ | ✅ | Grátis | **Fase 3** — precisa OAuth flow |
| **Microsoft Graph** | ✅ | ✅ (push) | ✅ | ✅ | Grátis | **Fase 3** — precisa OAuth flow |

**Recomendação:** Começar com SMTP (já testado), depois Resend ou SendGrid para recebimento via webhook.

### 15.2 WhatsApp

| Provedor | Envio | Recebimento | Templates | Multi-tenant | Custo | Recomendação |
|----------|-------|-------------|-----------|-------------|-------|--------------|
| **Meta Cloud API** | ✅ | ✅ (webhook) | ✅ | ✅ | $0.005-0.08/msg | **Fase 1** — oficial, melhor opção |
| **Twilio** | ✅ | ✅ (webhook) | ✅ | ✅ | $0.005-0.08/msg | **Fase 2** — wrapper sobre Meta API |
| **Baileys** | ✅ | ✅ | ❌ | ⚠️ | Grátis | **NÃO recomendado** — não oficial, risco de ban |
| **WPPConnect** | ✅ | ✅ | ❌ | ⚠️ | Grátis | **NÃO recomendado** — não oficial |

**Recomendação:** Meta Cloud API (oficial, suportado, templates aprovados).

---

## 16. DECISÕES QUE PRECISAM SER TOMADAS

### 16.1 Decisões de Provedor

| # | Decisão | Opções | Recomendação |
|---|---------|--------|--------------|
| 1 | Provedor de email para envio | SMTP, Resend, SendGrid, Amazon SES | SMTP (fase 1), depois Resend |
| 2 | Provedor de email para recebimento | SendGrid Inbound, Amazon SES, Resend | Depende do provedor de envio |
| 3 | Provedor de WhatsApp | Meta Cloud API, Twilio | Meta Cloud API |
| 4 | OAuth para Gmail/Microsoft | Implementar ou não | Não na fase 1 |
| 5 | Armazenamento de anexos | Local filesystem, S3 | Local (já implementado), S3 depois |

### 16.2 Decisões de Arquitetura

| # | Decisão | Opções | Recomendação |
|---|---------|--------|--------------|
| 6 | Consolidar WhatsAppAccount → Channel? | Sim, Não | Sim |
| 7 | Consolidar EmailTemplate → MessageTemplate? | Sim, Não | Sim (após migração) |
| 8 | WebSocket para tempo real? | Sim, Não | Não na fase 1 (polling) |
| 9 | Worker BullMQ para envio? | Sim, Não | Sim (async processing) |
| 10 | Criptografia de credenciais? | AES-256-GCM, Vault, plaintext | AES-256-GCM |

### 16.3 Decisões de Negócio

| # | Decisão | Opções | Recomendação |
|---|---------|--------|--------------|
| 11 | Limite de envio por tenant? | Configurável, fixo | Configurável (settings) |
| 12 | Templates de email aprovados? | Sim, Não | Sim (MessageTemplate) |
| 13 | Threading automático de emails? | Sim, Não | Sim (por In-Reply-To) |
| 14 | Notificação de falha de envio? | In-app, email, ambos | In-app |
| 15 | Rate limiting por usuário? | Sim, Não | Sim (ThrottlerGuard) |

---

## 17. ORDEM RECOMENDADA DE IMPLEMENTAÇÃO

### Fase 65.1 — Fundação (Sem provedores externos)

1. **Corrigir `WEBCHAT` → `CHAT`** no conversations service
2. **Adicionar eventos de mensagem** ao Event Bus:
   - `message.received`
   - `message.sent`
   - `message.delivered`
   - `message.failed`
3. **Integrar messages com Timeline** via TimelineSubscriber
4. **Implementar webhook receiver genérico** (`POST /webhooks/:provider/:tenantId/:channelId`)
5. **Implementar criptografia de credenciais** (AES-256-GCM)
6. **Adicionar `WebhookLog` model** para idempotência

### Fase 65.2 — Email (Envio via SMTP)

1. **Criar `EmailAccount` model** (Prisma migration)
2. **Criar `EmailMessage` model** (Prisma migration)
3. **Implementar `EmailAdapter` interface**
4. **Implementar `SmtpAdapter`** (usando nodemailer existente)
5. **Implementar `EmailService.send()`** com retry BullMQ
6. **Adicionar `POST /channels/email/connect`** (configurar SMTP)
7. **Integrar envio com conversations existentes**
8. **Adicionar email à sidebar** (substituir redirect)

### Fase 65.3 — Email (Recebimento)

1. **Implementar webhook receiver para email** (SendGrid Inbound ou similar)
2. **Implementar Contact matching** (por endereço de email)
3. **Implementar Conversation matching** (criar ou reutilizar)
4. **Implementar threading** (In-Reply-To)
5. **Integrar recebimento com Timeline**

### Fase 65.4 — WhatsApp (Envio + Recebimento)

1. **Criar `WhatsAppMessage` model** (Prisma migration)
2. **Implementar `WhatsAppAdapter` interface**
3. **Implementar `MetaCloudApiAdapter`** (WhatsApp Business Cloud API)
4. **Implementar webhook receiver para WhatsApp** (Meta)
5. **Implementar validação de assinatura** (X-Hub-Signature-256)
6. **Implementar envio com templates**
7. **Implementar rate limiting** (BullMQ queue per account)
8. **Adicionar WhatsApp à sidebar** (substituir redirect)

### Fase 65.5 — Consolidação

1. **Migrar `WhatsAppAccount` → `Channel`**
2. **Migrar `EmailTemplate` → `MessageTemplate`**
3. **Remover modelos consolidados**
4. **Corrigir orphaned foreign keys**
5. **Implementar notificações de falha**
6. **Documentação final**

---

## COMPONETES REUTILIZÁVEIS

| Componente | Localização | Reutilização |
|------------|-------------|--------------|
| EventBus (EventEmitter2) | `infrastructure/event-bus/` | Publicar eventos de mensagem |
| TimelineSubscriber | `modules/timeline/` | Gravar mensagens na Timeline |
| QueueService (BullMQ) | `infrastructure/queue/` | Fila de envio assíncrono |
| CacheService (Redis) | `infrastructure/cache/` | Rate limiting, idempotência |
| JwtAuthGuard | `common/guards/` | Autenticação de endpoints |
| TenantGuard | `common/guards/` | Isolamento multi-tenant |
| AuditInterceptor | `common/interceptors/` | Auditoria de envios |
| AppLogger | `infrastructure/observability/` | Logging estruturado |
| ConversationsService | `modules/conversations/` | CRUD de conversas |
| Channel model | Prisma schema | Modelo primário de canal |
| Message model | Prisma schema | Modelo primário de mensagem |
| Conversation model | Prisma schema | Container de mensagens |
| IntegrationLog model | Prisma schema | Logs de operações |

---

*Documento gerado em 2026-07-18. Sem implementação de código.*
