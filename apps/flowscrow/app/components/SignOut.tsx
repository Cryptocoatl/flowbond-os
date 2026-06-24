'use client';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/fbid';

export function SignOut() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost"
      onClick={async () => {
        await signOut();
        router.replace('/login');
      }}
    >
      Sign out
    </button>
  );
}
