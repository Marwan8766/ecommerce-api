const sendMail = require('../utils/email');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');
const User = require('../models/userModel');
const Token = require('../models/token.model');
const blacklistToken = require('../models/blackListToken.model');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

async function logoutUser(user) {
  const tokens = await Token.find({ userId: user._id });

  if (tokens.length > 0) {
    const blackListTokens = tokens.map((token) => ({
      token: token.token,
      expiresAt: Number(token.expiresAt),
    }));

    const createdTokens = await blacklistToken.insertMany(blackListTokens);

    if (createdTokens.length !== blackListTokens.length) {
      throw new Error('Error while logging out');
    }

    const deletedTokens = await Token.deleteMany({ userId: user._id });

    if (deletedTokens.deletedCount !== tokens.length) {
      throw new Error('Error while logging out');
    }
  }
}

const createEmailConfirmOtpOptionsObj = (userEmail, otp) => {
  const html = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        h1 {
          color: #0066cc;
          font-size: 24px;
          margin-bottom: 16px;
        }

        p {
          font-size: 16px;
          line-height: 1.5;
          color: #333333;
          margin-bottom: 24px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Use this OTP to confirm your email</h1>
        <p>Your OTP: ${otp}</p>
      </div>
    </body>
  </html>
`;

  return (optionsObj = {
    email: userEmail,
    subject: 'Your Email Confirmation OTP (Valid for 10 minutes)',
    html,
  });
};

const createSendOtpEmail = async (user) => {
  try {
    // create token to be sent by email
    const otp = user.createEmailConfirmtOtp();
    const updatedNewUser = await user.save({ validateModifiedOnly: true });

    if (!updatedNewUser)
      return next(new AppError('Error signing you up please try again', 500));

    // SEND the otp to users's email
    const optionsObj = createEmailConfirmOtpOptionsObj(
      updatedNewUser.email,
      otp
    );

    await sendMail(optionsObj);
  } catch (err) {
    console.error(`Error creating or sending the OTP Email, ${err}`);
  }
};

exports.preSignup = catchAsync(async (req, res, next) => {
  // check if user already exists
  const userExist = await User.findOne({ email: req.body.email }).select(
    '+emailConfirmed'
  );

  if (!userExist) return next();

  // check if email is confirmed
  if (userExist.emailConfirmed === true)
    return next(new AppError('This email already exists', 400));
  // check if emailConfirmationToken is valid
  if (userExist.emailConfirmOtpExpires > Date.now())
    return next(
      new AppError(
        'Use the OTP that was sent to your Email to verify your Email',
        400
      )
    );
  if (userExist.emailConfirmOtpExpires < Date.now()) {
    // resend the otp
    await createSendOtpEmail(userExist);

    // return res that a new otp was sent
    res.status(200).json({
      status: 'success',
      message: 'Your email confirm OTP has been sent to your email',
    });
  }
});

exports.signup = catchAsync(async (req, res, next) => {
  // save user data
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    contact: req.body.phone,
    address: req.body.address,
    role: req.body.role === 'admin' ? 'user' : req.body.role,
  });

  await createSendOtpEmail(newUser);

  res.status(200).json({
    status: 'success',
    message: 'Your email confirmation token has been sent to the email',
  });
});

exports.confirmEmail = catchAsync(async (req, res, next) => {
  const { otp, email } = req.body;
  // encrypt token sent by email
  let hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  // find the user that has this token
  const user = await User.findOne({
    email,
  }).select('+emailConfirmed');

  if (!user)
    return next(
      new AppError("This Email doesn't exist, Please Signup first", 404)
    );

  if (user.emailConfirmOtp !== hashedOtp)
    return next(new AppError('Invalid OTP', 400));

  if (user.emailConfirmOtpExpires < Date.now())
    return next(
      new AppError(
        'Your OTP has expired, Please click resend to resend a new OTP to your Email',
        400
      )
    );

  // confirm user's email
  user.emailConfirmed = true;
  user.emailConfirmOtp = undefined;
  user.emailConfirmOtpExpires = undefined;
  await user.save({ validateModifiedOnly: true });

  const token = signToken(user._id);

  const expirationTime =
    Date.now() + parseInt(process.env.JWT_EXPIRES_IN) * 1000; // Expiration time based on JWT_EXPIRES_IN value in seconds

  const tokenDocument = await Token.create({
    userId: user._id,
    token,
    expiresAt: expirationTime,
  });
  if (!tokenDocument)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    state: 'success',
    message: 'Your email has been successfully confirmed',
    token,
  });
});

exports.resendEmailConfirmOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // find the user check that at least 10 minutes have passed since last otp was send
  const user = await User.findOne({
    email,
    emailConfirmOtpExpires: { $lt: Date.now() },
  });

  // if no user found return error
  if (!user) return next(new AppError("Your OTP hasn't expired yet", 400));

  // send create and send new otp
  await createSendOtpEmail(user);

  // send success res
  res.status(200).json({
    status: 'success',
    message: 'Your email confirmation token has been sent to the email',
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // check if email and password exists
  if (!email || !password)
    return next(
      new AppError('Please provide us with your email and password', 400)
    );
  // check if user exist and password is correct
  // we need the password to check if it is the same but findOne won't find it because
  // we set select: false so we use select('+password)
  const user = await User.findOne({ email })
    .select('+password')
    .select('+emailConfirmed');

  if (!user || !(await user.correctPassword(password)))
    return next(new AppError('Incorrect email or password', 401));

  if (!user.emailConfirmed)
    return next(new AppError('Please confirm your email first'));

  // if everything is ok send token to client
  const token = signToken(user._id);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const expiresAt = decoded.exp;
  const tokenDocument = await Token.create({
    userId: user._id,
    token,
    expiresAt,
  });
  if (!tokenDocument)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  const user = req.user;
  try {
    await logoutUser(user);

    res.status(200).json({
      status: 'success',
      message: 'logged out successfully',
    });
  } catch (error) {
    // Handle error
    console.error(error);
    return next(new AppError('Something went wrong while logging out', 500));
  }
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // GET user based on POSTed email
  const user = await User.findOne({
    email: req.body.email,
    emailConfirmed: true,
  });
  if (!user) return next(new AppError('There is no user with this email'), 404);

  // GENERATE the random reset otp
  await createSendOtpEmail(user);

  res.status(200).json({
    status: 'success',
    message: 'Your reset OTP has been sent to your email',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { otp, email, password, passwordConfirm } = req.body;

  console.log(`otp: ${otp}`);
  console.log(`email: ${email}`);
  console.log(`email len: ${email.length}`);
  console.log(`password: ${password}`);
  console.log(`passwordConfirm: ${passwordConfirm}`);
  // GET user based on the token
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  // find the user that has this token
  const user = await User.findOne({
    emailConfirmOtp: hashedOtp,
    email,
  }).select('+emailConfirmed');

  if (!user)
    return next(
      new AppError("This Email doesn't exist, Please Signup first", 404)
    );

  if (user.emailConfirmOtpExpires < Date.now())
    return next(
      new AppError(
        'Your OTP has expired, Please click resend to resend a new OTP to your Email',
        400
      )
    );

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.emailConfirmOtp = undefined;
  user.emailConfirmOtpExpires = undefined;

  // add all tokens associated with that user to black list

  try {
    await logoutUser(user);
  } catch (error) {
    // Handle error
    console.error(error);
    return next(new AppError('Something went wrong while logging out', 500));
  }

  // UPDATE passwordChangedAt
  const updatedUser = await user.save({ validateModifiedOnly: true });

  if (!updatedUser)
    return next(new AppError('Error updating the password', 500));

  // LOGIN the user, send jwt
  const token = signToken(user._id);

  const expirationTime =
    Date.now() + parseInt(process.env.JWT_EXPIRES_IN) * 1000; // Expiration time based on JWT_EXPIRES_IN value in seconds

  const tokenDocument = await Token.create({
    userId: user._id,
    token,
    expiresAt: expirationTime,
  });
  if (!tokenDocument)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  // 1) Get user from collection
  const user = await User.findById(req.user._id).select('+password');

  if (!user) return next(new AppError("This user doesn't exist", 404));

  // 2) check if POSTed current password is correct

  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('your current password is wrong', 401));
  }
  // add all tokens associated with that user to black list

  try {
    await logoutUser(user);
  } catch (error) {
    // Handle error
    console.error(error);
    return next(new AppError('Something went wrong while logging out', 500));
  }

  // 3) if so, update password
  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  await user.save({ validateModifiedOnly: true });

  // 4) log user in, send jwt
  // createSendToken(user, 200, res);
  const token = signToken(user._id);
  const expirationTime =
    Date.now() + parseInt(process.env.JWT_EXPIRES_IN) * 1000; // Expiration time based on JWT_EXPIRES_IN value in seconds

  const tokenDocument = await Token.create({
    userId: user._id,
    token,
    expiresAt: expirationTime,
  });
  if (!tokenDocument)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    status: 'success',
    message: 'Your Password has been updated successfully',
    token,
  });
});

// exports.deleteAccount = catchAsync(async (req, res, next) => {
//   if (!req.body.password) next(new AppError('Please enter your password', 401));
//   const user = await User.findOne({ email: req.user.email }).select(
//     '+password'
//   );
//   if (!(await user.correctPassword(req.body.password)))
//     return next(new AppError('Incorrect password', 401));

//   await User.findByIdAndUpdate(user._id, {
//     $set: { active: false },
//     emailConfirmed: false,
//   });

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

// exports.reActivateAccount = catchAsync(async (req, res, next) => {
//   // update the account active to be true to be able to find the user
//   await User.updateOne({ email: req.body.email }, { $set: { active: true } });
//   // find the user
//   const user = await User.findOne({ email: req.body.email })
//     .select('+password')
//     .select('+emailConfirmed');
//   // check if password is correct if not make the acc inactive again
//   if (!(await user.correctPassword(req.body.password))) {
//     await User.updateOne(
//       { email: req.body.email },
//       { $set: { active: false } },
//       { emailConfirmed: true }
//     );
//     return next(new AppError('Incorrect email or password'), 401);
//   }
//   // login the user
//   const token = signToken(user._id);

//   res.status(200).json({
//     status: 'success',
//     message: 'Your Account reactivated successfully',
//     data: {
//       token,
//     },
//   });
// });

exports.protect = catchAsync(async (req, res, next) => {
  // get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  )
    token = req.headers.authorization.split(' ')[1];
  // else if (req.cookies.jwt) token = req.cookies.jwt;

  if (!token)
    return next(new AppError("You aren't logged in, please login first", 401));
  // verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // check if the user still exists
  const currentUser = await User.findById(decoded.id).select('+emailConfirmed');
  if (!currentUser)
    return next(new AppError('This user does no longer exist'), 401);

  console.log(`user emailConfirmed: ${currentUser.emailConfirmed}`);
  console.log(`user role: ${currentUser.role}`);
  // check if user confirmed his email
  if (!currentUser.emailConfirmed)
    return next(new AppError('You must confirm your email first', 403));

  // check if the user has chamged his password after the token was issued
  if (
    currentUser.passwordHasChanged(decoded.iat, currentUser.passwordChangedAt)
  )
    return next(
      new AppError('Your password has changed, please login again', 401)
    );

  // check if the token is in the black list tokens
  const tokenBlackListed = await blacklistToken.findOne({ token });
  if (tokenBlackListed)
    return next(
      new AppError('Your session has expired, please login again', 401)
    );

  req.user = currentUser;
  // Grant access to the protected route
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You don't have permission to perform this action", 403)
      );
    next();
  };
