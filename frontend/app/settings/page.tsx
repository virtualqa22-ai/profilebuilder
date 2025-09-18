
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [privacyMode, setPrivacyMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetch('/api/user/settings')
        .then(res => res.json())
        .then(data => {
          setPrivacyMode(data.privacyMode || false);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  const handlePrivacyToggle = async () => {
    const newMode = !privacyMode;
    const res = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privacyMode: newMode }),
    });
    if (res.ok) {
      setPrivacyMode(newMode);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <p>You are not signed in.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={privacyMode}
              onChange={handlePrivacyToggle}
              className="mr-2"
            />
            Enable Local Privacy Mode (Disables cloud storage)
          </label>
        </div>
      )}
    </div>
  );
}
