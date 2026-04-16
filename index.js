const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const routes = require('./src/routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Connect to MongoDB
connectDB();

// API Routes
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
