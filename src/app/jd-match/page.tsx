'use client';

import React, { useState } from 'react';
import { useResumeStore } from '@/store/resumeStore';

const JdMatchPage = () => {
  const [jdText, setJdText] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);

  const { resume } = useResumeStore();

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/jd-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: jdText }),
      });
      const data = await response.json();
      const extractedKeywords = data.keywords || [];
      setKeywords(extractedKeywords);

      const resumeContent = JSON.stringify(resume).toLowerCase();
      const foundKeywords = extractedKeywords.filter((keyword: string) => resumeContent.includes(keyword.toLowerCase()));
      const missing = extractedKeywords.filter((keyword: string) => !resumeContent.includes(keyword.toLowerCase()));

      setCoverage(extractedKeywords.length > 0 ? (foundKeywords.length / extractedKeywords.length) * 100 : 0);
      setMissingKeywords(missing);

    } catch (error) {
      console.error('Error analyzing JD:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Job Description Match</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Paste Job Description</h2>
          <textarea
            className="w-full h-64 p-2 border rounded"
            placeholder="Paste the job description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          ></textarea>
          <button
            className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleAnalyze}
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Analysis Results</h2>
          <div className="p-4 border rounded bg-gray-100">
            <h3 className="text-lg font-semibold">Keyword Coverage</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${coverage}%` }}></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{coverage.toFixed(2)}% Match</p>

            <h3 className="text-lg font-semibold mt-4">Missing Keywords</h3>
            {missingKeywords.length > 0 ? (
              <ul data-testid="missing-keywords">
                {missingKeywords.map((keyword, index) => (
                  <li key={index} className="inline-block bg-red-200 rounded-full px-3 py-1 text-sm font-semibold text-red-700 mr-2 mb-2">
                    {keyword}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No missing keywords found.</p>
            )}

            <h3 className="text-lg font-semibold mt-4">Extracted Keywords</h3>
            {keywords.length > 0 ? (
              <ul>
                {keywords.map((keyword, index) => (
                  <li key={index} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                    {keyword}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Keywords will be displayed here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JdMatchPage;
