
"use client";

import { useSession, signOut } from "next-auth/react";

import Link from "next/link";

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      {session ? (
        <div>
          <p>Name: {session.user?.name}</p>
          <p>Email: {session.user?.email}</p>
          <Link href="/settings" className="text-brand-blue hover:underline mt-4 inline-block">Settings</Link>
          <br />
          <button
            className="mt-4 bg-brand-blue hover:bg-brand-teal text-white font-bold py-2 px-4 rounded"
            onClick={() => signOut()}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <p>You are not signed in.</p>
      )}
    </div>
  );
}
