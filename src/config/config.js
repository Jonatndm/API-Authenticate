const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro',
  jwtExpirationTime: '1h',
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/auth_api',
  maxLoginAttempts: 5,
  passwordMinLength: 8
};


module.exports = config;