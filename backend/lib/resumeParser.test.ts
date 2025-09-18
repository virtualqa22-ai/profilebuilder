/// <reference types="jest" />
import { parseResume } from './resumeParser';
import { getLocaleByCode } from './localeService';

const sampleResume = `
John Doe

+1 123-456-7890 | john.doe@email.com | linkedin.com/in/johndoe

Summary
A highly skilled and motivated software engineer with 5 years of experience in developing and maintaining web applications.

Work Experience
Software Engineer
Acme Inc.
San Francisco, CA
2020-2022
- Developed and maintained web applications using React and Node.js
- Collaborated with cross-functional teams to deliver high-quality software

Education
B.S. in Computer Science
University of California, Berkeley
2016-2020

Skills
JavaScript, React, Node.js, Python, SQL
`;

describe('resumeParser', () => {
  it('should parse the personal info section correctly', () => {
    const locale = getLocaleByCode('en-US');
    if (!locale) {
      throw new Error('en-US locale not found');
    }
    const resume = parseResume(sampleResume, locale);
    expect(resume.personalInfo.name).toBe('John Doe');
    expect(resume.personalInfo.email).toBe('john.doe@email.com');
    expect(resume.personalInfo.phone).toBe('123-456-7890');
    expect(resume.personalInfo.linkedin).toBe('linkedin.com/in/johndoe');
  });
});
