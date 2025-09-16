/// <reference types="jest" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import Comment from './Comment';

describe('Comment', () => {
  it('should render the comment text and author', () => {
    const comment = {
      field: 'summary',
      text: 'This is a test comment',
      author: 'John Doe',
      createdAt: new Date().toISOString(),
    };

    render(<Comment comment={comment} />);

    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
