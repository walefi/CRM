'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Save, Lock, Shield } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from '../portal-layout';
import { useAuthStore } from '@/stores/auth.store';

export default function PortalProfilePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal', 'profile'],
    queryFn: () => api.get('/portal/profile').then((r) => r.data),
  });

  useEffect(() => {
    if (profile) {
      setFirstName(profile?.firstName || '');
      setLastName(profile?.lastName || '');
      setPhone(profile?.phone || '');
    }
  }, [profile]);

  const { data: sessions } = useQuery({
    queryKey: ['portal', 'sessions'],
    queryFn: () => api.get('/portal/sessions').then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.patch('/portal/profile', { firstName, lastName, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => api.post('/portal/password/change', { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
    },
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    {profile?.firstName} {profile?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Sobrenome</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Salvar
                </Button>
                {saved && <Badge variant="default">Salvo!</Badge>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4" />
              <p className="font-semibold">Alterar Senha</p>
            </div>
            <div>
              <label className="text-sm font-medium">Senha Atual</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nova Senha</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => passwordMutation.mutate()}
              disabled={!currentPassword || !newPassword || passwordMutation.isPending}
            >
              <Lock className="h-4 w-4 mr-1" /> Alterar Senha
            </Button>
          </CardContent>
        </Card>

        {sessions && sessions.length > 0 && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                <p className="font-semibold">Sessões Ativas</p>
              </div>
              {sessions.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {s.userAgent?.substring(0, 50) || 'Navegador desconhecido'}
                    </p>
                    <p className="text-xs text-muted-foreground">IP: {s.ip || 'N/A'}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
