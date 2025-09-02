import React from 'react';

interface CommentProps {
  comment: {
    field: string;
    text: string;
    author: string;
    createdAt: string;
  };
}

const Comment: React.FC<CommentProps> = ({ comment }) => {
  return (
    <div className="p-2 border-b">
      <p className="text-sm font-semibold">{comment.author}</p>
      <p className="text-sm">{comment.text}</p>
      <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
    </div>
  );
};

export default Comment;
