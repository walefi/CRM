import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-6xl font-bold mb-2">404</h1>
        <p className="text-xl font-semibold mb-2">Página não encontrada</p>
        <p className="text-muted-foreground mb-6">A página que você procura não existe ou foi movida.</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
