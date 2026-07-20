'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    title: '',
    phone: '',
    avatar: '',
    timezone: '',
    language: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        title: profile.title || '',
        phone: profile.phone || '',
        avatar: profile.avatar || '',
        timezone: profile.timezone || '',
        language: profile.language || '',
      });
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.patch('/users/me', form);
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil atualizado com sucesso');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const initials = `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase();

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
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar src={form.avatar || user.avatar} fallback={initials} size="lg" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {form.firstName} {form.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sobrenome *</Label>
                      <Input
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={user.email} disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cargo</Label>
                      <Input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fuso Horário</Label>
                      <Input
                        value={form.timezone}
                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                        placeholder="America/Sao_Paulo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Idioma</Label>
                      <Input
                        value={form.language}
                        onChange={(e) => setForm({ ...form, language: e.target.value })}
                        placeholder="pt-BR"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Alterações
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
