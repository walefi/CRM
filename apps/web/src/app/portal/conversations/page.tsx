'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from '../portal-layout';
import { useAuthStore } from '@/stores/auth.store';

const channelLabels: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  webchat: 'Web Chat',
  phone: 'Telefone',
  other: 'Outro',
};

export default function PortalConversationsPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'conversations'],
    queryFn: () => api.get('/portal/conversations').then((r) => r.data),
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Minhas Conversas</h1>
          <p className="text-muted-foreground">Acompanhe suas conversas</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : data?.data?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">Nenhuma conversa</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data?.data?.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{c.subject || 'Sem assunto'}</p>
                      {c.lastMessagePreview && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {c.lastMessagePreview}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.lastMessageAt ? formatDate(c.lastMessageAt) : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {channelLabels[c.channel] || c.channel}
                      </Badge>
                      <Badge
                        variant={c.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
