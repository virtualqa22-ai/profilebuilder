import React from 'react';

interface ClassicCoverLetterTemplateProps {
  name: string;
  address: string;
  phone: string;
  email: string;
  date: string;
  recipientName: string;
  recipientTitle: string;
  companyName: string;
  companyAddress: string;
  salutation: string;
  body: string;
  closing: string;
  signature: string;
}

const Classic: React.FC<ClassicCoverLetterTemplateProps> = ({
  name,
  address,
  phone,
  email,
  date,
  recipientName,
  recipientTitle,
  companyName,
  companyAddress,
  salutation,
  body,
  closing,
  signature,
}) => {
  return (
    <div className="font-serif text-base leading-relaxed p-8">
      <p>{name}</p>
      <p>{address}</p>
      <p>{phone}</p>
      <p>{email}</p>
      <br />
      <p>{date}</p>
      <br />
      <p>{recipientName}</p>
      <p>{recipientTitle}</p>
      <p>{companyName}</p>
      <p>{companyAddress}</p>
      <br />
      <p>{salutation}</p>
      <br />
      {body.split('\n').map((paragraph, index) => (
        <p key={index} className="mb-4">{paragraph}</p>
      ))}
      <br />
      <p>{closing}</p>
      <p>{signature}</p>
    </div>
  );
};

export default Classic;
