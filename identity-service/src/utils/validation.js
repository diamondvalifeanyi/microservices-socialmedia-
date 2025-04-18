const Joi = require('joi');

const validateUser = (data) => {
    const schema = Joi.object({
        username: Joi.string().min(3).max(20).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(5).required(),
    })
    return schema.validate(data);
}

const validateLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(5).required()
    })
    return schema.validate(data);
}

module.exports = { validateUser, validateLogin };