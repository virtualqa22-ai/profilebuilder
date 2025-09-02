/**
 * @jest-environment node
 */

import { POST } from './route';

describe('POST /api/jd-parser', () => {
  it('should return a list of keywords', async () => {
    const req = {
      json: async () => ({ text: 'This is a test job description with some keywords like javascript and react' }),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.keywords).toEqual(['this', 'test', 'job', 'description', 'with', 'some', 'keywords', 'like', 'javascript', 'react']);
  });

  it('should return a 400 error if no text is provided', async () => {
    const req = {
      json: async () => ({ text: '' }),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('No text provided');
  });
});
