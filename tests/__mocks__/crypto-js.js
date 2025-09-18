const CryptoJS = {
  AES: {
    encrypt: jest.fn(() => 'encrypted'),
    decrypt: jest.fn(() => ({ toString: jest.fn(() => 'decrypted') })),
  },
  enc: {
    Utf8: 'utf8',
  },
};

module.exports = CryptoJS;
