const UserModel = require('../models/userModel');

class InsertController {
    // Create new user
    static async createUser(req, res) {
        try {
            const { name, email, age } = req.body;

            // Basic validation
            if (!name || !email || !age) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, and age are required'
                });
            }

            const newUser = await UserModel.createUser({ name, email, age });
            
            res.status(201).json({
                success: true,
                data: newUser,
                message: 'User created successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating user',
                error: error.message
            });
        }
    }
}

module.exports = InsertController;