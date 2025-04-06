const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { isTokenBlacklisted } = require('../controllers/authController');

exports.authenticate = (req, res, next) => {
  try {
    // Verificar header de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Se requiere autenticación'
      });
    }
    
    // Extraer el token
    const token = authHeader.split(' ')[1];
    
    // Verificar si el token ha sido invalidado (logout)
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        status: 'error',
        message: 'Token inválido o expirado'
      });
    }
    
    // Verificar el token
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            status: 'error',
            message: 'Token expirado. Por favor inicie sesión nuevamente'
          });
        }
        
        return res.status(401).json({
          status: 'error',
          message: 'Token inválido'
        });
      }
      
      // Añadir la info del usuario al request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error en la autenticación'
    });
  }
};

// Middleware para verificar roles
exports.authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'No autorizado'
      });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso prohibido: no tiene permisos suficientes'
      });
    }
    
    next();
  };
};