const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/appErrorController');
const authController = require('./controllers/authController');
const userSocketMap = require('./utils/userSocketMap');

const cors = require('cors');
const app = express();

app.use(cors());

// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const categoryRouter = require('./routes/categoryRoutes');
const productRouter = require('./routes/productRoutes');
const couponRouter = require('./routes/couponRoutes');
const cartRouter = require('./routes/cartRoutes');
const delevieryZoneRouter = require('./routes/delevieryZoneRoutes');
const checkoutRouter = require('./routes/checkoutRoutes');
const paymobRouter = require('./routes/paymobRoutes');
const orderRouter = require('./routes/orderRoutes');

app.use(express.json());
// Middleware to parse urlencoded data
app.use(express.urlencoded({ extended: true }));

// Routing
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/category', categoryRouter);
app.use('/api/v1/product', productRouter);
app.use('/api/v1/coupons', couponRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/delevieryZone', delevieryZoneRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/paymob', paymobRouter);
app.use('/api/v1/order', orderRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Couldn't find ${req.originalUrl} on this server!`, 400));
});

// IMPLEMENTING a global error handling middleware
app.use(globalErrorHandler);

// server.js

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION, server is shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true, // that is what i added due to terminal error
  })
  .then(() => console.log('DB is connected...'));

const port = process.env.PORT;
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// io middleware to authenticate the user
io.use(async (socket, next) => {
  try {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      const token = socket.handshake.auth.token;
      await authController.protectSocket(token, socket);
      next(); // Continue if authentication is successful
    } else {
      throw new Error('Authentication error');
    }
  } catch (error) {
    console.log(error);
    next(error); // Pass the error to the error handling middleware
  }
});

// Create the 'admins' room
io.of('/')
  .in('admins')
  .allSockets()
  .then((clients) => {
    console.log(`Admins room clients: ${clients}`);
  });

io.on('connection', (socket) => {
  const userId = socket.user._id;
  const userRole = socket.user.role;

  if (userRole === 'user') userSocketMap.addUserSocket(userId, socket);
  else if (userRole === 'admin') socket.join('admins');

  socket.on('disconnect', () => {
    if (userRole === 'user') userSocketMap.removeUserSocket(userId);
    else if (userRole === 'admin') socket.leave('admins');
  });
});

app.use((req, res, next) => {
  req.io = io; // Attach io to the request object
  next();
});

server.listen(port, `0.0.0.0`, () => {
  console.log(`Server running on port ${port}...`);
});
server.timeout = 120000; // 120 seconds

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION, server is shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

///////////////////////////

module.exports = app;
