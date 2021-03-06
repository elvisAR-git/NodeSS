const Joi = require("joi");

function validateUser(user) {
  const schema = {
    username: Joi.string().min(5).max(50).required(),
    email: Joi.string().min(5).max(255).email(),
    password: Joi.string().min(8).max(255).required(),
  };
  return Joi.validate(user, schema);
}
module.exports.validate = validateUser;
