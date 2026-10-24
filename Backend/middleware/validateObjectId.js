const mongoose = require('mongoose');

// Reject malformed MongoDB ids with a 400 instead of letting Mongoose throw a CastError (500).
const validateObjectId = (...paramNames) => (req, res, next) => {
  const names = paramNames.length ? paramNames : ['id'];
  for (const name of names) {
    if (req.params[name] !== undefined && !mongoose.Types.ObjectId.isValid(req.params[name])) {
      return res.status(400).json({ message: `Invalid ${name}` });
    }
  }
  next();
};

module.exports = validateObjectId;
