const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");

async function invalidatePostCache(req, input) {
    const cacheKey = `post:${input}`;
    await req.redisClient.del(cacheKey);

    const keys = await req.redisClient.keys("posts:*");
    if(keys.length > 0) {
        await req.redisClient.del(keys);
    }
}

const createPost = async (req, res) => {
    logger.info("create post endpoint hit .....");
    try {
        // validate the schema
        const { error } = validateCreatePost(req.body);
        if(error) {
            logger.warn("validation error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }
        const { content, mediaIds } = req.body;
        const newlyCreatedPost = new Post({
            user: req.user.userId,
            content,
            mediaIds: mediaIds || [],
        }) ;

        await newlyCreatedPost.save();

        await publishEvent("post.created", {
            postId: newlyCreatedPost._id.toString(),
            userId: newlyCreatedPost.user.toString(),
            content: newlyCreatedPost.content,
            createdAt: newlyCreatedPost.createdAt,
        });

        await invalidatePostCache(req, newlyCreatedPost._id.toString());
        logger.info("Post created successfully", newlyCreatedPost);
        res.status(201).json({
            success: true,
            message: "Post created successfully",
        });
    } catch (error) {
        logger.error("Error creating post", error);
        res.status(500).json({
            success: false,
            message: "Error creating post",
        });
    }
};

const getAllPosts = async (req, res) => {
    logger.info("get all post endpoint hit ...");
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if (cachedPosts) {
            return res.json(JSON.parse(cachedPosts));
        }
            const posts = await Post.find({})
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

            if (posts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No posts found"
                });
            }

            const totalNoOfPosts = await Post.countDocuments();

            const result = {
                posts,
                currentpage: page,
                totalpage: Math.ceil(totalNoOfPosts / limit),
                totalPosts: totalNoOfPosts,
            };

            // save in redis cache
            await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
            res.json(result);
    } catch (error) {
      logger.error("Error fetching all post", error);
      res.status(500).json({
        success: false,
        message: "Error fetching all post",
      });
    }
}

const getPost = async (req, res) => {
    logger.info("getPost end point hit");
    try {
        const postId = req.params.id;
        const cacheKey = `post:${postId}`;
        const cachedPost =await req.redisClient.get(cacheKey);

        if(cachedPost) {
            return res.json(JSON.parse(cachedPost));
        }

        const singlePostDetailsById = await Post.findById(postId);

        if(!singlePostDetailsById) {
            return res.status(404).json({
                message: "Post not found",
                success: false,
            });
        }

        await req.redisClient.setex(
            cachedPost,
            3600,
            JSON.stringify(singlePostDetailsById)
        );
        res.json(singlePostDetailsById);
    } catch (error) {
      logger.error("Error fetching post", error);
      res.status(500).json({
        success: false,
        message: "Error fetching post by id",
      });
    }
}

const deletePost = async (req, res) => {
    logger.info("delete post endpoint hit");
    try {
        const post = await Post.findOneAndDelete({
            _id: req.params.id,
            user: req.user.userId,
        });

        if(!post) {
            return res.status(404).json({
                message: "post not found",
                success: false,
            });
        }

        // publish post delete method to rabbit mq
        await publishEvent("post.deleted", {
            postId: post._id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds,
        });

        await invalidatePostCache(req, req.params.id);
        res.json({
            message: "post deleted successfully",
        });
    } catch (error) {
      logger.error("Error deleting post", error);
      res.status(500).json({
        success: false,
        message: "Error deleting post",
      });
    }
}

module.exports = { createPost, getAllPosts, getPost, deletePost };