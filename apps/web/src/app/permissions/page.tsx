'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Shield } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Permissões" icon={<Shield className="h-10 w-10" />} />;
}
