const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/profile', authenticate, userController.getProfile);
router.get('/admin/users', authenticate, authorize('admin'), userController.listUsers);

module.exports = router;