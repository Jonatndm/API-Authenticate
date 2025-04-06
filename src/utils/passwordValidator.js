const config = require('../config/config');

const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < config.passwordMinLength) {
    errors.push(`La contraseña debe tener al menos ${config.passwordMinLength} caracteres`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe incluir al menos una letra mayúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe incluir al menos una letra minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe incluir al menos un número');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('La contraseña debe incluir al menos un carácter especial');
  }
  
  if (password.toLowerCase().includes('password')) {
    errors.push('La contraseña no puede contener la palabra "password"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = { validatePassword };