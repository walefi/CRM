'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
});

type LoginData = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
  firstName: z.string().min(2, 'Nome muito curto'),
  lastName: z.string().min(2, 'Sobrenome muito curto'),
  tenantName: z.string().optional(),
});

type RegisterData = z.infer<typeof registerSchema>;

export function LoginForm() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', tenantName: '' },
  });

  async function onLogin(data: LoginData) {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao fazer login';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(data: RegisterData) {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', data);
      setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
      toast.success('Conta criada com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao criar conta';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isRegistering) {
    return (
      <Card className="w-full animate-fade-in">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Preencha os dados para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input id="firstName" placeholder="John" {...registerForm.register('firstName')} />
                {registerForm.formState.errors.firstName && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input id="lastName" placeholder="Doe" {...registerForm.register('lastName')} />
                {registerForm.formState.errors.lastName && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  {...registerForm.register('email')}
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-10 pr-10"
                  {...registerForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.password && (
                <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nome da empresa</Label>
              <Input
                id="tenantName"
                placeholder="Sua Empresa (opcional)"
                {...registerForm.register('tenantName')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar conta
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-primary hover:underline font-medium"
              >
                Fazer login
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Faça login para acessar o sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="pl-10"
                {...loginForm.register('email')}
              />
            </div>
            {loginForm.formState.errors.email && (
              <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                className="pl-10 pr-10"
                {...loginForm.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
            )}
          </div>
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
              Esqueci minha senha
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className="text-primary hover:underline font-medium"
            >
              Criar conta
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
