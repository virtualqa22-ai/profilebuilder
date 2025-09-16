
import { POST, GET } from './route';
import { NextResponse } from 'next/server';

// Mock NextResponse to allow testing of API routes
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Headers(init?.headers),
    })),
  },
}));

describe('Cover Letter API Route', () => {
  it('GET should return a list of templates', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('templates');
    expect(Array.isArray(data.templates)).toBe(true);
    expect(data.templates.length).toBeGreaterThan(0);
  });

  it('POST should initiate cover letter generation (placeholder)', async () => {
    const mockRequest = {
      json: () => Promise.resolve({ coverLetterContent: 'Test content' }),
    } as Request;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Cover letter generation initiated (placeholder)');
  });
});
