export interface IDomainEvent {
  eventId: string;
  eventName: string;
  aggregateId?: string;
  aggregateType?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  tenantId: string;
  userId?: string;
  version: number;
  correlationId?: string;
  causationId?: string;
  origin?: string;
}

export class BaseDomainEvent implements IDomainEvent {
  eventId: string;
  eventName: string;
  aggregateId?: string;
  aggregateType?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  tenantId: string;
  userId?: string;
  version: number;
  correlationId?: string;
  causationId?: string;
  origin?: string;

  constructor(
    props: Partial<IDomainEvent> & {
      eventName: string;
      payload: Record<string, unknown>;
      tenantId: string;
    },
  ) {
    this.eventId = props.eventId || crypto.randomUUID();
    this.eventName = props.eventName;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.payload = props.payload;
    this.metadata = props.metadata || {};
    this.timestamp = props.timestamp || new Date();
    this.tenantId = props.tenantId;
    this.userId = props.userId;
    this.version = props.version || 1;
    this.correlationId = props.correlationId;
    this.causationId = props.causationId;
    this.origin = props.origin || 'crm-internal';
  }
}

export class LeadCreatedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'lead.created',
      aggregateType: 'Lead',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class LeadConvertedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'lead.converted',
      aggregateType: 'Lead',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class LeadAssignedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'lead.assigned',
      aggregateType: 'Lead',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class LeadReassignedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'lead.reassigned',
      aggregateType: 'Lead',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class LeadIntakeEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'lead.intake',
      aggregateType: 'Lead',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class ContactCreatedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'contact.created',
      aggregateType: 'Contact',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class CompanyCreatedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'company.created',
      aggregateType: 'Company',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class DealCreatedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'deal.created',
      aggregateType: 'Deal',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class DealWonEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'deal.won',
      aggregateType: 'Deal',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class DealLostEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'deal.lost',
      aggregateType: 'Deal',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class ContractSignedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'contract.signed',
      aggregateType: 'Contract',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class ActivityCreatedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'activity.created',
      aggregateType: 'Activity',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class UserCreatedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'user.created',
      aggregateType: 'User',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class TaskCompletedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'task.completed',
      aggregateType: 'Task',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class MessageCreatedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'message.created',
      aggregateType: 'Message',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class MessageSentEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'message.sent',
      aggregateType: 'Message',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class MessageReceivedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'message.received',
      aggregateType: 'Message',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class MessageDeliveredEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'message.delivered',
      aggregateType: 'Message',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class MessageFailedEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'message.failed',
      aggregateType: 'Message',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class WhatsAppTemplateEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'whatsapp.template',
      aggregateType: 'WhatsApp',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}

export class WhatsAppSessionUpdateEvent extends BaseDomainEvent {
  constructor(payload: Record<string, unknown>, tenantId: string, userId?: string) {
    super({
      eventName: 'whatsapp.session_update',
      aggregateType: 'WhatsApp',
      aggregateId: payload.id as string,
      payload,
      tenantId,
      userId,
    });
  }
}
