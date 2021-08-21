const httpStatus = require('http-status');
const { User } = require('../shared/models');
const { UserRepository } = require('../shared/repositories');
const ApiError = require('../shared/utils/ApiError');
const { s3 } = require('../config/s3');
const config = require('../config/config');
const logger = require('../shared/config/logger');

/**
 * Update user by cognito id
 * @param {ObjectId} cognitoId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserByCognitoId = async (cognitoId, { name }) => {
  const user = await UserRepository.findOneByCognitoId(cognitoId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  Object.assign(user, { name });
  const userToUpdate = new User();
  userToUpdate.name = name;
  await UserRepository.save(user.userId, userToUpdate);
  return user;
};

const removeOldImage = (imageKey) => {
  s3.deleteObject(
    {
      Bucket: config.aws.bucket,
      Key: imageKey,
    },
    function (err) {
      if (err) {
        logger.error(`Can not delete: ${imageKey}`);
        logger.error(`${err}`);
      }
    }
  );
};

/**
 * Upload an avatar image
 * @param {String} cognitoId
 * @param {File} file
 * @returns {Promise<String>}
 */
const uploadAvatarImage = async (cognitoId, file) => {
  const user = await UserRepository.findOneByCognitoId(cognitoId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const oldImageKey = user.profilePictureKey;
  const profilePictureKey = file.key;
  Object.assign(user, { profilePictureKey });
  const userToUpdate = new User();
  userToUpdate.profilePictureKey = profilePictureKey;
  await UserRepository.save(user.userId, userToUpdate);
  removeOldImage(oldImageKey);
  return user;
};

module.exports = {
  updateUserByCognitoId,
  uploadAvatarImage,
};
