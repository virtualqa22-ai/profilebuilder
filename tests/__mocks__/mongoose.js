const mongoose = {
  connect: jest.fn(() => Promise.resolve(mongoose)),
  connection: {
    readyState: 1,
    on: jest.fn(),
    once: jest.fn(),
  },
  Schema: jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    post: jest.fn(),
  })),
  model: jest.fn(() => class {
    constructor(data) {
      Object.assign(this, data);
      this._id = 'mockId';
    }
    save = jest.fn().mockResolvedValue(this);
    findByIdAndDelete = jest.fn().mockResolvedValue();
    static findById = jest.fn().mockResolvedValue(new (this)());
    static deleteMany = jest.fn().mockResolvedValue();
  }),
  models: {},
};

module.exports = mongoose;
