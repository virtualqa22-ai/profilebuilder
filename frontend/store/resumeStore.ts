import { create } from 'zustand';

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
}

interface WorkExperience {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  degree: string;
  major: string;
  university: string;
  location: string;
  startDate: string;
  endDate: string;
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
}

export const useResumeStore = create<ResumeState>((set) => ({
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
}));
