const express = require('express');
const router = express.Router();
const adminController = require('../../controller/admin/admin.controller');
const authMiddleware = require('../../middlewares/auth');
const adminMiddleware = require('../../middlewares/admin');


// Admin user management routes
router.get('/admins', adminController.getAllAdmins);
router.post('/admins', adminController.createAdmin);
router.get('/admins/:id', adminController.getAdminById);
router.put('/admins/:id', adminController.updateAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);
router.get('/admins/check/exists', adminController.checkAdminExists);

module.exports = router;
