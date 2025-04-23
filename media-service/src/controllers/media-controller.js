const Media = require("../models/media");
const { uploadImage } = require("../utils/cloudinary")
const logger = require("../utils/logger");

const uploadMedia = async (req, res) => {
    logger.info('starting media upload');
    try {
        console.log(req.file, "req.file");

        if(!req.file) {
            logger.error("No file found.");
            return res.status(400).json({
                success: false,
                message: "No file found. Pls add a file and try again",
            });
        }

        const { originalname, mimetype, buffer} = req.file;
        const userId = req.user.userId;

        logger.info(`File details: name=${originalname}, type=${mimetype}`);
        logger.info("Uploading to cloudinary strting.....");

        const cloudinaryUploadResult = await uploadImage(req.file);
        logger.info(
            `cloudinary upload successful. Public Id: = ${cloudinaryUploadResult.public_id}`
        );

        const newlyCreatedMedia = newMedia({
            publicId: cloudinaryUploadResult.public_id,
            originalname: originalname,
            mimeType: mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId,
        });

        await newlyCreatedMedia.save();

        res.status(201).json({
            success: true,
            mediaId: newlyCreatedMedia._id,
            url: newlyCreatedMedia.url,
            message: "Media upload successful",
        });
        
    } catch (error) {
        logger.error("Error creating media", error);
        res.status(500).json({
          success: false,
          message: "Error creating media",
        });
    }
}

const getAllMedias = async (req, res) => {
    try {
        const result = await Media.find({userId : req.user.userId});

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cant find any media for this user"
            });
        }
    } catch (error) {
         logger.error("Error fetching medias", error);
         res.status(500).json({
           success: false,
           message: "Error fetching medias",
         });
    }
}

module.exports = { uploadMedia, getAllMedias }