import React from 'react';

/**
 * Props for ExportControls component
 */
interface ExportControlsProps {
  handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateVersion: () => void;
  resume: any;
  handleExportPdf: () => void;
}

/**
 * ExportControls component handles PDF export and import functionality
 */
const ExportControls: React.FC<ExportControlsProps> = ({
  handlePdfUpload,
  updateVersion,
  resume,
  handleExportPdf,
}) => {
  return (
    <div className="mt-6 text-center">
      <input type="file" id="pdf-upload" className="hidden" onChange={handlePdfUpload} aria-hidden="true" />
      <button
        onClick={() => document.getElementById('pdf-upload')!.click()}
        className="p-3 bg-blue-600 text-white rounded-lg text-lg font-semibold mr-4 focus:ring-2 focus:ring-blue-600"
      >
        Import from PDF
      </button>
      <button
        onClick={updateVersion}
        className="p-3 bg-yellow-500 text-white rounded-lg text-lg font-semibold mr-4 focus:ring-2 focus:ring-yellow-500"
      >
        New Version ({resume.version})
      </button>
      <button
        onClick={handleExportPdf}
        className="p-3 bg-green-600 text-white rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-600"
      >
        Export to PDF
      </button>
    </div>
  );
};

export default ExportControls;