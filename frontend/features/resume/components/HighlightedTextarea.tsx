import React, { useRef, useEffect } from 'react';

/**
 * Props for HighlightedTextarea component
 */
interface HighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  lintResults: any[];
  placeholder?: string;
  className?: string;
  rows?: number;
}

/**
 * HighlightedTextarea component provides a contentEditable div that displays text with highlights based on lint results
 * Uses safe HTML generation to prevent XSS attacks
 */
const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({
  value,
  onChange,
  lintResults,
  placeholder,
  className,
  rows = 4,
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      // Generate safe highlighted HTML
      const html = createSafeHighlightedHTML(value, lintResults);
      divRef.current.innerHTML = html;
    }
  }, [value, lintResults]);

  const handleInput = () => {
    if (divRef.current) {
      const text = divRef.current.textContent || '';
      onChange(text);
    }
  };

  return (
    <div
      ref={divRef}
      contentEditable
      onInput={handleInput}
      className={className}
      data-placeholder={placeholder}
      style={{
        whiteSpace: 'pre-wrap',
        minHeight: `${rows * 1.5}em`,
        border: '1px solid #ccc',
        padding: '8px',
        borderRadius: '4px',
        outline: 'none',
      }}
      suppressContentEditableWarning={true}
    />
  );
};

/**
 * Creates safe HTML with highlights by escaping all user input and only adding safe span tags
 * Prevents XSS by ensuring no executable code can be injected
 */
function createSafeHighlightedHTML(text: string, issues: any[]): string {
  // Escape all HTML characters to prevent XSS
  const escaped = text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  if (!issues || issues.length === 0) {
    // No issues, return escaped text with line breaks
    return escaped.replace(/\n/g, '<br>');
  }

  // Split into lines and process each line
  const lines = escaped.split('\n');
  const processedLines = lines.map((line, index) => {
    const lineNumber = index + 1; // 1-based line numbering
    const hasIssue = issues.some((issue) => issue.line === lineNumber);

    if (hasIssue) {
      // Highlight the entire line with yellow background
      return `<span class="bg-yellow-200">${line}</span>`;
    } else {
      return line;
    }
  });

  // Join lines with <br> tags
  return processedLines.join('<br>');
}

export default HighlightedTextarea;