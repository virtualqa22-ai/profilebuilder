
"use client";

import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      {session ? (
        <div>
          <p>Here you can change your settings.</p>
        </div>
      ) : (
        <p>You are not signed in.</p>
      )}
    </div>
  );
}
