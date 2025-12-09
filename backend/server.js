const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const usersRouter = require('./routes/usersRoutes');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const docRoutes = require('./routes/docRoutes');
const checkInactiveUsers = require('./middlewares/checkInactiveUsers');
const usersController = require('./controllers/usersController');


require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;



// Import models
const Topic = require('./models/topicModels');
const Document = require('./models/documentModels');

// console.log(GenerateToken({userid:1,useremail:'praveenkumar@gamil.com'}))

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/users', usersRouter);
app.use('/api/auth', authRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/docs', docRoutes);

// Run inactive user check every day
setInterval(checkInactiveUsers, 24 * 60 * 60 * 1000);
checkInactiveUsers().catch(console.error); // Run immediately on startup

// Run token cleanup every 6 hours
setInterval(() => {
  usersController.cleanupRevokedTokens(24); // Clean tokens older than 24 hours
}, 6 * 60 * 60 * 1000);

// Error handling middleware
app.use(errorHandler);

// Test database connection and sync models
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Set up associations
    const models = { Topic, Document };
    Object.keys(models).forEach(modelName => {
      if (models[modelName].associate) {
        models[modelName].associate(models);
      }
    });

    await sequelize.sync({ force: false });
    console.log('Database synchronized with associations');

    // Initialize core admin after database sync
    await usersController.initializeSuperAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err.message);
    process.exit(1);
  }
};

startServer();