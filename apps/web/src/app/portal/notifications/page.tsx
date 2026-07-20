'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from '../portal-layout';
import { useAuthStore } from '@/stores/auth.store';

export default function PortalNotificationsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => api.get('/portal/notifications').then((r) => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/portal/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/portal/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] }),
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notificações</h1>
            <p className="text-muted-foreground">Acompanhe suas notificações</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" /> Marcar todas como lidas
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : data?.data?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data?.data?.map((n: any) => (
              <Card key={n.id} className={n.isRead ? 'opacity-60' : 'border-primary/30'}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${n.isRead ? 'bg-muted' : 'bg-primary/10'}`}>
                      <Bell
                        className={`h-4 w-4 ${n.isRead ? 'text-muted-foreground' : 'text-primary'}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                  </div>
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(n.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
