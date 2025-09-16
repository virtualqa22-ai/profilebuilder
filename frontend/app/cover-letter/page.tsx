
"use client";

import React, { useState } from 'react';
import Classic from '../../features/cover-letter/templates/Classic';

const CoverLetterBuilderPage = () => {
  const [name, setName] = useState('John Doe');
  const [address, setAddress] = useState('123 Main St, Anytown, USA');
  const [phone, setPhone] = useState('555-123-4567');
  const [email, setEmail] = useState('john.doe@example.com');
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [recipientName, setRecipientName] = useState('Hiring Manager');
  const [recipientTitle, setRecipientTitle] = useState('Hiring Manager');
  const [companyName, setCompanyName] = useState('ABC Company');
  const [companyAddress, setCompanyAddress] = useState('456 Oak Ave, Anytown, USA');
  const [salutation, setSalutation] = useState('Dear Hiring Manager,');
  const [body, setBody] = useState(
    `I am writing to express my keen interest in the [Job Title] position at [Company Name], as advertised on [Platform]. With a proven track record in [relevant skill 1] and [relevant skill 2], I am confident in my ability to contribute significantly to your team.\n\nIn my previous role at [Previous Company], I was responsible for [achievment 1] and [achievement 2]. I am particularly drawn to [Company Name] because of [specific reason about company].\n\nThank you for your time and consideration. I look forward to hearing from you soon.`
  );
  const [closing, setClosing] = useState('Sincerely,');
  const [signature, setSignature] = useState('John Doe');
  const [jobDescription, setJobDescription] = useState('');
  const [jdSuggestions, setJdSuggestions] = useState<string[]>([]);

  const handleJdParse = async () => {
    if (!jobDescription) return;
    try {
      const response = await fetch('/api/jd-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: jobDescription }),
      });
      const data = await response.json();
      if (response.ok) {
        setJdSuggestions(data.keywords);
      } else {
        console.error('Error parsing JD:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch JD parse API:', error);
    }
  };

  const handleExportPdf = async () => {
    const coverLetterContent = {
      name, address, phone, email, date, recipientName, recipientTitle,
      companyName, companyAddress, salutation, body, closing, signature
    };
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverLetterContent }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to export PDF.');
      console.error('Failed to export PDF:', error);
    }
  };

  const handleExportDocx = async () => {
    const coverLetterContent = {
      name, address, phone, email, date, recipientName, recipientTitle,
      companyName, companyAddress, salutation, body, closing, signature
    };
    try {
      const response = await fetch('/api/generate-cover-letter-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverLetterContent }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to export DOCX.');
      console.error('Failed to export DOCX:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Cover Letter Builder</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Information</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Your Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Your Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Recipient Name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Recipient Title" value={recipientTitle} onChange={(e) => setRecipientTitle(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Company Address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Salutation" value={salutation} onChange={(e) => setSalutation(e.target.value)} className="w-full p-2 border rounded" />
            <textarea
              placeholder="Cover Letter Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-2 border rounded h-48"
            ></textarea>
            <input type="text" placeholder="Closing" value={closing} onChange={(e) => setClosing(e.target.value)} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Signature" value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full p-2 border rounded" />

            <h3 className="text-xl font-semibold mt-6 mb-2">Job Description for Suggestions</h3>
            <textarea
              placeholder="Paste Job Description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-2 border rounded h-32"
            ></textarea>
            <button onClick={handleJdParse} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Get JD Suggestions
            </button>

            {jdSuggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-lg font-semibold">Suggestions:</h4>
                <ul className="list-disc list-inside">
                  {jdSuggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Cover Letter Preview</h2>
          <div className="border p-6 rounded-lg shadow-md bg-white">
            <Classic
              name={name}
              address={address}
              phone={phone}
              email={email}
              date={date}
              recipientName={recipientName}
              recipientTitle={recipientTitle}
              companyName={companyName}
              companyAddress={companyAddress}
              salutation={salutation}
              body={body}
              closing={closing}
              signature={signature}
            />
          </div>
          <div className="mt-4 flex space-x-2">
            <button onClick={handleExportPdf} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Export as PDF
            </button>
            <button onClick={handleExportDocx} className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
              Export as DOCX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterBuilderPage;
