'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Mail } from 'lucide-react';

export default function Page() {
  return <ModulePage title="E-mail" icon={<Mail className="h-10 w-10" />} />;
}
