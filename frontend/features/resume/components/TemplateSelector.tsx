import React from 'react';

interface TemplateSelectorProps {
  onTemplateChange: (template: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onTemplateChange }) => {
  return (
    <div className="my-4">
      <h2 className="text-xl font-semibold mb-2">Select Template</h2>
      <div className="flex gap-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => onTemplateChange('Classic')}
        >
          Classic
        </button>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => onTemplateChange('Modern')}
        >
          Modern
        </button>
      </div>
    </div>
  );
};

export default TemplateSelector;
