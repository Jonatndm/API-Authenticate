const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const userController = require('../../controllers/userController');
const { authenticate, authorize } = require('../../middleware/authMiddleware');
const config = require('../../config/config');

// Configurar mock para response y request
const mockRequest = (data = {}) => {
  return {
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

const mockNext = jest.fn();

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
  jest.clearAllMocks();
});

describe('User Controller', () => {
  // CP-05: Acceso a recurso protegido con token válido
  test('CP-05: Debería permitir acceso a perfil con token válido', async () => {
    // Crear usuario
    const user = await User.create({
      email: 'usuario@ejemplo.com',
      password: 'Segura123!',
      name: 'Usuario Test'
    });
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: 'user' },
      config.jwtSecret
    );
    
    const req = mockRequest({
      token,
      user: { userId: user._id, email: user.email, role: 'user' }
    });
    const res = mockResponse();
    
    await userController.getProfile(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        user: expect.objectContaining({
          email: 'usuario@ejemplo.com',
          name: 'Usuario Test'
        })
      })
    );
  });
  
  // CP-06: Acceso a recurso protegido sin token
  test('CP-06: Debería denegar acceso sin token', async () => {
    const req = mockRequest({});
    const res = mockResponse();
    
    authenticate(req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Se requiere autenticación'
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
  
  // CP-08: Validación de permisos por rol
  test('CP-08: Debería validar permisos según rol', async () => {
    // Crear usuario con rol básico
    const basicUser = await User.create({
      email: 'basic@ejemplo.com',
      password: 'Basic123!',
      name: 'Usuario Básico',
      role: 'user'
    });
    
    // Crear usuario con rol admin
    const adminUser = await User.create({
      email: 'admin@ejemplo.com',
      password: 'Admin123!',
      name: 'Usuario Admin',
      role: 'admin'
    });
  })
})
