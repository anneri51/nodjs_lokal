const UserModel = require('../models/userModel');

class DeleteController {
    // Delete user by ID
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Check if user exists
            const existingUser = await UserModel.getUserById(id);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const affectedRows = await UserModel.deleteUser(id);

            if (affectedRows > 0) {
                res.json({
                    success: true,
                    message: 'User deleted successfully',
                    deletedUser: existingUser
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'User deletion failed'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting user',
                error: error.message
            });
        }
    }
}

module.exports = DeleteController;