const UserModel = require('../models/userModel');

class SelectController {
    // Get all users
    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAllUsers();
            res.json({
                success: true,
                data: users,
                message: 'Users retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error retrieving users',
                error: error.message
            });
        }
    }

    // Get user by ID
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await UserModel.getUserById(id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user,
                message: 'User retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error retrieving user',
                error: error.message
            });
        }
    }
}

module.exports = SelectController;