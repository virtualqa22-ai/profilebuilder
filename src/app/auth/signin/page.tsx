"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';

export default function SignInPage() {
  const [providers, setProviders] = useState<any>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  const handleInput = (e: any) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setMessage('Registration successful! You can now sign in.');
      setShowRegister(false);
    } else {
      setMessage(data.error || 'Registration failed.');
    }
  };

  const handleForgot = async (e: any) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail, newPassword: forgotPassword }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage('Password updated! You can now sign in.');
      setShowForgot(false);
    } else {
      setMessage(data.error || 'Password reset failed.');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign in to CareerVerve</h1>
        {message && <div className="mb-4 text-center text-brand-coral">{message}</div>}
        {showRegister ? (
          <form onSubmit={handleRegister} className="mb-4 space-y-4">
            <input name="name" type="text" placeholder="Name" className="w-full p-2 border rounded" value={form.name} onChange={handleInput} />
            <input name="email" type="email" placeholder="Email" className="w-full p-2 border rounded" value={form.email} onChange={handleInput} required />
            <input name="password" type="password" placeholder="Password" className="w-full p-2 border rounded" value={form.password} onChange={handleInput} required />
            <button type="submit" className="w-full py-2 px-4 rounded bg-brand-blue text-white font-semibold hover:bg-brand-teal transition">Register</button>
            <button type="button" className="w-full py-2 px-4 rounded bg-brand-light text-brand-charcoal mt-2" onClick={() => setShowRegister(false)}>Back to Sign In</button>
          </form>
        ) : showForgot ? (
          <form onSubmit={handleForgot} className="mb-4 space-y-4">
            <input name="email" type="email" placeholder="Email" className="w-full p-2 border rounded" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
            <input name="newPassword" type="password" placeholder="New Password" className="w-full p-2 border rounded" value={forgotPassword} onChange={e => setForgotPassword(e.target.value)} required />
            <button type="submit" className="w-full py-2 px-4 rounded bg-brand-blue text-white font-semibold hover:bg-brand-teal transition">Reset Password</button>
            <button type="button" className="w-full py-2 px-4 rounded bg-brand-light text-brand-charcoal mt-2" onClick={() => setShowForgot(false)}>Back to Sign In</button>
          </form>
        ) : (
          <>
            <form onSubmit={e => { e.preventDefault(); signIn('credentials', { email: form.email, password: form.password }); }} className="mb-4 space-y-4">
              <input name="email" type="email" placeholder="Email" className="w-full p-2 border rounded" value={form.email} onChange={handleInput} required />
              <input name="password" type="password" placeholder="Password" className="w-full p-2 border rounded" value={form.password} onChange={handleInput} required />
              <button type="submit" className="w-full py-2 px-4 rounded bg-brand-blue text-white font-semibold hover:bg-brand-teal transition">Sign In</button>
            </form>
            <div className="flex flex-col gap-2 mb-4">
              <button className="w-full py-2 px-4 rounded bg-brand-light text-brand-charcoal" onClick={() => setShowRegister(true)}>Create an account</button>
              <button className="w-full py-2 px-4 rounded bg-brand-light text-brand-charcoal" onClick={() => setShowForgot(true)}>Forgot password?</button>
            </div>
            <div className="mb-4 text-center text-gray-400">or</div>
            {providers && Object.values(providers).filter((p: any) => p.id !== 'credentials').map((provider: any) => (
              <div key={provider.name} className="mb-4">
                <button
                  className="w-full py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                  onClick={() => signIn(provider.id)}
                >
                  Sign in with {provider.name}
                </button>
              </div>
            ))}
            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-gray-600 hover:underline">Back to home</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
