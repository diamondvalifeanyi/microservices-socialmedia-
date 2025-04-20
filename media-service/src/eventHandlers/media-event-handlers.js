const Media = require("../models/media");
const { deleteImage } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
    console.log(event, "event in post deleted handler");
    const { postId, mediaIds } = event;
    try {
        const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

        for (const media of mediaToDelete) {
            await deleteImage(media.publicId);
            await Media.findByIdAndDelete(media._id);

            logger.info(
                `deleted media ${media._id} associated with this deleted post ${postId}`
            );
        }
        logger.info(`processed deletion of media for post id ${postId}`);
    } catch (error) {
        logger.error(error, "error occured while deleting media");
    }
};

module.exports = { handlePostDeleted };