const Post = require("../models/Post");
const logger = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");

async function invalidatePostCache(req, input) {
    const cacheKey = 
}
