const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { validatePassword } = require('../utils/passwordValidator');

// Token blacklist para tokens invalidados (logout)
const tokenBlacklist = new Set();

// Registrar un nuevo usuario
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'El email ya está registrado'
      });
    }
    
    // Validar la fortaleza de la contraseña
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'La contraseña no cumple con los requisitos de seguridad',
        errors: passwordValidation.errors
      });
    }
    
    // Crear el nuevo usuario
    const user = new User({ email, password, name });
    await user.save();
    
    // En un sistema real, aquí enviaríamos un correo de bienvenida
    
    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado correctamente',
      userId: user._id
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al registrar el usuario'
    });
  }
};

// Login de usuario
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Buscar el usuario por email
    const user = await User.findOne({ email });
    
    // Si no existe el usuario
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales incorrectas'
      });
    }
    
    // Verificar si la cuenta está bloqueada
    if (user.locked) {
      return res.status(403).json({
        status: 'error',
        message: 'Cuenta bloqueada debido a múltiples intentos fallidos'
      });
    }
    
    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      // Incrementar intentos fallidos
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales incorrectas'
      });
    }
    
    // Resetear intentos de login si son exitosos
    await user.resetLoginAttempts();
    
    // Generar token JWT
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };
    
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpirationTime
    });
    
    return res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al iniciar sesión'
    });
  }
};

// Refrescar token
exports.refreshToken = async (req, res) => {
  try {
    const { userId, email, role } = req.user;
    
    // Generar nuevo token
    const newToken = jwt.sign(
      { userId, email, role },
      config.jwtSecret,
      { expiresIn: config.jwtExpirationTime }
    );
    
    // Añadir el token actual a la blacklist (corrigiendo el error encontrado en las pruebas)
    const token = req.headers.authorization.split(' ')[1];
    tokenBlacklist.add(token);
    
    return res.status(200).json({
      status: 'success',
      token: newToken
    });
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al refrescar el token'
    });
  }
};

// Logout (invalidar token)
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    tokenBlacklist.add(token);
    
    return res.status(200).json({
      status: 'success',
      message: 'Sesión cerrada correctamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cerrar sesión'
    });
  }
};

// Verificar si un token está en la blacklist
exports.isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};
