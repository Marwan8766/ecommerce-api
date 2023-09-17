const userSockets = {};

exports.addUserSocket = (userId, socket) => {
  userSockets[userId] = socket;
};

exports.removeUserSocket = (userId) => {
  delete userSockets[userId];
};

exports.getUserSocket = (userId) => {
  return userSockets[userId];
};
