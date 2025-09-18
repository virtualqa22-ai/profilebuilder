import { ILocale } from './localeService';

export const parseResume = (text: string, locale: ILocale) => {
  const personalInfo = parsePersonalInfo(text);
  const summary = parseSummary(text);
  const workExperience = parseWorkExperience(text);
  const education = parseEducation(text);
  const skills = parseSkills(text);

  return {
    personalInfo,
    summary,
    workExperience,
    education,
    skills,
  };
};

const parsePersonalInfo = (text: string) => {
  const personalInfo: { [key: string]: string } = {};

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\(\d{3}\)|\d{3})[- .]?\d{3}[- .]?\d{4}/;
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/; 

  const email = text.match(emailRegex);
  if (email) {
    personalInfo.email = email[0];
  }

  const phone = text.match(phoneRegex);
  if (phone) {
    personalInfo.phone = phone[0];
  }

  const linkedin = text.match(linkedinRegex);
  if (linkedin) {
    personalInfo.linkedin = linkedin[0];
  }

  // Name is usually at the beginning of the resume, but let's be more robust
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && !trimmedLine.match(emailRegex) && !trimmedLine.match(phoneRegex) && !trimmedLine.match(linkedinRegex)) {
      personalInfo.name = trimmedLine;
      break;
    }
  }

  return personalInfo;
};

const parseSummary = (text: string) => {
  const summaryKeywords = ['summary', 'objective', 'profile'];
  const lines = text.split('\n');
  let summary = '';
  let inSummary = false;

  for (const line of lines) {
    const lowerCaseLine = line.toLowerCase();
    if (summaryKeywords.some(keyword => lowerCaseLine.startsWith(keyword))) {
      inSummary = true;
      summary += line.substring(line.indexOf(' ') + 1).trim() + ' ';
    } else if (inSummary) {
      if (line.trim() === '' || ['work experience', 'education', 'skills'].some(keyword => lowerCaseLine.startsWith(keyword))) {
        inSummary = false;
        break;
      }
      summary += line.trim() + ' ';
    }
  }

  return summary.trim();
};

const parseWorkExperience = (text: string) => {
  const workExperienceKeywords = ['work experience', 'experience', 'employment history'];
  const lines = text.split('\n');
  const workExperience: any[] = [];
  let inWorkExperience = false;
  let currentExperience: any = {};

  for (const line of lines) {
    const lowerCaseLine = line.toLowerCase();
    if (workExperienceKeywords.some(keyword => lowerCaseLine.startsWith(keyword))) {
      inWorkExperience = true;
      continue;
    }

    if (inWorkExperience) {
      if (['education', 'skills', 'projects'].some(keyword => lowerCaseLine.startsWith(keyword))) {
        inWorkExperience = false;
        if (Object.keys(currentExperience).length > 0) {
          workExperience.push(currentExperience);
        }
        break;
      }

      // This is a very basic implementation. It assumes that the job title is on its own line.
      if (line.trim() !== '' && !currentExperience.title) {
        currentExperience.title = line.trim();
      } else if (line.trim() !== '' && !currentExperience.company) {
        currentExperience.company = line.trim();
      } else if (line.trim() !== '' && !currentExperience.location) {
        currentExperience.location = line.trim();
      } else if (line.trim() !== '' && !currentExperience.startDate) {
        currentExperience.startDate = line.trim();
      } else if (line.trim() !== '' && !currentExperience.endDate) {
        currentExperience.endDate = line.trim();
      } else if (line.trim() !== '') {
        currentExperience.description = (currentExperience.description || '') + line.trim() + ' ';
      } else {
        if (Object.keys(currentExperience).length > 0) {
          workExperience.push(currentExperience);
          currentExperience = {};
        }
      }
    }
  }

  return workExperience;
};

const parseEducation = (text: string) => {
  const educationKeywords = ['education', 'academic history'];
  const lines = text.split('\n');
  const education: any[] = [];
  let inEducation = false;
  let currentEducation: any = {};

  for (const line of lines) {
    const lowerCaseLine = line.toLowerCase();
    if (educationKeywords.some(keyword => lowerCaseLine.startsWith(keyword))) {
      inEducation = true;
      continue;
    }

    if (inEducation) {
      if (['skills', 'projects', 'awards'].some(keyword => lowerCaseLine.startsWith(keyword))) {
        inEducation = false;
        if (Object.keys(currentEducation).length > 0) {
          education.push(currentEducation);
        }
        break;
      }

      // This is a very basic implementation.
      if (line.trim() !== '' && !currentEducation.degree) {
        currentEducation.degree = line.trim();
      } else if (line.trim() !== '' && !currentEducation.major) {
        currentEducation.major = line.trim();
      } else if (line.trim() !== '' && !currentEducation.university) {
        currentEducation.university = line.trim();
      } else if (line.trim() !== '' && !currentEducation.location) {
        currentEducation.location = line.trim();
      } else if (line.trim() !== '' && !currentEducation.startDate) {
        currentEducation.startDate = line.trim();
      } else if (line.trim() !== '' && !currentEducation.endDate) {
        currentEducation.endDate = line.trim();
      } else {
        if (Object.keys(currentEducation).length > 0) {
          education.push(currentEducation);
          currentEducation = {};
        }
      }
    }
  }

  return education;
};

const parseSkills = (text: string) => {
  const skillsKeywords = ['skills', 'technical skills', 'core competencies'];
  const lines = text.split('\n');
  let skills: string[] = [];
  let inSkills = false;

  for (const line of lines) {
    const lowerCaseLine = line.toLowerCase();
    if (skillsKeywords.some(keyword => lowerCaseLine.startsWith(keyword))) {
      inSkills = true;
      const skillsLine = line.substring(line.indexOf(':') + 1).trim();
      skills = skillsLine.split(',').map(skill => skill.trim());
    } else if (inSkills) {
      if (line.trim() === '' || ['projects', 'awards'].some(keyword => lowerCaseLine.startsWith(keyword))) {
        inSkills = false;
        break;
      }
      const skillsLine = line.trim();
      skills = [...skills, ...skillsLine.split(',').map(skill => skill.trim())];
    }
  }

  return skills.filter(skill => skill !== '');
};
