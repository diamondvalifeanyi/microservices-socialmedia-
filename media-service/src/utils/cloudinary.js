const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

cloudinary.config({
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            resource_type: "auto",
        },
        (error, result) => {
            if (error) {
                logger.error("Error while uploading mediato cloudinary", error);
                reject(error);
            } else {
                logger.info("uploaded media to clodinary", result.secure_url);
                resolve(result);
            }
        }
    );
    
    uploadStream.end(file.Buffer);
    });
};

const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        logger.info("Media deleted successfully from cloud storage", publicId);
        return result;
    } catch (error) {
        logger.error("error deleting media from cloudinary", error);
        throw error;
    }
};

module.exports = { uploadImage, deleteImage };