import React from 'react';
import { ILocale } from '@/backend/lib/localeService';

/**
 * Props for OptionalFieldsManager component
 */
interface OptionalFieldsManagerProps {
  selectedLocaleData: ILocale;
  resume: any;
  photoPrivacy: boolean;
  setPhotoPrivacy: React.Dispatch<React.SetStateAction<boolean>>;
  handleOptionalFileUpload: (field: string, file: File) => void;
  handleOptionalFieldChange: (field: string, value: string) => void;
}

/**
 * OptionalFieldsManager component handles optional fields like photos, certifications, hobbies, references
 */
const OptionalFieldsManager: React.FC<OptionalFieldsManagerProps> = ({
  selectedLocaleData,
  resume,
  photoPrivacy,
  setPhotoPrivacy,
  handleOptionalFileUpload,
  handleOptionalFieldChange,
}) => {
  if (!selectedLocaleData?.optionalFields) return null;

  const fields = [
    { key: 'photos', label: 'Photos', type: 'file' },
    { key: 'certifications', label: 'Certifications', type: 'file' },
    { key: 'hobbies', label: 'Hobbies', type: 'text' },
    { key: 'references', label: 'References', type: 'text' },
  ];

  return (
    <section className="mb-6">
      <h3 className="text-xl font-semibold mb-3">Optional Fields</h3>
      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={photoPrivacy}
            onChange={() => setPhotoPrivacy(!photoPrivacy)}
            className="mr-2"
          />
          Show photo in resume (privacy toggle)
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, type }) => {
          const config = selectedLocaleData.optionalFields?.[key];
          if (!config?.enabled) return null;
          if (key === 'photos' && !photoPrivacy) return null;
          return (
            <div key={key}>
              <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {config.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {type === 'file' ? (
                <>
                  <input
                    id={key}
                    type="file"
                    name={key}
                    accept={key === 'photos' ? 'image/*' : '*'}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleOptionalFileUpload(key, file);
                    }}
                    className="p-2 border rounded text-black w-full focus:ring-2"
                    required={!!config.required && !(resume as any)[key]}
                  />
                  {(resume as any)[key] && (
                    <div className="mt-2">
                      {key === 'photos' ? (
                        <img src={(resume as any)[key]} alt="Uploaded" className="max-h-32" />
                      ) : (
                        <a href={(resume as any)[key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Uploaded</a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <input
                  id={key}
                  type={type}
                  name={key}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  value={(resume as any)[key] || ''}
                  onChange={e => handleOptionalFieldChange(key, e.target.value)}
                  className={`p-2 border rounded text-black w-full focus:ring-2`}
                  required={!!config.required}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default OptionalFieldsManager;