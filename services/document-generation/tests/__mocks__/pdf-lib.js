module.exports = {
  PDFDocument: {
    create: jest.fn().mockResolvedValue({
      addPage: jest.fn().mockReturnValue({
        drawText: jest.fn(),
        getSize: jest.fn().mockReturnValue({ width: 600, height: 800 }),
      }),
      embedFont: jest.fn().mockResolvedValue({
        // Mock font object
      }),
      save: jest.fn().mockResolvedValue(Buffer.from('pdf content')),
      getPageCount: jest.fn().mockReturnValue(1),
    }),
  },
  rgb: jest.fn(() => [0, 0, 0]),
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'HelveticaBold',
  },
};