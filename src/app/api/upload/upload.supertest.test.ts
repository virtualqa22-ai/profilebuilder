import request from 'supertest';
import { createServer } from 'http';
import next from 'next';
import path from 'path';
import fs from 'fs';

describe('/api/upload POST - File Upload Integration', () => {
  let server: any;
  const app = next({ dev: true, dir: process.cwd() });
  const handle = app.getRequestHandler();

  beforeAll(async () => {
    await app.prepare();
    server = createServer((req, res) => handle(req, res)).listen(4002);
  });
  afterAll(() => {
    server.close();
  });

  it('should upload an image and return a URL', async () => {
    const testImagePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testImagePath, Buffer.from([137,80,78,71,13,10,26,10])); // PNG header
    const res = await request(server)
      .post('/api/upload')
      .attach('file', testImagePath);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toMatch(/\/uploads\//);
    fs.unlinkSync(testImagePath);
  });
});
