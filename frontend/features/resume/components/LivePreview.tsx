import React, { useState } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import ClassicTemplate from '../templates/Classic';
import ModernTemplate from '../templates/Modern';
import TemplateSelector from './TemplateSelector';

const LivePreview: React.FC = () => {
  const { resume } = useResumeStore();
  const [selectedTemplate, setSelectedTemplate] = useState('Classic');

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
  };

  return (
    <div>
      <TemplateSelector onTemplateChange={handleTemplateChange} />
      <div className="border rounded-lg shadow-lg overflow-hidden">
        {selectedTemplate === 'Classic' && <ClassicTemplate resume={resume} />}
        {selectedTemplate === 'Modern' && <ModernTemplate resume={resume} />}
      </div>
    </div>
  );
};

export default LivePreview;
