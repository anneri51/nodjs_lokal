const UserModel = require('../models/userModel');

class UpdateController {
    // Update user by ID
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, age } = req.body;

            // Check if user exists
            const existingUser = await UserModel.getUserById(id);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const affectedRows = await UserModel.updateUser(id, {
                name: name || existingUser.name,
                email: email || existingUser.email,
                age: age || existingUser.age
            });

            if (affectedRows > 0) {
                const updatedUser = await UserModel.getUserById(id);
                res.json({
                    success: true,
                    data: updatedUser,
                    message: 'User updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'User update failed'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating user',
                error: error.message
            });
        }
    }
}

module.exports = UpdateController;