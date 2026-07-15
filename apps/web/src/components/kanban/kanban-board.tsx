'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface KanbanDeal {
  id: string;
  title: string;
  value?: number;
  status: string;
  priority: string;
  owner?: { id: string; firstName: string; lastName: string; avatar?: string };
  company?: { id: string; name: string };
  contact?: { id: string; firstName: string; lastName: string };
}

interface KanbanStage {
  id: string;
  name: string;
  color?: string;
  deals: KanbanDeal[];
}

export function KanbanBoard({ pipelineId }: { pipelineId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['kanban', pipelineId],
    queryFn: () => api.get(`/pipelines/${pipelineId}/kanban`).then((r) => r.data),
    refetchInterval: 30000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      api.post('/pipelines/kanban/move', { dealId, stageId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban', pipelineId] }),
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !result.draggableId) return;
    const stageId = result.destination.droppableId;
    if (result.source.droppableId === stageId) return;
    moveMutation.mutate({ dealId: result.draggableId, stageId });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-lg" />
        ))}
      </div>
    );
  }

  const stages: KanbanStage[] = data?.stages || [];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4 min-h-[calc(100vh-16rem)]">
        {stages.map((stage) => (
          <KanbanColumn key={stage.id} stage={stage} />
        ))}
      </div>
    </DragDropContext>
  );
}

function KanbanColumn({ stage }: { stage: KanbanStage }) {
  const totalValue = stage.deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-lg bg-muted/50">
      <div className="p-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold">{stage.name}</span>
          <Badge variant="secondary" className="ml-2">
            {stage.deals.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <span className="text-xs text-muted-foreground">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              totalValue,
            )}
          </span>
        )}
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 p-2 space-y-2 min-h-[100px] transition-colors',
              snapshot.isDraggingOver && 'bg-primary/5',
            )}
          >
            {stage.deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                      'rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing',
                      snapshot.isDragging && 'shadow-lg rotate-2 opacity-90',
                    )}
                  >
                    <p className="text-sm font-medium mb-2">{deal.title}</p>
                    {deal.company && (
                      <p className="text-xs text-muted-foreground mb-1">{deal.company.name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {deal.value && (
                        <span className="text-xs font-semibold text-success">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(deal.value)}
                        </span>
                      )}
                      {deal.owner && (
                        <Avatar
                          fallback={`${deal.owner.firstName[0]}${deal.owner.lastName[0]}`}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
