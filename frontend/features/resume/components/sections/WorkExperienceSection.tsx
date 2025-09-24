import React from 'react';
import { ILocale } from '@/backend/lib/localeService';
import CommentSystem from '../comments/CommentSystem';

/**
 * Props for WorkExperienceSection component
 */
interface WorkExperienceSectionProps {
  selectedLocaleData: ILocale;
  resume: any;
  handleWorkExperienceChange: (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  debouncedLint: (fieldId: string, content: string) => void;
  addWorkExperienceEntry: () => void;
  removeWorkExperienceEntry: (index: number) => void;
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
 * WorkExperienceSection component manages work experience entries with add/remove functionality
 */
const WorkExperienceSection: React.FC<WorkExperienceSectionProps> = ({
  selectedLocaleData,
  resume,
  handleWorkExperienceChange,
  debouncedLint,
  addWorkExperienceEntry,
  removeWorkExperienceEntry,
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
      <h3 className="text-xl font-semibold mb-3">Work Experience</h3>
      {resume.workExperience.map((exp: any, index: number) => (
        <div key={index} className="border p-4 rounded-lg mb-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {selectedLocaleData.sections.workExperience.order.map((fieldName: string) => {
              const field = selectedLocaleData.sections.workExperience.fields![fieldName];
              const inputId = `workExperience-${index}-${fieldName}`;
              return (
                <div key={fieldName} className="relative">
                  <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    id={inputId}
                    type="text"
                    name={fieldName}
                    placeholder={field.placeholder}
                    value={exp[fieldName as keyof typeof exp]}
                    onChange={(e) => { handleWorkExperienceChange(index, e); debouncedLint(`workExperience-description-${index}`, e.target.value); }}
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
          <div className="relative">
            <label htmlFor={`workExperience-description-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id={`workExperience-description-${index}`}
              name="description"
              placeholder={selectedLocaleData.sections.workExperience.fields!.description.placeholder}
              value={exp.description}
              onChange={(e) => { handleWorkExperienceChange(index, e); debouncedLint(`workExperience-description-${index}`, e.target.value); }}
              className={`p-2 border rounded w-full text-black focus:ring-2 ${validationErrors[`workExperience-description-${index}`] ? 'border-red-500' : 'focus:ring-blue-500'}`}
              rows={4}
            ></textarea>
            {validationErrors[`workExperience-description-${index}`] && <p className="text-red-500 text-xs mt-1">{validationErrors[`workExperience-description-${index}`]}</p>}
            <button onClick={() => toggleComments(`workExperience-description-${index}`)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-black" aria-label={`Comment on work experience description`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm0-4a1 1 0 112 0v1a1 1 0 11-2 0V7z" clipRule="evenodd" />
              </svg>
            </button>
            <CommentSystem
              fieldId={`workExperience-description-${index}`}
              showComments={showComments[`workExperience-description-${index}`]}
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              handleAddComment={handleAddComment}
              CommentComponent={CommentComponent}
            />
          </div>
          <button
            onClick={() => removeWorkExperienceEntry(index)}
            className="mt-2 p-2 bg-red-500 text-white rounded focus:ring-2 focus:ring-red-500"
            aria-label={`Remove ${exp.title} work experience`}
          >
            Remove Experience
          </button>
        </div>
      ))}
      <button
        onClick={addWorkExperienceEntry}
        className="p-2 bg-blue-500 text-white rounded focus:ring-2 focus:ring-blue-500"
      >
        Add Work Experience
      </button>
    </section>
  );
};

export default WorkExperienceSection;