require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const routes = require('./src/routes/index');
const logger = require('./src/utils/logger');

const app = express();
app.use(express.json());
connectDB();
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
