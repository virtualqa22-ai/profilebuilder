# DOCX Processing Libraries

## Overview

The CareerVerve backend includes specialized libraries for processing Microsoft Word documents (DOCX) in the resume management workflow. These libraries enable importing existing DOCX resumes and generating new DOCX documents with ATS-safe formatting.

## Libraries

### DOCX Parser (`docxParser.ts`)

**Purpose**: Parses DOCX files to extract structured resume data including text, tables, and bullet points.

**Key Functions**:

- `parseDocxContent(fileBuffer: Buffer): Promise<ParsedDocxData>`
  - Converts DOCX to HTML using the mammoth library
  - Sanitizes extracted content for security
  - Returns HTML representation and conversion messages

- `extractTables(docxContent: ParsedDocxData): TableData[]`
  - Extracts tabular data from the parsed HTML
  - Returns array of table structures with rows and cells

- `extractBullets(docxContent: ParsedDocxData): string[]`
  - Extracts bullet points from unordered and ordered lists
  - Returns array of sanitized bullet text

- `mapToResumeSchema(parsedData, tables, bullets): ResumeData`
  - Maps extracted content to structured resume format
  - Performs basic entity recognition (emails, skills, etc.)
  - Assumes table structure for work experience and education

**Usage Example**:
```typescript
import { parseDocxContent, extractTables, extractBullets, mapToResumeSchema } from './docxParser';

const fileBuffer = fs.readFileSync('resume.docx');
const parsed = await parseDocxContent(fileBuffer);
const tables = extractTables(parsed);
const bullets = extractBullets(parsed);
const resumeData = mapToResumeSchema(parsed, tables, bullets);
```

### DOCX Generator (`docxGenerator.ts`)

**Purpose**: Generates DOCX documents from resume data with ATS-safe formatting.

**Key Functions**:

- `generateDocx(resumeData: ResumeData, template?: string): Promise<Buffer>`
  - Creates a new DOCX document from resume data
  - Applies ATS-safe formatting (Arial font, clean layout)
  - Returns DOCX file buffer

- `applyAtsSafeFormatting(document: Document): void`
  - Configures document with ATS-compatible settings
  - Ensures no graphics or complex formatting

- `addTables(document: Document, tables: TableData[]): void`
  - Adds tables to the document with proper formatting

- `addBullets(document: Document, bullets: string[]): void`
  - Adds bullet point lists to the document

- `addResumeSections(document: Document, resumeData: ResumeData): void`
  - Structures resume content into sections (summary, personal info, experience, education, skills)

**Usage Example**:
```typescript
import { generateDocx } from './docxGenerator';

const resumeData = {
  personalInfo: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  summary: 'Experienced developer...',
  workExperience: [{ title: 'Developer', company: 'Tech Corp', description: '...' }],
  skills: ['JavaScript', 'React']
};

const docxBuffer = await generateDocx(resumeData);
fs.writeFileSync('generated-resume.docx', docxBuffer);
```

## Dependencies

- **mammoth**: ^1.4.0 - DOCX to HTML conversion library
- **docx**: ^7.0.0 - DOCX document generation library
- Internal dependencies: `validations.ts`, `logger.ts`

## Limitations

### Parser Limitations
- **Table Structure Assumptions**: Assumes first table is work experience, second is education
- **Regex-based Extraction**: Uses regex for HTML parsing, may miss complex formatting
- **Basic Entity Recognition**: Simple pattern matching for emails and personal info
- **No Image Support**: Ignores images and graphics in source documents
- **Formatting Loss**: Complex DOCX formatting may not be preserved in extraction

### Generator Limitations
- **Template Support**: Currently supports only basic ATS-safe template
- **No Advanced Formatting**: Limited to text, tables, and bullets
- **Font Restrictions**: Fixed to Arial for ATS compatibility
- **No Graphics**: Intentionally excludes images to maintain ATS compatibility

## Security Considerations

- **Input Sanitization**: All extracted text is sanitized using `sanitizeString()`
- **Validation**: Resume data is validated before processing
- **File Type Verification**: Only .docx files accepted
- **Temporary File Handling**: Files are processed in memory and cleaned up
- **Rate Limiting**: API endpoints limit processing frequency

## Performance Notes

- **Memory Usage**: Large DOCX files may consume significant memory during processing
- **Processing Time**: Complex documents with many tables may take longer to parse
- **Buffer Size**: Generated DOCX buffers should be streamed for large documents

## Testing

- **Unit Tests**: `tests/unit/lib/docxParser.test.ts`, `tests/unit/lib/docxGenerator.test.ts`
- **Integration Tests**: `tests/integration/docx-roundtrip.test.ts`
- **Mock Libraries**: `tests/__mocks__/mammoth.js`, `tests/__mocks__/docx.js`

## Ethical Considerations

### Data Privacy
- **Sensitive Information**: DOCX files often contain personal identifiable information (PII)
- **Consent Requirements**: Users must explicitly consent to document processing
- **Data Minimization**: Only necessary data is extracted and stored
- **Retention Policies**: Processed data is not retained longer than required

### Fairness and Bias
- **Neutral Processing**: Libraries do not discriminate based on content
- **ATS Compatibility**: Ensures equal opportunity for all users with ATS systems
- **Accessibility**: Generated documents follow accessibility guidelines

### Transparency
- **User Control**: Users maintain ownership of their resume data
- **Audit Trail**: Processing activities are logged for accountability
- **Error Handling**: Clear error messages without exposing sensitive data

## Future Enhancements

- **Advanced Template Support**: Multiple DOCX templates for different industries
- **Image Processing**: Safe handling of profile images and logos
- **Complex Formatting**: Support for headers, footers, and advanced layouts
- **Multi-language Support**: Enhanced parsing for non-English documents
- **AI-powered Extraction**: Machine learning for better entity recognition