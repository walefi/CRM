'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModulePageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function ModulePage({ title, description, icon }: ModulePageProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-6"
        >
          {icon || <Construction className="h-10 w-10" />}
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6">
          {description || 'Este módulo está em desenvolvimento e estará disponível em breve.'}
        </p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
