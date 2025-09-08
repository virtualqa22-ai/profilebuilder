
import { render, screen } from '@testing-library/react';
import CoverLetterBuilderPage from '../cover-letter/page';

describe('CoverLetterBuilderPage', () => {
  it('renders the main heading', () => {
    render(<CoverLetterBuilderPage />);
    expect(screen.getByRole('heading', { name: /Cover Letter Builder/i })).toBeInTheDocument();
  });

  // Add more tests here for input fields, JD suggestions, and export buttons
});
