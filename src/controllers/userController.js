const User = require('../models/User');

// Obtener perfil del usuario
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(200).json({
      status: 'success',
      user
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener el perfil'
    });
  }
};

// Listar usuarios (solo admin)
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      status: 'success',
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener la lista de usuarios'
    });
  }
};
