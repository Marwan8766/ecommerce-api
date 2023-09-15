const express = require('express');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/appErrorController');

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

module.exports = app;
