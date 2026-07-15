'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Users } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Usuários" icon={<Users className="h-10 w-10" />} />;
}
