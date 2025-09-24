import React from 'react';

/**
 * Props for CommentSystem component
 */
interface CommentSystemProps {
  fieldId: string;
  showComments: boolean;
  comments: any[];
  commentText: string;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  handleAddComment: (field: string, text: string) => void;
  CommentComponent: React.ComponentType<{ comment: any }>;
}

/**
 * CommentSystem component manages inline comments for form fields
 */
const CommentSystem: React.FC<CommentSystemProps> = ({
  fieldId,
  showComments,
  comments,
  commentText,
  setCommentText,
  handleAddComment,
  CommentComponent,
}) => {
  if (!showComments) return null;

  return (
    <div className="absolute top-full right-0 w-64 bg-white border rounded-lg shadow-lg z-10" data-testid={`comment-thread-${fieldId}`}>
      <div className="p-2">
        <h4 className="font-semibold">Comments</h4>
        {comments.filter(c => c.field === fieldId).map((comment, index) => (
          <CommentComponent key={index} comment={comment} />
        ))}
        <textarea className="w-full p-1 border rounded mt-2" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}></textarea>
        <button onClick={() => handleAddComment(fieldId, commentText)} className="mt-1 p-1 bg-blue-500 text-white rounded">Add</button>
      </div>
    </div>
  );
};

export default CommentSystem;