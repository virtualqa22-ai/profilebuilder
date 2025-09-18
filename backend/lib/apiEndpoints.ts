/**
 * Centralized API Endpoints
 *
 * Contains all API endpoint paths and configurations for consistency
 * and easy maintenance across the application.
 */

// Base API paths
export const API_BASE = '/api';

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  NEXTAUTH: `${API_BASE}/auth/[...nextauth]`,
  SIGNIN: '/auth/signin',
} as const;

// Resume endpoints
export const RESUME_ENDPOINTS = {
  LIST: `${API_BASE}/resumes`,
  CREATE: `${API_BASE}/resumes`,
  GET_BY_ID: (id: string) => `${API_BASE}/resumes/${id}`,
  UPDATE_BY_ID: (id: string) => `${API_BASE}/resumes/${id}`,
  DELETE_BY_ID: (id: string) => `${API_BASE}/resumes/${id}`,
  COMMENTS: (id: string) => `${API_BASE}/resumes/${id}/comments`,
} as const;

// User endpoints
export const USER_ENDPOINTS = {
  DATA: `${API_BASE}/user/data`,
  SETTINGS: `${API_BASE}/user/settings`,
  DELETE: `${API_BASE}/user/delete`,
} as const;

// Upload endpoints
export const UPLOAD_ENDPOINTS = {
  FILE: `${API_BASE}/upload`,
} as const;

// PDF generation endpoints
export const PDF_ENDPOINTS = {
  GENERATE: `${API_BASE}/generate-pdf`,
  GENERATE_COVER_LETTER: `${API_BASE}/generate-cover-letter-docx`,
  GENERATE_COVER_LETTER_PDF: `${API_BASE}/generate-cover-letter-pdf`,
} as const;

// Import endpoints
export const IMPORT_ENDPOINTS = {
  PDF: `${API_BASE}/import-pdf`,
} as const;

// JD Parser endpoints
export const JD_PARSER_ENDPOINTS = {
  PARSE: `${API_BASE}/jd-parser`,
} as const;

// Locale endpoints
export const LOCALE_ENDPOINTS = {
  LIST: `${API_BASE}/locales`,
  GET_BY_CODE: (code: string) => `${API_BASE}/locales/${code}`,
} as const;

// Cover Letter endpoints
export const COVER_LETTER_ENDPOINTS = {
  GENERATE: `${API_BASE}/cover-letter`,
} as const;

// Frontend routes (for reference)
export const FRONTEND_ROUTES = {
  HOME: '/',
  RESUMES: '/resumes',
  JD_MATCH: '/jd-match',
  COVER_LETTER: '/cover-letter',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  LOCALES: '/locales',
  ADMIN: '/admin',
} as const;