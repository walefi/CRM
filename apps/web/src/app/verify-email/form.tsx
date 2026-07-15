'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailForm() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    async function verify() {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
      } catch {
        setStatus('error');
      }
    }
    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <CardTitle>Verificando email</CardTitle>
              <CardDescription>Aguarde enquanto verificamos seu email...</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <CardTitle>Email verificado</CardTitle>
              <CardDescription>
                Seu email foi verificado com sucesso! Agora você pode acessar o sistema.
              </CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Falha na verificação</CardTitle>
              <CardDescription>O link de verificação é inválido ou expirou.</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          <a href="/" className="text-primary hover:underline text-sm">
            Ir para o login
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
