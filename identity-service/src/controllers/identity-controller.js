const RefreshTokens = require('../models/refreshToken');
const User = require('../models/user');
const generateTokens = require('../utils/generateToken');
const logger = require('../utils/logger');
const { validateUser, validateLogin } = require('../utils/validation');

const registerUser = async (req, res) => {
    logger.info(" registration endPoint hit........");
    try {
        // validate schema
        const { error } = validateUser(req.body);
        if(error) {
            logger.warn("validation error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { email, password, username} = req.body;

        let user = await User .findOne({ $or: [{email}, {username}] });
        if(user) {
            logger.warn('user already exists');
            res.status(400).json({
                success: false,
                message: "user already exists"
            })
        }

        user = new User ({ username, email, password });
        await user.save();
        logger.warn('user saved successfully', user._id);

        const { accessToken, refreshToken } = await generateTokens(user);

        res.status(201).json({
            success: true,
            message: " user registered successfully!",
            accessToken,
            refreshToken,
        });
    } catch (error) {
        logger.error("registration error occured", error);
        res.status(500).json({
            success: "false",
            message: "Internal server error",
        })
        
    }
}

const loginUser = async (req, res) => {
    logger.info("login endpoint hit.....");
    try{
        const { error } = validateLogin(req.body);
        if( error ) {
            logger.warn('validation error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }
        const { email, password} = req.body;
        const user = await User.findOne({ email });

        if(!user) {
            logger.warn('invalid user');
            return res.status(400).json({
                success: false,
                message: "invalid credentials",
            });
        }

        // user valid password or not
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            logger.warn("invalid password");
                return res.status(400).json({
                    success: false,
                    message: "invalid password",
                });
        }

        const { accessToken, refreshToken} = await generateTokens(user);
        res.json({
            accessToken,
            refreshToken,
            userId: user._id,
        });

    } catch (error) {
        logger.error('login error occured', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// refresh token
const refreshTokenUser = async (req, res) => {
    logger.info('refresh token endpoint hit....');
    try {
        const { refreshToken } = req.body;
        if(!refreshToken) {
            logger.warn('Refresh token missing');
            return res.status(400).json({
                success: false,
                message: " refresh token missing"
            });
        }

        storedToken = await RefreshToken.findOne({ token: refreshToken });
        const storedToken = await RefreshToken.deleteOne({ token: refreshToken });

        if(!storedToken) {
            logger.warn('invalid refresh token provided');
            return res.status(400).json({
                success: false,
                message: 'invalid refresh token',
            });
        }

        if(!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn('invalid or expired refresh token');
            return res.status(400).json({
                success: false,
                message: "invalid or expired refresh token",
            });
        }

        const user = await User.findById(storedToken.user);
        if(!user){
            logger.warn('user not found');
            return res.status(401).json({
                success: false,
                message: "user not found",
            });
        }

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokens(user);

        // delete old refresh token
        await RefreshToken.deleteOne({ _id: storedToken._id });

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        })
    } catch (error) {
         logger.error(" error occured", error);
         res.status(500).json({
           success: false,
           message: "Internal server error",
         });
    }
}

module.exports = { registerUser, loginUser, refreshTokenUser };

