Execute o CRM_V1_COMPLETION_MASTER_PLAN.md.

Siga rigorosamente o protocolo de execução descrito no documento.

Antes de iniciar:

1. Leia completamente:
   - CRM_V1_COMPLETION_MASTER_PLAN.md
   - Project_rules.md
   - roadmap.md
   - PROJECT_PROGRESS.md
   - toda a documentação referenciada pela etapa atual.

2. Descubra automaticamente qual é a PRIMEIRA etapa ainda não concluída.

3. Implemente SOMENTE essa etapa.

Durante a implementação:

- Respeite toda a arquitetura existente.
- Nunca duplique código.
- Reutilize Services, Modules, Guards, Event Bus, BullMQ e componentes existentes.
- Nunca utilize mocks ou dados fictícios.
- Sempre utilizar dados reais do banco.
- Manter isolamento por tenant.
- Garantir compatibilidade com funcionalidades já implementadas.
- Não quebrar APIs existentes.
- Manter TypeScript sem erros.
- Seguir padrões do NestJS, Prisma e Next.js já utilizados no projeto.

Antes de finalizar:

- Executar Prisma Validate.
- Executar Prisma Generate.
- Executar Backend Build.
- Executar Frontend Build.
- Executar TypeScript.
- Executar todos os testes.

Se algum teste falhar:

- Corrigir.
- Executar novamente.
- Nunca deixar testes quebrados.

Ao concluir:

- Atualizar PROJECT_PROGRESS.md.
- Atualizar roadmap.md.
- Atualizar Project_rules.md (caso necessário).
- Atualizar CRM_V1_COMPLETION_MASTER_PLAN.md marcando a etapa como concluída.
- Gerar um relatório completo contendo:
  - Arquivos criados.
  - Arquivos modificados.
  - Migrações.
  - APIs.
  - Eventos.
  - Testes.
  - Builds.
  - Pendências.
  - Próxima etapa.

IMPORTANTE:

Pare imediatamente após concluir UMA única etapa.

Não avance automaticamente para a próxima.
