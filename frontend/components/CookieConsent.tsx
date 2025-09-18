"use client";

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShow(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <p>This website uses cookies to enhance your experience. By continuing to use this site, you agree to our use of cookies.</p>
        <div>
          <button onClick={acceptCookies} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">Accept</button>
          <button onClick={declineCookies} className="bg-gray-500 text-white px-4 py-2 rounded">Decline</button>
        </div>
      </div>
    </div>
  );
}
