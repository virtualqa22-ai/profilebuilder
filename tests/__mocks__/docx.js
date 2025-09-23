// Mock for docx library used in DOCX generation
const mockDocument = jest.fn().mockImplementation((options) => ({
  sections: options.sections || [{ properties: {}, children: [] }],
}));

const mockPacker = {
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-docx-buffer')),
};

const mockParagraph = jest.fn().mockImplementation((options) => ({
  type: 'paragraph',
  options,
}));

const mockTextRun = jest.fn().mockImplementation((options) => ({
  type: 'textRun',
  options,
}));

const mockTable = jest.fn().mockImplementation((options) => ({
  type: 'table',
  options,
}));

const mockTableCell = jest.fn().mockImplementation((options) => ({
  type: 'tableCell',
  options,
}));

const mockTableRow = jest.fn().mockImplementation((options) => ({
  type: 'tableRow',
  options,
}));

const Document = mockDocument;
const Packer = mockPacker;
const Paragraph = mockParagraph;
const TextRun = mockTextRun;
const Table = mockTable;
const TableCell = mockTableCell;
const TableRow = mockTableRow;

module.exports = {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  AlignmentType: {
    CENTER: 'center',
  },
  WidthType: {
    PERCENTAGE: 'percentage',
  },
};