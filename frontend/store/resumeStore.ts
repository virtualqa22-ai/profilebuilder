import { create } from 'zustand';

/**
 * Type definitions for resume form data
 */
type DateString = string; // ISO date string format
type UrlString = string; // URL string
type EmailString = string; // Email string

interface PersonalInfo {
  name: string;
  email: EmailString;
  phone: string;
  linkedin: UrlString;
  github: UrlString;
  website: UrlString;
}

interface WorkExperience {
  title: string;
  company: string;
  location: string;
  startDate: DateString;
  endDate: DateString;
  description: string;
}

interface Education {
  degree: string;
  major: string;
  university: string;
  location: string;
  startDate: DateString;
  endDate: DateString;
}

export interface ResumeData {
  _id?: string; // Added for MongoDB compatibility
  personalInfo: PersonalInfo;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  projects: string;
  awardsCertifications: string;
  locale: string;
  version: number;
}

interface ResumeState {
  resume: ResumeData;
  resumes: ResumeData[];
  loading: boolean;
  error: string | null;
  setResume: (resume: ResumeData) => void;
  updatePersonalInfo: (info: Partial<PersonalInfo>) => void;
  updateSummary: (summary: string) => void;
  addWorkExperience: (experience: WorkExperience) => void;
  updateWorkExperience: (index: number, experience: Partial<WorkExperience>) => void;
  removeWorkExperience: (index: number) => void;
  addEducation: (education: Education) => void;
  updateEducation: (index: number, education: Partial<Education>) => void;
  removeEducation: (index: number) => void;
  updateSkills: (skills: string[]) => void;
  updateProjects: (projects: string) => void;
  updateAwardsCertifications: (awardsCertifications: string) => void;
  updateLocale: (locale: string) => void;
  updateVersion: () => void;
  loadResumes: () => Promise<void>;
  saveResume: () => Promise<void>;
  loadResume: (id: string) => Promise<void>;
  createResume: () => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
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
  resumes: [],
  loading: false,
  error: null,
  setResume: (resume) => set({ resume }),
  updatePersonalInfo: (info) =>
    set((state) => {
      const newResume = { ...state.resume };
      newResume.personalInfo = { ...state.resume.personalInfo, ...info };
      return { resume: newResume };
    }),
  updateSummary: (summary) =>
    set((state) => ({
      resume: { ...state.resume, summary },
    })),
  addWorkExperience: (experience) =>
    set((state) => ({
      resume: {
        ...state.resume,
        workExperience: [...state.resume.workExperience, experience],
      },
    })),
  updateWorkExperience: (index, experience) =>
    set((state) => ({
      resume: {
        ...state.resume,
        workExperience: state.resume.workExperience.map((exp, i) =>
          i === index ? { ...exp, ...experience } : exp
        ),
      },
    })),
  removeWorkExperience: (index) =>
    set((state) => ({
      resume: {
        ...state.resume,
        workExperience: state.resume.workExperience.filter((_, i) => i !== index),
      },
    })),
  addEducation: (education) =>
    set((state) => ({
      resume: {
        ...state.resume,
        education: [...state.resume.education, education],
      },
    })),
  updateEducation: (index, education) =>
    set((state) => ({
      resume: {
        ...state.resume,
        education: state.resume.education.map((edu, i) =>
          i === index ? { ...edu, ...education } : edu
        ),
      },
    })),
  removeEducation: (index) =>
    set((state) => ({
      resume: {
        ...state.resume,
        education: state.resume.education.filter((_, i) => i !== index),
      },
    })),
  updateSkills: (skills) =>
    set((state) => ({
      resume: { ...state.resume, skills },
    })),
  updateProjects: (projects) =>
    set((state) => ({
      resume: { ...state.resume, projects },
    })),
  updateAwardsCertifications: (awardsCertifications) =>
    set((state) => ({
      resume: { ...state.resume, awardsCertifications },
    })),
  updateLocale: (locale) =>
    set((state) => ({
      resume: { ...state.resume, locale },
    })),
  updateVersion: () =>
    set((state) => ({
      resume: { ...state.resume, version: state.resume.version + 1 },
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // API integration methods
  loadResumes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/v1/resumes');
      if (!response.ok) {
        throw new Error('Failed to load resumes');
      }
      const data = await response.json();
      set({ resumes: data.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  saveResume: async () => {
    const { resume } = get();
    set({ loading: true, error: null });
    try {
      const method = resume._id ? 'PUT' : 'POST';
      const url = resume._id ? `/api/resumes/${resume._id}` : '/api/v1/resumes';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resume),
      });
      if (!response.ok) {
        throw new Error('Failed to save resume');
      }
      const data = await response.json();
      set({ resume: data.data, loading: false });
      // Reload resumes list
      get().loadResumes();
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  loadResume: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/resumes/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load resume');
      }
      const data = await response.json();
      set({ resume: data.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createResume: async () => {
    const newResume: ResumeData = {
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
      locale: 'en-US',
      version: 1,
    };
    set({ resume: newResume });
  },

  deleteResume: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete resume');
      }
      set({ loading: false });
      // Reload resumes list
      get().loadResumes();
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));
