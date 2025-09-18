/// <reference types="jest" />
import { useResumeStore } from '../../../frontend/store/resumeStore';
import { act, renderHook } from '@testing-library/react';

describe('Resume Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useResumeStore.setState({
        resume: {
          personalInfo: {
            name: '',
            email: '',
            phone: '',
            linkedin: '',
            github: '',
            website: '',
          },
          summary: '',
          workExperience: [],
          education: [],
          skills: [],
          projects: '',
          awardsCertifications: '',
          locale: '',
          version: 1,
        },
      });
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useResumeStore());

      expect(result.current.resume.personalInfo).toEqual({
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        github: '',
        website: '',
      });
      expect(result.current.resume.summary).toBe('');
      expect(result.current.resume.workExperience).toEqual([]);
      expect(result.current.resume.education).toEqual([]);
      expect(result.current.resume.skills).toEqual([]);
      expect(result.current.resume.projects).toBe('');
      expect(result.current.resume.awardsCertifications).toBe('');
      expect(result.current.resume.locale).toBe('');
      expect(result.current.resume.version).toBe(1);
    });
  });

  describe('setResume', () => {
    it('should set the entire resume state', () => {
      const { result } = renderHook(() => useResumeStore());

      const newResume = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          linkedin: 'linkedin.com/in/johndoe',
          github: 'github.com/johndoe',
          website: 'johndoe.com',
        },
        summary: 'Professional summary',
        workExperience: [
          {
            title: 'Developer',
            company: 'Tech Corp',
            location: 'New York',
            startDate: '2020-01-01',
            endDate: '2023-01-01',
            description: 'Developed software',
          },
        ],
        education: [
          {
            degree: 'Bachelor',
            major: 'Computer Science',
            university: 'University',
            location: 'City',
            startDate: '2016-01-01',
            endDate: '2020-01-01',
          },
        ],
        skills: ['JavaScript', 'React'],
        projects: 'Project description',
        awardsCertifications: 'Certifications',
        locale: 'en-US',
        version: 2,
      };

      act(() => {
        result.current.setResume(newResume);
      });

      expect(result.current.resume).toEqual(newResume);
    });
  });

  describe('updatePersonalInfo', () => {
    it('should update personal info partially', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updatePersonalInfo({
          name: 'John Doe',
          email: 'john@example.com',
        });
      });

      expect(result.current.resume.personalInfo.name).toBe('John Doe');
      expect(result.current.resume.personalInfo.email).toBe('john@example.com');
      expect(result.current.resume.personalInfo.phone).toBe(''); // Unchanged
    });

    it('should merge with existing personal info', () => {
      const { result } = renderHook(() => useResumeStore());

      // Set initial values
      act(() => {
        result.current.updatePersonalInfo({
          name: 'Jane Doe',
          phone: '555-1234',
        });
      });

      // Update partially
      act(() => {
        result.current.updatePersonalInfo({
          email: 'jane@example.com',
        });
      });

      expect(result.current.resume.personalInfo.name).toBe('Jane Doe');
      expect(result.current.resume.personalInfo.phone).toBe('555-1234');
      expect(result.current.resume.personalInfo.email).toBe('jane@example.com');
    });
  });

  describe('updateSummary', () => {
    it('should update summary', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updateSummary('New professional summary');
      });

      expect(result.current.resume.summary).toBe('New professional summary');
    });

    it('should handle empty summary', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updateSummary('');
      });

      expect(result.current.resume.summary).toBe('');
    });
  });

  describe('Work Experience Management', () => {
    it('should add work experience', () => {
      const { result } = renderHook(() => useResumeStore());

      const experience = {
        title: 'Developer',
        company: 'Tech Corp',
        location: 'New York',
        startDate: '2020-01-01',
        endDate: '2023-01-01',
        description: 'Developed software',
      };

      act(() => {
        result.current.addWorkExperience(experience);
      });

      expect(result.current.resume.workExperience).toHaveLength(1);
      expect(result.current.resume.workExperience[0]).toEqual(experience);
    });

    it('should update work experience', () => {
      const { result } = renderHook(() => useResumeStore());

      const experience = {
        title: 'Developer',
        company: 'Tech Corp',
        location: 'New York',
        startDate: '2020-01-01',
        endDate: '2023-01-01',
        description: 'Developed software',
      };

      act(() => {
        result.current.addWorkExperience(experience);
        result.current.updateWorkExperience(0, {
          title: 'Senior Developer',
          company: 'Tech Corp',
        });
      });

      expect(result.current.resume.workExperience[0].title).toBe('Senior Developer');
      expect(result.current.resume.workExperience[0].company).toBe('Tech Corp');
      expect(result.current.resume.workExperience[0].location).toBe('New York'); // Unchanged
    });

    it('should remove work experience', () => {
      const { result } = renderHook(() => useResumeStore());

      const experience1 = {
        title: 'Developer',
        company: 'Tech Corp',
        location: 'New York',
        startDate: '2020-01-01',
        endDate: '2023-01-01',
        description: 'Developed software',
      };

      const experience2 = {
        title: 'Manager',
        company: 'Tech Corp',
        location: 'New York',
        startDate: '2023-01-01',
        endDate: '2024-01-01',
        description: 'Managed team',
      };

      act(() => {
        result.current.addWorkExperience(experience1);
        result.current.addWorkExperience(experience2);
        result.current.removeWorkExperience(0);
      });

      expect(result.current.resume.workExperience).toHaveLength(1);
      expect(result.current.resume.workExperience[0]).toEqual(experience2);
    });

    it('should handle removing from empty array', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.removeWorkExperience(0);
      });

      expect(result.current.resume.workExperience).toEqual([]);
    });

    it('should handle updating non-existent index', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updateWorkExperience(5, { title: 'New Title' });
      });

      expect(result.current.resume.workExperience).toEqual([]);
    });
  });

  describe('Education Management', () => {
    it('should add education', () => {
      const { result } = renderHook(() => useResumeStore());

      const education = {
        degree: 'Bachelor',
        major: 'Computer Science',
        university: 'University',
        location: 'City',
        startDate: '2016-01-01',
        endDate: '2020-01-01',
      };

      act(() => {
        result.current.addEducation(education);
      });

      expect(result.current.resume.education).toHaveLength(1);
      expect(result.current.resume.education[0]).toEqual(education);
    });

    it('should update education', () => {
      const { result } = renderHook(() => useResumeStore());

      const education = {
        degree: 'Bachelor',
        major: 'Computer Science',
        university: 'University',
        location: 'City',
        startDate: '2016-01-01',
        endDate: '2020-01-01',
      };

      act(() => {
        result.current.addEducation(education);
        result.current.updateEducation(0, {
          degree: 'Master',
          major: 'Computer Science',
        });
      });

      expect(result.current.resume.education[0].degree).toBe('Master');
      expect(result.current.resume.education[0].major).toBe('Computer Science');
      expect(result.current.resume.education[0].university).toBe('University'); // Unchanged
    });

    it('should remove education', () => {
      const { result } = renderHook(() => useResumeStore());

      const education1 = {
        degree: 'Bachelor',
        major: 'CS',
        university: 'University A',
        location: 'City A',
        startDate: '2016-01-01',
        endDate: '2020-01-01',
      };

      const education2 = {
        degree: 'Master',
        major: 'CS',
        university: 'University B',
        location: 'City B',
        startDate: '2020-01-01',
        endDate: '2022-01-01',
      };

      act(() => {
        result.current.addEducation(education1);
        result.current.addEducation(education2);
        result.current.removeEducation(0);
      });

      expect(result.current.resume.education).toHaveLength(1);
      expect(result.current.resume.education[0]).toEqual(education2);
    });
  });

  describe('Other Updates', () => {
    it('should update skills', () => {
      const { result } = renderHook(() => useResumeStore());

      const skills = ['JavaScript', 'React', 'Node.js'];

      act(() => {
        result.current.updateSkills(skills);
      });

      expect(result.current.resume.skills).toEqual(skills);
    });

    it('should update projects', () => {
      const { result } = renderHook(() => useResumeStore());

      const projects = 'Project description here';

      act(() => {
        result.current.updateProjects(projects);
      });

      expect(result.current.resume.projects).toBe(projects);
    });

    it('should update awards and certifications', () => {
      const { result } = renderHook(() => useResumeStore());

      const awards = 'AWS Certified Developer';

      act(() => {
        result.current.updateAwardsCertifications(awards);
      });

      expect(result.current.resume.awardsCertifications).toBe(awards);
    });

    it('should update locale', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updateLocale('en-US');
      });

      expect(result.current.resume.locale).toBe('en-US');
    });

    it('should update version', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updateVersion();
      });

      expect(result.current.resume.version).toBe(2);

      act(() => {
        result.current.updateVersion();
      });

      expect(result.current.resume.version).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings in updates', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updateSummary('');
        result.current.updateProjects('');
        result.current.updateAwardsCertifications('');
        result.current.updateLocale('');
      });

      expect(result.current.resume.summary).toBe('');
      expect(result.current.resume.projects).toBe('');
      expect(result.current.resume.awardsCertifications).toBe('');
      expect(result.current.resume.locale).toBe('');
    });

    it('should handle empty arrays in updates', () => {
      const { result } = renderHook(() => useResumeStore());

      act(() => {
        result.current.updateSkills([]);
      });

      expect(result.current.resume.skills).toEqual([]);
    });

    it('should handle large arrays', () => {
      const { result } = renderHook(() => useResumeStore());

      const largeSkillsArray = Array.from({ length: 100 }, (_, i) => `Skill ${i}`);

      act(() => {
        result.current.updateSkills(largeSkillsArray);
      });

      expect(result.current.resume.skills).toHaveLength(100);
      expect(result.current.resume.skills[0]).toBe('Skill 0');
      expect(result.current.resume.skills[99]).toBe('Skill 99');
    });

    it('should handle special characters in strings', () => {
      const { result } = renderHook(() => useResumeStore());

      const specialText = 'Special chars: éñüñ 中文 🚀';

      act(() => {
        result.current.updateSummary(specialText);
        result.current.updateProjects(specialText);
      });

      expect(result.current.resume.summary).toBe(specialText);
      expect(result.current.resume.projects).toBe(specialText);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete resume workflow', () => {
      const { result } = renderHook(() => useResumeStore());

      // Build a complete resume
      act(() => {
        result.current.updatePersonalInfo({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
        });
        result.current.updateSummary('Professional software developer');
        result.current.updateSkills(['JavaScript', 'React', 'Node.js']);
        result.current.updateProjects('Built multiple web applications');
        result.current.updateAwardsCertifications('AWS Certified');
        result.current.updateLocale('en-US');
      });

      // Add work experience
      act(() => {
        result.current.addWorkExperience({
          title: 'Senior Developer',
          company: 'Tech Corp',
          location: 'New York',
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          description: 'Led development team',
        });
      });

      // Add education
      act(() => {
        result.current.addEducation({
          degree: 'Bachelor of Science',
          major: 'Computer Science',
          university: 'State University',
          location: 'California',
          startDate: '2016-01-01',
          endDate: '2020-01-01',
        });
      });

      // Update version
      act(() => {
        result.current.updateVersion();
      });

      expect(result.current.resume.personalInfo.name).toBe('John Doe');
      expect(result.current.resume.workExperience).toHaveLength(1);
      expect(result.current.resume.education).toHaveLength(1);
      expect(result.current.resume.version).toBe(2);
    });

    it('should handle multiple work experiences and education entries', () => {
      const { result } = renderHook(() => useResumeStore());

      // Add multiple work experiences
      act(() => {
        result.current.addWorkExperience({
          title: 'Junior Developer',
          company: 'Startup Inc',
          location: 'San Francisco',
          startDate: '2018-01-01',
          endDate: '2020-01-01',
          description: 'Developed web applications',
        });
        result.current.addWorkExperience({
          title: 'Senior Developer',
          company: 'Tech Corp',
          location: 'New York',
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          description: 'Led development team',
        });
      });

      // Add multiple education entries
      act(() => {
        result.current.addEducation({
          degree: 'Bachelor',
          major: 'Computer Science',
          university: 'University A',
          location: 'City A',
          startDate: '2014-01-01',
          endDate: '2018-01-01',
        });
        result.current.addEducation({
          degree: 'Master',
          major: 'Software Engineering',
          university: 'University B',
          location: 'City B',
          startDate: '2018-01-01',
          endDate: '2020-01-01',
        });
      });

      expect(result.current.resume.workExperience).toHaveLength(2);
      expect(result.current.resume.education).toHaveLength(2);

      // Update middle entries
      act(() => {
        result.current.updateWorkExperience(1, { title: 'Lead Developer' });
        result.current.updateEducation(1, { degree: 'PhD' });
      });

      expect(result.current.resume.workExperience[1].title).toBe('Lead Developer');
      expect(result.current.resume.education[1].degree).toBe('PhD');

      // Remove entries
      act(() => {
        result.current.removeWorkExperience(0);
        result.current.removeEducation(0);
      });

      expect(result.current.resume.workExperience).toHaveLength(1);
      expect(result.current.resume.education).toHaveLength(1);
      expect(result.current.resume.workExperience[0].title).toBe('Lead Developer');
      expect(result.current.resume.education[0].degree).toBe('PhD');
    });
  });
});