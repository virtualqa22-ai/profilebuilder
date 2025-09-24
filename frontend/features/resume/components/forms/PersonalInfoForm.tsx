import React from 'react';
import { ILocale } from '@/backend/lib/localeService';
import CommentSystem from '../comments/CommentSystem';

/**
 * Props for PersonalInfoForm component
 */
interface PersonalInfoFormProps {
  selectedLocaleData: ILocale;
  resume: any;
  handleFieldChange: (sectionKey: string, fieldName: string, value: string) => void;
  showOptionalFields: Record<string, boolean>;
  setShowOptionalFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  validationErrors: Record<string, string>;
  toggleComments: (field: string) => void;
  showComments: Record<string, boolean>;
  comments: any[];
  commentText: string;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  handleAddComment: (field: string, text: string) => void;
  CommentComponent: React.ComponentType<{ comment: any }>;
}

/**
 * PersonalInfoForm component handles personal information input fields
 */
const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  selectedLocaleData,
  resume,
  handleFieldChange,
  showOptionalFields,
  setShowOptionalFields,
  validationErrors,
  toggleComments,
  showComments,
  comments,
  commentText,
  setCommentText,
  handleAddComment,
  CommentComponent,
}) => {
  const section = selectedLocaleData.sections.personalInfo;

  return (
    <section className="mb-6">
      <h3 className="text-xl font-semibold mb-3">{section.label}</h3>
      {section.fields && section.order && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.order.map((fieldName: string) => {
            const field = section.fields![fieldName];
            const inputId = `personalInfo-${fieldName}`;
            return (
              <div key={fieldName} className="relative">
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.optional && (
                    <input
                      type="checkbox"
                      className="ml-2"
                      checked={showOptionalFields[fieldName] || false}
                      onChange={() => setShowOptionalFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] }))}
                    />
                  )}
                </label>
                {(field.optional === undefined || !field.optional || showOptionalFields[fieldName]) && (
                  <input
                    id={inputId}
                    type="text"
                    name={fieldName}
                    placeholder={field.placeholder}
                    value={(resume.personalInfo as any)?.[fieldName] || ''}
                    onChange={(e) => handleFieldChange('personalInfo', fieldName, e.target.value)}
                    className={`p-2 border rounded text-black w-full focus:ring-2 ${validationErrors[inputId] ? 'border-red-500' : 'focus:ring-blue-500'}`}
                  />
                )}
                {validationErrors[inputId] && <p className="text-red-500 text-xs mt-1">{validationErrors[inputId]}</p>}
                <button onClick={() => toggleComments(inputId)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on ${field.label}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
                  </svg>
                </button>
                <CommentSystem
                  fieldId={inputId}
                  showComments={showComments[inputId]}
                  comments={comments}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  handleAddComment={handleAddComment}
                  CommentComponent={CommentComponent}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PersonalInfoForm;