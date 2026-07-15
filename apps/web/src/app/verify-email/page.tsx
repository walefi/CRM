import { Suspense } from 'react';
import VerifyEmailForm from './form';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
