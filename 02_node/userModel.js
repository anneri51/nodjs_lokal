const pool = require('../config/database');

class UserModel {
    // SELECT operations
    static async getAllUsers() {
        const [rows] = await pool.execute('SELECT * FROM users');
        return rows;
    }

    static async getUserById(id) {
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    // INSERT operations
    static async createUser(userData) {
        const { name, email, age } = userData;
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
            [name, email, age]
        );
        return { id: result.insertId, ...userData };
    }

    // UPDATE operations
    static async updateUser(id, userData) {
        const { name, email, age } = userData;
        const [result] = await pool.execute(
            'UPDATE users SET name = ?, email = ?, age = ? WHERE id = ?',
            [name, email, age, id]
        );
        return result.affectedRows;
    }

    // DELETE operations
    static async deleteUser(id) {
        const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = UserModel;