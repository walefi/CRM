'use client';

import { ServerCrash } from 'lucide-react';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <ServerCrash className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-6xl font-bold mb-2">500</h1>
        <p className="text-xl font-semibold mb-2">Erro do Servidor</p>
        <p className="text-muted-foreground mb-6">Ocorreu um erro inesperado.</p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
