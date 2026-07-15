'use client';

import { ModulePage } from '@/components/layout/module-page';
import { User } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Perfil" icon={<User className="h-10 w-10" />} />;
}
