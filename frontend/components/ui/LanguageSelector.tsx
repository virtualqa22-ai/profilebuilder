"use client";

import { useLanguage } from '@/lib/language';

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();

  return (
    <select
      aria-label="Site language"
      value={lang}
      onChange={(e) => setLang(e.target.value as any)}
      className="rounded-md px-2 py-1 text-sm bg-white text-[#3267E3]"
    >
      <option value="en">English</option>
      <option value="de">Deutsch</option>
      <option value="hi">हिन्दी</option>
      <option value="ja">日本語</option>
      <option value="ru">Русский</option>
    </select>
  );
}
