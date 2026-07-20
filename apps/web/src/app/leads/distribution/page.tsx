'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Save,
  Loader2,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface DistributionConfig {
  enabled: boolean;
  strategy: 'round_robin' | 'manual';
  eligibleUserIds: string[];
  fallbackBehavior: 'UNASSIGNED' | 'MANUAL_QUEUE';
  notifyOnAssignment: boolean;
}

interface EligibleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function LeadDistributionPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const configQuery = useQuery<DistributionConfig>({
    queryKey: ['lead-distribution-config'],
    queryFn: () => api.get('/leads/distribution/config').then((r) => r.data),
  });

  const eligibleUsersQuery = useQuery<{ users: EligibleUser[] }>({
    queryKey: ['lead-distribution-eligible-users'],
    queryFn: () => api.get('/leads/distribution/eligible-users').then((r) => r.data),
  });

  const [form, setForm] = useState<DistributionConfig>({
    enabled: false,
    strategy: 'round_robin',
    eligibleUserIds: [],
    fallbackBehavior: 'UNASSIGNED',
    notifyOnAssignment: true,
  });

  useEffect(() => {
    if (configQuery.data) {
      setForm(configQuery.data);
    }
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<DistributionConfig>) =>
      api.put('/leads/distribution/config', data),
    onSuccess: () => {
      toast.success('Configuração salva com sucesso');
      queryClient.invalidateQueries({ queryKey: ['lead-distribution-config'] });
      queryClient.invalidateQueries({ queryKey: ['lead-distribution-eligible-users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração');
    },
  });

  function handleSave() {
    saveMutation.mutate(form);
  }

  function toggleUser(userId: string) {
    setForm((prev) => {
      const current = prev.eligibleUserIds;
      const updated = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...prev, eligibleUserIds: updated };
    });
  }

  function selectAllUsers() {
    if (!eligibleUsersQuery.data?.users) return;
    setForm((prev) => ({
      ...prev,
      eligibleUserIds: eligibleUsersQuery.data!.users.map((u) => u.id),
    }));
  }

  function clearAllUsers() {
    setForm((prev) => ({ ...prev, eligibleUserIds: [] }));
  }

  if (!user) return null;

  const allUsers = eligibleUsersQuery.data?.users || [];
  const selectedCount = form.eligibleUserIds.length;
  const isLoading = configQuery.isLoading || eligibleUsersQuery.isLoading;
  const isError = configQuery.isError || eligibleUsersQuery.isError;

  return (
    <AdminLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      }}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6" />
              Distribuição de Leads
            </h1>
            <p className="text-muted-foreground">
              Configure como os leads são distribuídos automaticamente entre os vendedores
            </p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">
                Erro ao carregar configuração. Tente novamente.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuração Geral
                </CardTitle>
                <CardDescription>
                  Ative ou desative a distribuição automática e escolha a estratégia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Distribuição Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Quando ativada, novos leads serão distribuídos automaticamente
                    </p>
                  </div>
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estratégia de Distribuição</Label>
                  <Select
                    value={form.strategy}
                    onValueChange={(value: 'round_robin' | 'manual') =>
                      setForm({ ...form, strategy: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">
                        Round-Robin (alternado entre vendedores)
                      </SelectItem>
                      <SelectItem value="manual">
                        Manual (apenas atribuição manual)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Comportamento quando não há vendedores disponíveis</Label>
                  <Select
                    value={form.fallbackBehavior}
                    onValueChange={(value: 'UNASSIGNED' | 'MANUAL_QUEUE') =>
                      setForm({ ...form, fallbackBehavior: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNASSIGNED">
                        Permanecer sem vendedor (sem dono)
                      </SelectItem>
                      <SelectItem value="MANUAL_QUEUE">
                        Fila para atribuição manual
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Notificar ao Atribuir</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificação in-app quando um lead for atribuído
                    </p>
                  </div>
                  <Switch
                    checked={form.notifyOnAssignment}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, notifyOnAssignment: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Vendedores Elegíveis
                    </CardTitle>
                    <CardDescription>
                      Selecione quais vendedores receberão leads via distribuição automática
                      {selectedCount > 0 && (
                        <span className="ml-2">
                          <Badge variant="secondary">{selectedCount} selecionado(s)</Badge>
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllUsers}>
                      Todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllUsers}>
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {allUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum vendedor disponível para distribuição</p>
                    <p className="text-sm">
                      Cadastre usuários com perfil de vendedor para usar a distribuição automática
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allUsers.map((u) => {
                      const isSelected = form.eligibleUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/5 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleUser(u.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                              }`}
                            >
                              {isSelected && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div>
                              <p className="font-medium">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role === 'admin' ? 'Admin' : 'Vendedor'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {form.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  Resumo da Configuração
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={form.enabled ? 'success' : 'secondary'}>
                      {form.enabled ? 'Ativada' : 'Desativada'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estratégia</p>
                    <p className="font-medium">
                      {form.strategy === 'round_robin' ? 'Round-Robin' : 'Manual'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedores</p>
                    <p className="font-medium">{selectedCount} de {allUsers.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fallback</p>
                    <p className="font-medium">
                      {form.fallbackBehavior === 'UNASSIGNED' ? 'Sem dono' : 'Fila manual'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
