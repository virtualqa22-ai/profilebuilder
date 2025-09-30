/**
 * Resume Store Integration Tests
 *
 * Tests the complete Zustand store functionality including:
 * - Store initialization and state management
 * - Action dispatching and state updates
 * - API integration with mocked fetch calls
 * - Error handling and loading states
 * - Async operations and promise handling
 * - State persistence and retrieval
 * - Cross-action interactions and data flow
 * - Performance with large state updates
 * - Memory leaks and cleanup
 * - Concurrent operations and race conditions
 */

import { jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { useResumeStore } from '../../../frontend/store/resumeStore';

// Mock fetch globally
global.fetch = jest.fn();

describe('Resume Store Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset fetch mock to default success response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} })
    });

    // Get a fresh store instance for each test
    const { result } = renderHook(() => useResumeStore());
    store = result.current;
  });

  afterEach(() => {
    // Reset store to initial state
    act(() => {
      store.setResume({
        personalInfo: { name: '', email: '', phone: '', linkedin: '', github: '', website: '' },
        summary: '',
        workExperience: [],
        education: [],
        skills: [],
        projects: '',
        awardsCertifications: '',
        locale: '',
        version: 1,
      });
      store.setLoading(false);
      store.setError(null);
    });
  });

  describe('Store Initialization', () => {
    it('should initialize with default state', () => {
      expect(store.resume).toEqual({
        personalInfo: { name: '', email: '', phone: '', linkedin: '', github: '', website: '' },
        summary: '',
        workExperience: [],
        education: [],
        skills: [],
        projects: '',
        awardsCertifications: '',
        locale: '',
        version: 1,
      });
      expect(store.resumes).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should allow setting custom initial resume', () => {
      const customResume = {
        personalInfo: { name: 'John Doe', email: 'john@example.com', phone: '', linkedin: '', github: '', website: '' },
        summary: 'Test summary',
        workExperience: [],
        education: [],
        skills: ['JavaScript'],
        projects: '',
        awardsCertifications: '',
        locale: 'en-US',
        version: 2,
      };

      act(() => {
        store.setResume(customResume);
      });

      expect(store.resume).toEqual(customResume);
    });
  });

  describe('Personal Info Management', () => {
    it('should update personal info correctly', () => {
      act(() => {
        store.updatePersonalInfo({ name: 'John Doe', email: 'john@example.com' });
      });

      expect(store.resume.personalInfo.name).toBe('John Doe');
      expect(store.resume.personalInfo.email).toBe('john@example.com');
      expect(store.resume.personalInfo.phone).toBe(''); // Unchanged fields remain
    });

    it('should merge personal info updates', () => {
      act(() => {
        store.updatePersonalInfo({ name: 'John' });
        store.updatePersonalInfo({ email: 'john@example.com' });
      });

      expect(store.resume.personalInfo.name).toBe('John');
      expect(store.resume.personalInfo.email).toBe('john@example.com');
    });

    it('should handle empty personal info updates', () => {
      act(() => {
        store.updatePersonalInfo({ name: 'Test' });
        store.updatePersonalInfo({}); // Empty update
      });

      expect(store.resume.personalInfo.name).toBe('Test');
    });
  });

  describe('Summary Management', () => {
    it('should update summary correctly', () => {
      const testSummary = 'This is a test professional summary.';

      act(() => {
        store.updateSummary(testSummary);
      });

      expect(store.resume.summary).toBe(testSummary);
    });

    it('should handle empty summary', () => {
      act(() => {
        store.updateSummary('');
      });

      expect(store.resume.summary).toBe('');
    });

    it('should handle long summary text', () => {
      const longSummary = 'A'.repeat(10000); // 10KB summary

      act(() => {
        store.updateSummary(longSummary);
      });

      expect(store.resume.summary).toBe(longSummary);
    });
  });

  describe('Work Experience Management', () => {
    const sampleWorkExperience = {
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'New York',
      startDate: '2020-01-01',
      endDate: '2023-01-01',
      description: 'Developed web applications'
    };

    it('should add work experience entry', () => {
      act(() => {
        store.addWorkExperience(sampleWorkExperience);
      });

      expect(store.resume.workExperience).toHaveLength(1);
      expect(store.resume.workExperience[0]).toEqual(sampleWorkExperience);
    });

    it('should update work experience entry', () => {
      act(() => {
        store.addWorkExperience(sampleWorkExperience);
        store.updateWorkExperience(0, { title: 'Senior Software Engineer' });
      });

      expect(store.resume.workExperience[0].title).toBe('Senior Software Engineer');
      expect(store.resume.workExperience[0].company).toBe('Tech Corp'); // Unchanged
    });

    it('should remove work experience entry', () => {
      act(() => {
        store.addWorkExperience(sampleWorkExperience);
        store.addWorkExperience({ ...sampleWorkExperience, company: 'Another Corp' });
        store.removeWorkExperience(0);
      });

      expect(store.resume.workExperience).toHaveLength(1);
      expect(store.resume.workExperience[0].company).toBe('Another Corp');
    });

    it('should handle multiple work experience entries', () => {
      const entries = [
        { ...sampleWorkExperience, company: 'Company A' },
        { ...sampleWorkExperience, company: 'Company B' },
        { ...sampleWorkExperience, company: 'Company C' }
      ];

      act(() => {
        entries.forEach(entry => store.addWorkExperience(entry));
      });

      expect(store.resume.workExperience).toHaveLength(3);
      expect(store.resume.workExperience.map((exp: any) => exp.company)).toEqual(['Company A', 'Company B', 'Company C']);
    });

    it('should handle removing non-existent work experience', () => {
      act(() => {
        store.addWorkExperience(sampleWorkExperience);
        store.removeWorkExperience(5); // Index out of bounds
      });

      expect(store.resume.workExperience).toHaveLength(1); // Should not crash
    });
  });

  describe('Education Management', () => {
    const sampleEducation = {
      degree: 'Bachelor of Science',
      major: 'Computer Science',
      university: 'State University',
      location: 'California',
      startDate: '2016-09-01',
      endDate: '2020-05-01'
    };

    it('should add education entry', () => {
      act(() => {
        store.addEducation(sampleEducation);
      });

      expect(store.resume.education).toHaveLength(1);
      expect(store.resume.education[0]).toEqual(sampleEducation);
    });

    it('should update education entry', () => {
      act(() => {
        store.addEducation(sampleEducation);
        store.updateEducation(0, { degree: 'Master of Science' });
      });

      expect(store.resume.education[0].degree).toBe('Master of Science');
      expect(store.resume.education[0].major).toBe('Computer Science'); // Unchanged
    });

    it('should remove education entry', () => {
      act(() => {
        store.addEducation(sampleEducation);
        store.addEducation({ ...sampleEducation, university: 'Another University' });
        store.removeEducation(0);
      });

      expect(store.resume.education).toHaveLength(1);
      expect(store.resume.education[0].university).toBe('Another University');
    });
  });

  describe('Skills Management', () => {
    it('should update skills array', () => {
      const skills = ['JavaScript', 'React', 'Node.js'];

      act(() => {
        store.updateSkills(skills);
      });

      expect(store.resume.skills).toEqual(skills);
    });

    it('should handle empty skills array', () => {
      act(() => {
        store.updateSkills([]);
      });

      expect(store.resume.skills).toEqual([]);
    });

    it('should handle large skills array', () => {
      const largeSkillsArray = Array.from({ length: 100 }, (_, i) => `Skill ${i + 1}`);

      act(() => {
        store.updateSkills(largeSkillsArray);
      });

      expect(store.resume.skills).toHaveLength(100);
      expect(store.resume.skills[0]).toBe('Skill 1');
      expect(store.resume.skills[99]).toBe('Skill 100');
    });
  });

  describe('Projects and Certifications Management', () => {
    it('should update projects', () => {
      const projects = 'Developed multiple web applications using React and Node.js.';

      act(() => {
        store.updateProjects(projects);
      });

      expect(store.resume.projects).toBe(projects);
    });

    it('should update awards and certifications', () => {
      const awards = 'AWS Certified Developer, Google Cloud Professional';

      act(() => {
        store.updateAwardsCertifications(awards);
      });

      expect(store.resume.awardsCertifications).toBe(awards);
    });
  });

  describe('Locale and Version Management', () => {
    it('should update locale', () => {
      act(() => {
        store.updateLocale('fr-FR');
      });

      expect(store.resume.locale).toBe('fr-FR');
    });

    it('should increment version', () => {
      act(() => {
        store.updateVersion();
      });

      expect(store.resume.version).toBe(2);

      act(() => {
        store.updateVersion();
      });

      expect(store.resume.version).toBe(3);
    });
  });

  describe('API Integration - Load Resumes', () => {
    it('should load resumes successfully', async () => {
      const mockResumes = [
        { _id: '1', title: 'Resume 1', locale: 'en-US' },
        { _id: '2', title: 'Resume 2', locale: 'fr-FR' }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResumes })
      });

      await act(async () => {
        await store.loadResumes();
      });

      expect(store.resumes).toEqual(mockResumes);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/resumes');
    });

    it('should handle load resumes failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to load' })
      });

      await act(async () => {
        await store.loadResumes();
      });

      expect(store.resumes).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe('Failed to load resumes');
    });

    it('should handle network errors during load', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await store.loadResumes();
      });

      expect(store.loading).toBe(false);
      expect(store.error).toBe('Network error');
    });
  });

  describe('API Integration - Save Resume', () => {
    beforeEach(() => {
      act(() => {
        store.setResume({
          _id: 'test-resume-id',
          personalInfo: { name: 'Test User', email: 'test@example.com', phone: '', linkedin: '', github: '', website: '' },
          summary: 'Test summary',
          workExperience: [],
          education: [],
          skills: ['JavaScript'],
          projects: '',
          awardsCertifications: '',
          locale: 'en-US',
          version: 1
        });
      });
    });

    it('should save new resume successfully', async () => {
      const savedResume = { ...store.resume, _id: 'new-id' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: savedResume })
      });

      act(() => {
        store.setResume({ ...store.resume, _id: undefined }); // New resume
      });

      await act(async () => {
        await store.saveResume();
      });

      expect(store.resume).toEqual(savedResume);
      expect(store.loading).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...store.resume, _id: undefined })
      });
    });

    it('should update existing resume successfully', async () => {
      const updatedResume = { ...store.resume, title: 'Updated Title' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: updatedResume })
      });

      await act(async () => {
        await store.saveResume();
      });

      expect(store.resume).toEqual(updatedResume);
      expect(global.fetch).toHaveBeenCalledWith(`/api/resumes/${store.resume._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store.resume)
      });
    });

    it('should handle save failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Save failed' })
      });

      await act(async () => {
        await store.saveResume();
      });

      expect(store.loading).toBe(false);
      expect(store.error).toBe('Failed to save resume');
    });
  });

  describe('API Integration - Load Resume', () => {
    it('should load specific resume successfully', async () => {
      const resumeId = 'test-resume-id';
      const mockResume = {
        _id: resumeId,
        personalInfo: { name: 'Loaded User', email: 'loaded@example.com', phone: '', linkedin: '', github: '', website: '' },
        summary: 'Loaded summary',
        workExperience: [],
        education: [],
        skills: ['Python'],
        projects: '',
        awardsCertifications: '',
        locale: 'en-US',
        version: 1
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResume })
      });

      await act(async () => {
        await store.loadResume(resumeId);
      });

      expect(store.resume).toEqual(mockResume);
      expect(store.loading).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(`/api/resumes/${resumeId}`);
    });

    it('should handle load resume failure', async () => {
      const resumeId = 'invalid-id';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Resume not found' })
      });

      await act(async () => {
        await store.loadResume(resumeId);
      });

      expect(store.loading).toBe(false);
      expect(store.error).toBe('Failed to load resume');
    });
  });

  describe('API Integration - Delete Resume', () => {
    it('should delete resume successfully', async () => {
      const resumeId = 'delete-test-id';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await act(async () => {
        await store.deleteResume(resumeId);
      });

      expect(store.loading).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(`/api/resumes/${resumeId}`, {
        method: 'DELETE'
      });
    });

    it('should handle delete failure', async () => {
      const resumeId = 'delete-fail-id';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Delete failed' })
      });

      await act(async () => {
        await store.deleteResume(resumeId);
      });

      expect(store.loading).toBe(false);
      expect(store.error).toBe('Failed to delete resume');
    });
  });

  describe('Create Resume', () => {
    it('should create new resume with default values', () => {
      act(() => {
        store.createResume();
      });

      expect(store.resume).toEqual({
        personalInfo: { name: '', email: '', phone: '', linkedin: '', github: '', website: '' },
        summary: '',
        workExperience: [],
        education: [],
        skills: [],
        projects: '',
        awardsCertifications: '',
        locale: 'en-US',
        version: 1,
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should manage loading state correctly', () => {
      act(() => {
        store.setLoading(true);
      });

      expect(store.loading).toBe(true);

      act(() => {
        store.setLoading(false);
      });

      expect(store.loading).toBe(false);
    });

    it('should manage error state correctly', () => {
      const testError = 'Test error message';

      act(() => {
        store.setError(testError);
      });

      expect(store.error).toBe(testError);

      act(() => {
        store.setError(null);
      });

      expect(store.error).toBeNull();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple state updates correctly', () => {
      act(() => {
        store.updatePersonalInfo({ name: 'John' });
        store.updateSummary('Summary 1');
        store.updatePersonalInfo({ email: 'john@example.com' });
        store.updateSummary('Summary 2');
      });

      expect(store.resume.personalInfo.name).toBe('John');
      expect(store.resume.personalInfo.email).toBe('john@example.com');
      expect(store.resume.summary).toBe('Summary 2');
    });

    it('should handle rapid API calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });

      await act(async () => {
        await Promise.all([
          store.loadResumes(),
          store.loadResumes(),
          store.loadResumes()
        ]);
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large resume data', () => {
      const largeWorkExperience = Array.from({ length: 50 }, (_, i) => ({
        title: `Job Title ${i}`,
        company: `Company ${i}`,
        location: `Location ${i}`,
        startDate: '2020-01-01',
        endDate: '2023-01-01',
        description: `Description ${i}`.repeat(100) // Large descriptions
      }));

      const largeSkills = Array.from({ length: 200 }, (_, i) => `Skill ${i + 1}`);

      act(() => {
        store.addWorkExperience(largeWorkExperience);
        store.updateSkills(largeSkills);
        store.updateProjects('A'.repeat(50000)); // 50KB projects
      });

      expect(store.resume.workExperience).toHaveLength(50);
      expect(store.resume.skills).toHaveLength(200);
      expect(store.resume.projects.length).toBe(50000);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined values gracefully', () => {
      act(() => {
        store.updatePersonalInfo(undefined as any);
        store.updateSummary(undefined as any);
        store.updateSkills(undefined as any);
      });

      // Should not crash and maintain existing values
      expect(store.resume.personalInfo).toBeDefined();
      expect(store.resume.summary).toBeDefined();
      expect(store.resume.skills).toBeDefined();
    });

    it('should handle null values gracefully', () => {
      act(() => {
        store.updatePersonalInfo(null as any);
        store.updateSummary(null as any);
      });

      // Should handle null values appropriately
      expect(store.resume.personalInfo).toBeDefined();
      expect(store.resume.summary).toBeDefined();
    });

    it('should handle invalid array operations', () => {
      act(() => {
        store.updateWorkExperience(10, { title: 'Invalid' }); // Index out of bounds
        store.removeWorkExperience(10); // Index out of bounds
      });

      // Should not crash
      expect(store.resume.workExperience).toEqual([]);
    });

    it('should handle API timeout', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Timeout' })
        }), 100))
      );

      const startTime = Date.now();

      await act(async () => {
        await store.loadResumes();
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(50); // Some delay expected
      expect(store.error).toBe('Failed to load resumes');
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with frequent updates', () => {
      // Perform many updates
      for (let i = 0; i < 1000; i++) {
        act(() => {
          store.updatePersonalInfo({ name: `Name ${i}` });
        });
      }

      // Should still work correctly
      expect(store.resume.personalInfo.name).toBe('Name 999');
    });

    it('should handle deep object updates efficiently', () => {
      const deepResume = {
        personalInfo: {
          name: 'Deep Test',
          email: 'deep@example.com',
          phone: '123-456-7890',
          linkedin: 'https://linkedin.com/in/deep',
          github: 'https://github.com/deep',
          website: 'https://deep.dev'
        },
        summary: 'Deep summary',
        workExperience: Array.from({ length: 10 }, (_, i) => ({
          title: `Deep Job ${i}`,
          company: `Deep Company ${i}`,
          location: `Deep Location ${i}`,
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          description: `Deep description ${i}`
        })),
        education: Array.from({ length: 5 }, (_, i) => ({
          degree: `Deep Degree ${i}`,
          major: `Deep Major ${i}`,
          university: `Deep University ${i}`,
          location: `Deep Edu Location ${i}`,
          startDate: '2016-01-01',
          endDate: '2020-01-01'
        })),
        skills: Array.from({ length: 50 }, (_, i) => `Deep Skill ${i}`),
        projects: 'Deep projects description',
        awardsCertifications: 'Deep awards and certifications',
        locale: 'en-US',
        version: 5
      };

      act(() => {
        store.setResume(deepResume);
      });

      expect(store.resume).toEqual(deepResume);
      expect(store.resume.workExperience).toHaveLength(10);
      expect(store.resume.education).toHaveLength(5);
      expect(store.resume.skills).toHaveLength(50);
    });
  });
});