import React from 'react';
import { ILocale } from '@/backend/lib/localeService';
import CommentSystem from '../comments/CommentSystem';

/**
 * Props for EducationSection component
 */
interface EducationSectionProps {
  selectedLocaleData: ILocale;
  resume: any;
  handleEducationChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  addEducationEntry: () => void;
  removeEducationEntry: (index: number) => void;
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
 * EducationSection component manages education entries with add/remove functionality
 */
const EducationSection: React.FC<EducationSectionProps> = ({
  selectedLocaleData,
  resume,
  handleEducationChange,
  addEducationEntry,
  removeEducationEntry,
  validationErrors,
  toggleComments,
  showComments,
  comments,
  commentText,
  setCommentText,
  handleAddComment,
  CommentComponent,
}) => {
  return (
    <section className="mb-6">
      <h3 className="text-xl font-semibold mb-3">Education</h3>
      {resume.education.map((edu: any, index: number) => (
        <div key={index} className="border p-4 rounded-lg mb-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {selectedLocaleData.sections.education.order.map((fieldName: string) => {
              const field = selectedLocaleData.sections.education.fields![fieldName];
              const inputId = `education-${index}-${fieldName}`;
              return (
                <div key={fieldName} className="relative">
                  <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    id={inputId}
                    type="text"
                    name={fieldName}
                    placeholder={field.placeholder}
                    value={edu[fieldName as keyof typeof edu]}
                    onChange={(e) => handleEducationChange(index, e)}
                    className={`p-2 border rounded text-black w-full focus:ring-2 ${validationErrors[inputId] ? 'border-red-500' : 'focus:ring-blue-500'}`}
                  />
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
          <button
            onClick={() => removeEducationEntry(index)}
            className="mt-2 p-2 bg-red-500 text-white rounded focus:ring-2 focus:ring-red-500"
            aria-label={`Remove ${edu.degree} education entry`}
          >
            Remove Education
          </button>
        </div>
      ))}
      <button
        onClick={addEducationEntry}
        className="p-2 bg-blue-500 text-white rounded focus:ring-2 focus:ring-blue-500"
      >
        Add Education
      </button>
    </section>
  );
};

export default EducationSection;