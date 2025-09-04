/** @jest-environment node */

import { POST } from './route';
import { testApiHandler } from 'next-test-api-route-handler';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { getLocaleByCode } from '@/lib/localeService';
import Resume from '@/models/Resume';

// Mock dbConnect to prevent actual database connection during tests
jest.mock('@/lib/dbConnect', () => jest.fn());

// Mock getLocaleByCode to control locale data for tests
jest.mock('@/lib/localeService', () => ({
  getLocaleByCode: jest.fn((localeCode) => {
    if (localeCode === 'en-US') {
      return {
        locale: 'en-US',
        name: 'English (United States)',
        dateFormat: 'MM/DD/YYYY',
        sections: {
          // Add a dummy section to satisfy the validator
          personalInfo: {
            label: 'Personal Info',
            fields: {
              name: { label: 'Name', placeholder: 'Name' },
            },
            order: ['name'],
          },
        },
        optionalFields: {
          photos: { enabled: true, required: false },
          certifications: { enabled: true, required: false },
          hobbies: { enabled: true, required: false },
          references: { enabled: true, required: false },
        },
      };
    } else if (localeCode === 'test-required') {
      return {
        locale: 'test-required',
        name: 'Test Required Locale',
        dateFormat: 'MM/DD/YYYY',
        sections: {
          // Add a dummy section to satisfy the validator
          personalInfo: {
            label: 'Personal Info',
            fields: {
              name: { label: 'Name', placeholder: 'Name' },
            },
            order: ['name'],
          },
        },
        optionalFields: {
          photos: { enabled: true, required: true },
          certifications: { enabled: true, required: true },
          hobbies: { enabled: true, required: true },
          references: { enabled: true, required: true },
        },
      };
    }
    return undefined;
  }),
}));

describe('Resume API POST - Optional Fields Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a resume successfully when optional fields are not provided and not required', async () => {
    jest.spyOn(Resume, 'create').mockResolvedValueOnce({
      title: 'Test Resume',
      content: 'Test Content',
      locale: 'en-US',
      personalInfo: { name: 'Test User' },
    });

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Resume',
            content: 'Test Content',
            locale: 'en-US',
            personalInfo: { name: 'Test User' }, // Add dummy data for validation
          }),
        });
        const jsonResponse = await response.json();

        expect(response.status).toBe(201);
        expect(jsonResponse.success).toBe(true);
        expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test Resume',
          content: 'Test Content',
          locale: 'en-US',
          personalInfo: { name: 'Test User' },
        }));
      },
    });
  });

  it('should create a resume successfully when optional fields are provided', async () => {
    jest.spyOn(Resume, 'create').mockResolvedValueOnce({
      title: 'Test Resume',
      content: 'Test Content',
      locale: 'en-US',
      photos: 'photo_url',
      certifications: 'cert_details',
      hobbies: 'hobby_details',
      references: 'ref_details',
      personalInfo: { name: 'Test User' },
    });

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Resume',
            content: 'Test Content',
            locale: 'en-US',
            photos: 'photo_url',
            certifications: 'cert_details',
            hobbies: 'hobby_details',
            references: 'ref_details',
            personalInfo: { name: 'Test User' }, // Add dummy data for validation
          }),
        });
        const jsonResponse = await response.json();

        expect(response.status).toBe(201);
        expect(jsonResponse.success).toBe(true);
        expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test Resume',
          content: 'Test Content',
          locale: 'en-US',
          photos: 'photo_url',
          certifications: 'cert_details',
          hobbies: 'hobby_details',
          references: 'ref_details',
          personalInfo: { name: 'Test User' },
        }));
      },
    });
  });

  it('should return 400 if required optional fields are missing for a specific locale', async () => {
    jest.spyOn(Resume, 'create'); // Spy on create to ensure it's not called

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Resume',
            content: 'Test Content',
            locale: 'test-required',
            personalInfo: { name: 'Test User' }, // Add dummy data for validation
          }),
        });
        const jsonResponse = await response.json();

        expect(response.status).toBe(400);
        expect(jsonResponse.success).toBe(false);
        expect(jsonResponse.errors).toEqual({
          photos: 'Photos is required for this locale.',
          certifications: 'Certifications is required for this locale.',
          hobbies: 'Hobbies is required for this locale.',
          references: 'References is required for this locale.',
        });
        expect(Resume.create).not.toHaveBeenCalled();
      },
    });
  });

  it('should create a resume successfully when all required optional fields are provided for a specific locale', async () => {
    jest.spyOn(Resume, 'create').mockResolvedValueOnce({
      title: 'Test Resume',
      content: 'Test Content',
      locale: 'test-required',
      photos: 'photo_url',
      certifications: 'cert_details',
      hobbies: 'hobby_details',
      references: 'ref_details',
      personalInfo: { name: 'Test User' },
    });

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Resume',
            content: 'Test Content',
            locale: 'test-required',
            photos: 'photo_url',
            certifications: 'cert_details',
            hobbies: 'hobby_details',
            references: 'ref_details',
            personalInfo: { name: 'Test User' }, // Add dummy data for validation
          }),
        });
        const jsonResponse = await response.json();

        expect(response.status).toBe(201);
        expect(jsonResponse.success).toBe(true);
        expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test Resume',
          content: 'Test Content',
          locale: 'test-required',
          photos: 'photo_url',
          certifications: 'cert_details',
          hobbies: 'hobby_details',
          references: 'ref_details',
          personalInfo: { name: 'Test User' },
        }));
      },
    });
  });
});
