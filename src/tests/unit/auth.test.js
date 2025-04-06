const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const authController = require('../../controllers/authController');
const config = require('../../config/config');
const { validatePassword } = require('../../utils/passwordValidator');

// Configurar mock para response y request
const mockRequest = (data = {}) => {
  return {
    body: data,
    headers: {
      authorization: data.token ? `Bearer ${data.token}` : undefined
    },
    user: data.user
  };
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let mongoServer;

// Configurar conexión a MongoDB en memoria
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

// Limpiar después de todas las pruebas
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Limpiar colección después de cada prueba
afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth Controller - Register', () => {
  // CP-01: Registro de usuario válido
  test('CP-01: Debería registrar un nuevo usuario correctamente', async () => {
    const req = mockRequest({
      email: 'nuevo@ejemplo.com',
      password: 'Segura123!',
      name: 'Usuario Nuevo'
    });
    const res = mockResponse();
    
    await authController.register(req, res);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        message: 'Usuario registrado correctamente'
      })
    );
    
    // Verificar que el usuario se creó en la BD
    const user = await User.findOne({ email: 'nuevo@ejemplo.com' });
    expect(user).toBeTruthy();
    expect(user.name).toBe('Usuario Nuevo');
    
    // Verificar que la contraseña esté encriptada
    const isPasswordEncrypted = user.password !== 'Segura123!';
    expect(isPasswordEncrypted).toBe(true);
  });
  
  // CP-02: Registro con email duplicado
  test('CP-02: Debería rechazar registro con email duplicado', async () => {
    // Crear usuario primero
    await User.create({
      email: 'duplicado@ejemplo.com',
      password: 'Clave123!',
      name: 'Usuario Duplicado'
    });
    
    // Intentar crear otro con el mismo email
    const req = mockRequest({
      email: 'duplicado@ejemplo.com',
      password: 'OtraClave456!',
      name: 'Otro Usuario'
    });
    const res = mockResponse();
    
    await authController.register(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'El email ya está registrado'
      })
    );
    
    // Verificar que solo existe un usuario con ese email
    const users = await User.find({ email: 'duplicado@ejemplo.com' });
    expect(users.length).toBe(1);
  });
  
  // CP-11: Validación de fortaleza de contraseña
  test('CP-11: Debería rechazar contraseñas débiles', async () => {
    const req = mockRequest({
      email: 'nuevo@ejemplo.com',
      password: '123456',
      name: 'Usuario Nuevo'
    });
    const res = mockResponse();
    
    await authController.register(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'La contraseña no cumple con los requisitos de seguridad'
      })
    );
    
    // Verificar que el usuario no se creó
    const user = await User.findOne({ email: 'nuevo@ejemplo.com' });
    expect(user).toBeFalsy();
  });
});

describe('Auth Controller - Login', () => {
  // CP-03: Login correcto
  test('CP-03: Debería iniciar sesión correctamente', async () => {
    // Crear usuario para prueba
    
    const testUser = new User({
      email: 'jonathan02@gmail.com',
      password: 'ClaveCorrecta123!',
      name: 'Usuario Prueba'
    });
    await testUser.save();

    const req = mockRequest({
      email: 'jonathan02@gmail.com',
      password: 'ClaveCorrecta123!'
    });
    const res = mockResponse();
    
    await authController.login(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: expect.any(String)
      })
    );
    
    // Verificar estructura del token
    const responseData = res.json.mock.calls[0][0];
    const decoded = jwt.verify(responseData.token, config.jwtSecret);
    
    expect(decoded).toMatchObject({
      userId: expect.any(String),
      email: 'jonathan02@gmail.com',
      role: 'user'
    });
  });
  
  // CP-04: Login con credenciales incorrectas
  test('CP-04: Debería rechazar login con contraseña incorrecta', async () => {
    // Crear usuario para prueba
    const testUser = await User.create({
      email: 'usuario@ejemplo.com',
      password: await bcrypt.hash('ClaveCorrecta123!', 10),
      name: 'Usuario Prueba'
    });
    
    const req = mockRequest({
      email: 'usuario@ejemplo.com',
      password: 'ClaveIncorrecta!'
    });
    const res = mockResponse();
    
    await authController.login(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Credenciales incorrectas'
      })
    );
    
    // Verificar que los intentos de login se incrementaron
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.loginAttempts).toBe(1);
  });
  
  // CP-09: Bloqueo de cuenta tras múltiples intentos fallidos
  test('CP-09: Debería bloquear la cuenta tras múltiples intentos fallidos', async () => {
    // Crear usuario para prueba
    const testUser = await User.create({
      email: 'bloqueo@ejemplo.com',
      password: await bcrypt.hash('ClaveCorrecta123!', 10),
      name: 'Usuario Bloqueo',
      loginAttempts: config.maxLoginAttempts - 1 // Ya casi bloqueado
    });
    
    const req = mockRequest({
      email: 'bloqueo@ejemplo.com',
      password: 'ClaveIncorrecta!'
    });
    const res = mockResponse();
    
    // Último intento fallido que debe bloquear la cuenta
    await authController.login(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    
    // Verificar que la cuenta está bloqueada
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.locked).toBe(true);
    expect(updatedUser.loginAttempts).toBe(config.maxLoginAttempts);
    
    // Intentar login con clave correcta en cuenta bloqueada
    const reqWithCorrectPassword = mockRequest({
      email: 'bloqueo@ejemplo.com',
      password: 'ClaveCorrecta123!'
    });
    const resAfterLock = mockResponse();
    
    await authController.login(reqWithCorrectPassword, resAfterLock);
    
    expect(resAfterLock.status).toHaveBeenCalledWith(403);
    expect(resAfterLock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Cuenta bloqueada debido a múltiples intentos fallidos'
      })
    );
  });
});

describe('Auth Controller - Token Operations', () => {
  // CP-07: Renovación de token
  test('CP-07: Debería renovar un token correctamente', async () => {
    const oldToken = jwt.sign(
      { userId: '123456', email: 'user@example.com', role: 'user' },
      config.jwtSecret,
      { expiresIn: config.jwtExpirationTime }
    );
    
    const req = mockRequest({
      token: oldToken,
      user: { userId: '123456', email: 'user@example.com', role: 'user' }
    });
    const res = mockResponse();
    
    await authController.refreshToken(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: expect.any(String)
      })
    );
    
    // Verificar que el token anterior queda en la blacklist
    const isBlacklisted = authController.isTokenBlacklisted(oldToken);
    expect(isBlacklisted).toBe(true);
  });
  
  // CP-10: Revocación de token (logout)
  test('CP-10: Debería invalidar un token al hacer logout', async () => {
    const token = jwt.sign(
      { userId: '123456', email: 'user@example.com', role: 'user' },
      config.jwtSecret,
      { expiresIn: config.jwtExpirationTime }
    );
    
    const req = mockRequest({ token });
    const res = mockResponse();
    
    await authController.logout(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    
    // Verificar que el token está en la blacklist
    const isBlacklisted = authController.isTokenBlacklisted(token);
    expect(isBlacklisted).toBe(true);
  });
});
