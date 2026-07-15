'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Sparkles } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Inteligência Artificial" icon={<Sparkles className="h-10 w-10" />} />;
}
