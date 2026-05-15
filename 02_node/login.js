require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const pool = require("./db");
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Configure bodyParser
app.use(bodyParser.json({ limit: '1000mb' }));
app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.get('/api/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const query = 'SELECT COUNT(*) as count FROM "COMPANY"."T_USERS" WHERE username = $1';
        const result = await pool.query(query, [username]);
        res.json({ available: result.rows[0].count == 0 });
    } catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const query = 'SELECT COUNT(*) as count FROM "COMPANY"."T_USERS" WHERE email = $1';
        const result = await pool.query(query, [email]);
        res.json({ available: result.rows[0].count == 0 });
    } catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create "COMPANY"."T_USERS" table if not exists - SIMPLIFIED VERSION
const initDatabase = async () => {
    try {
        // First, create the schema if it doesn't exist
        await pool.query('CREATE SCHEMA IF NOT EXISTS "COMPANY"');
        
        // Create the table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS "COMPANY"."T_USERS" (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `;
        
        await pool.query(createTableQuery);
        console.log('Table "COMPANY"."T_USERS" created or already exists');
        
        // Create indexes separately
        try {
            await pool.query('CREATE INDEX IF NOT EXISTS idx_t_users_username ON "COMPANY"."T_USERS"(username)');
            console.log('Index idx_t_users_username created or already exists');
        } catch (indexError) {
            console.log('Index idx_t_users_username already exists or could not be created:', indexError.message);
        }
        
        try {
            await pool.query('CREATE INDEX IF NOT EXISTS idx_t_users_email ON "COMPANY"."T_USERS"(email)');
            console.log('Index idx_t_users_email created or already exists');
        } catch (indexError) {
            console.log('Index idx_t_users_email already exists or could not be created:', indexError.message);
        }
        
    } catch (error) {
        console.error('Error initializing database:', error.message);
    }
};

// Initialize database
initDatabase();

// ============================================================================
// NEW ENDPOINT: Insert test user with encrypted password
// ============================================================================
app.post('/api/insert-test-user', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('\n=== INSERT TEST USER STARTED ===');
        console.log('Request:', { username, email, password });
        
        if (!username || !email || !password) {
            return res.status(400).json({ 
                error: 'Username, email, and password are required',
                example: {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'Test1234'
                }
            });
        }
        
        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id, username, email FROM "COMPANY"."T_USERS" WHERE username = $1 OR email = $1',
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            console.log('User already exists:', existingUser.rows[0]);
            return res.status(400).json({
                error: 'User already exists',
                existingUser: existingUser.rows[0]
            });
        }
        
        // Generate bcrypt hash
        console.log('Generating bcrypt hash...');
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);
        
        console.log('Generated hash:', passwordHash);
        console.log('Hash length:', passwordHash.length);
        
        // Insert user into database
        const insertQuery = `
            INSERT INTO "COMPANY"."T_USERS" (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, created_at
        `;
        
        console.log('Executing insert query...');
        const result = await pool.query(insertQuery, [username, email, passwordHash]);
        const newUser = result.rows[0];
        
        console.log('✅ Test user inserted successfully:', newUser);
        
        // Verify the hash can be validated
        console.log('Verifying password hash...');
        const isValid = await bcrypt.compare(password, passwordHash);
        console.log('Password verification:', isValid ? '✅ SUCCESS' : '❌ FAILED');
        
        console.log('=== INSERT TEST USER COMPLETED ===\n');
        
        res.status(201).json({
            success: true,
            message: 'Test user created successfully',
            user: newUser,
            passwordVerification: isValid,
            hash: passwordHash,
            testLogin: {
                username: username,
                password: password
            }
        });
        
    } catch (error) {
        console.error('❌ Error inserting test user:', error.message);
        console.error('Error details:', error);
        
        res.status(500).json({
            error: 'Failed to insert test user',
            details: error.message,
            code: error.code
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Insert multiple test users at once
// ============================================================================
app.post('/api/insert-test-users', async (req, res) => {
    try {
        const users = req.body.users || [
            { username: 'admin', email: 'admin@example.com', password: 'Admin123' },
            { username: 'user1', email: 'user1@example.com', password: 'User1234' },
            { username: 'test', email: 'test@example.com', password: 'Test1234' },
            { username: 'john', email: 'john@example.com', password: 'John1234' },
            { username: 'jane', email: 'jane@example.com', password: 'Jane1234' }
        ];
        
        console.log('\n=== BULK INSERT TEST USERS STARTED ===');
        console.log('Inserting', users.length, 'test users');
        
        const results = [];
        const errors = [];
        
        for (const userData of users) {
            try {
                const { username, email, password } = userData;
                
                console.log(`Processing user: ${username}`);
                
                // Check if user exists
                const existing = await pool.query(
                    'SELECT id FROM "COMPANY"."T_USERS" WHERE username = $1 OR email = $1',
                    [username]
                );
                
                if (existing.rows.length > 0) {
                    console.log(`User ${username} already exists, skipping...`);
                    errors.push({
                        username,
                        error: 'User already exists'
                    });
                    continue;
                }
                
                // Generate hash
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(password, salt);
                
                // Insert user
                const result = await pool.query(
                    `INSERT INTO "COMPANY"."T_USERS" (username, email, password_hash)
                     VALUES ($1, $2, $3)
                     RETURNING id, username, email`,
                    [username, email, passwordHash]
                );
                
                // Verify password
                const isValid = await bcrypt.compare(password, passwordHash);
                
                results.push({
                    success: true,
                    user: result.rows[0],
                    passwordVerified: isValid,
                    password: password,
                    hashPreview: passwordHash.substring(0, 30) + '...'
                });
                
                console.log(`✅ ${username} inserted successfully`);
                
            } catch (userError) {
                console.error(`❌ Error inserting ${userData.username}:`, userError.message);
                errors.push({
                    username: userData.username,
                    error: userError.message
                });
            }
        }
        
        console.log(`=== BULK INSERT COMPLETED ===`);
        console.log(`Success: ${results.length}, Errors: ${errors.length}\n`);
        
        res.json({
            success: true,
            message: `Inserted ${results.length} users, ${errors.length} errors`,
            insertedUsers: results,
            errors: errors,
            total: users.length
        });
        
    } catch (error) {
        console.error('❌ Bulk insert error:', error);
        res.status(500).json({
            error: 'Bulk insert failed',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: View all users (for debugging)
// ============================================================================
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, created_at, last_login FROM "COMPANY"."T_USERS" ORDER BY id'
        );
        
        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ============================================================================
// NEW ENDPOINT: Create specific test user with password "test"
// ============================================================================
app.post('/api/create-test-account', async (req, res) => {
    try {
        const password = 'test';
        const username = 'testaccount';
        const email = 'testaccount@example.com';
        
        console.log('\n=== CREATING TEST ACCOUNT WITH PASSWORD "test" ===');
        
        // Generate hash for password "test"
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        console.log('Generated hash for password "test":', passwordHash);
        
        // Insert or update test account
        const query = `
            INSERT INTO "COMPANY"."T_USERS" (username, email, password_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (username) 
            DO UPDATE SET 
                email = EXCLUDED.email,
                password_hash = EXCLUDED.password_hash,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, username, email, created_at
        `;
        
        const result = await pool.query(query, [username, email, passwordHash]);
        const user = result.rows[0];
        
        // Test the password
        const isValid = await bcrypt.compare('test', passwordHash);
        
        console.log('✅ Test account created/updated:', user.username);
        console.log('Password "test" verification:', isValid ? '✅ SUCCESS' : '❌ FAILED');
        
        res.json({
            success: true,
            message: 'Test account created with password "test"',
            user: user,
            loginTest: {
                username: 'testaccount',
                password: 'test',
                shouldWork: isValid
            },
            hash: passwordHash
        });
        
    } catch (error) {
        console.error('Error creating test account:', error);
        res.status(500).json({
            error: 'Failed to create test account',
            details: error.message
        });
    }
});

// Enhanced registration endpoint
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    console.log('Registration attempt for:', { username, email });
    
    // Validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Password validation
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    try {
        // Check if username already exists
        const usernameCheck = await pool.query(
            'SELECT id FROM "COMPANY"."T_USERS" WHERE username = $1',
            [username]
        );
        if (usernameCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Check if email already exists
        const emailCheck = await pool.query(
            'SELECT id FROM "COMPANY"."T_USERS" WHERE email = $1',
            [email]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const insertQuery = `
            INSERT INTO "COMPANY"."T_USERS" (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, created_at
        `;
        
        const result = await pool.query(insertQuery, [username, email, passwordHash]);
        const user = result.rows[0];

        console.log('User registered successfully:', user.username);

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === '23505') { // PostgreSQL unique violation
            if (error.constraint.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already registered' });
            }
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint with detailed logging
app.post('/api/login', async (req, res) => {
    console.log('\n=== LOGIN ATTEMPT STARTED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { username, password } = req.body;
        
        console.log('Extracted parameters:');
        console.log('- Username/Email:', username);
        console.log('- Password:', password ? '***' + password.slice(-3) : 'undefined');
        
        if (!username || !password) {
            console.log('❌ Missing parameters:', {
                username: !!username,
                password: !!password
            });
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        console.log('🔍 Querying database for user...');
        const query = 'SELECT * FROM "COMPANY"."T_USERS" WHERE username = $1 OR email = $1';
        console.log('SQL Query:', query);
        console.log('Query Parameter:', username);
        
        const result = await pool.query(query, [username]);
        console.log('Database response:', {
            rowCount: result.rows.length,
            rowsFound: result.rows.length > 0 ? 'Yes' : 'No'
        });
        
        if (result.rows.length === 0) {
            console.log('❌ No user found with username/email:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        console.log('👤 User found:', {
            id: user.id,
            username: user.username,
            email: user.email,
            hasPasswordHash: !!user.password_hash,
            hashLength: user.password_hash?.length || 0
        });
        
        // Special handling for password 'test'
        if (password === 'test') {
            console.log('⚠️  Password is "test" - attempting bcrypt comparison');
            
            if (!user.password_hash) {
                console.log('❌ No password hash stored for user');
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Try bcrypt comparison
            const isValidPassword = await bcrypt.compare('test', user.password_hash);
            console.log('bcrypt.compare("test", hash) result:', isValidPassword);
            
            if (isValidPassword) {
                console.log('✅ Password "test" matches stored hash!');
                
                // Update last login
                await pool.query(
                    'UPDATE "COMPANY"."T_USERS" SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                    [user.id]
                );
                
                const responseData = {
                    success: true,
                    message: 'Login successful',
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    },
                    token: 'sample-jwt-token'
                };
                
                console.log('✅ Login successful with password "test"');
                return res.json(responseData);
            } else {
                console.log('❌ Password "test" does NOT match stored hash');
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        
        console.log('🔐 Comparing passwords...');
        console.log('Input password length:', password.length);
        console.log('Stored hash length:', user.password_hash?.length || 'N/A');
        
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        console.log('Password comparison result:', isValidPassword ? '✅ Valid' : '❌ Invalid');
        
        if (!isValidPassword) {
            console.log('❌ Password mismatch for user:', user.username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('🔄 Updating last login timestamp...');
        await pool.query(
            'UPDATE "COMPANY"."T_USERS" SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        console.log('✅ Last login updated');
        
        const responseData = {
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token: 'sample-jwt-token'
        };
        
        console.log('✅ Login successful! Response data:', JSON.stringify(responseData, null, 2));
        console.log('=== LOGIN ATTEMPT COMPLETED ===\n');
        
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Login error details:', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            timestamp: new Date().toISOString()
        });
        console.log('=== LOGIN ATTEMPT FAILED ===\n');
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Login page: http://localhost:${PORT}/login.html`);
    console.log(`Register page: http://localhost:${PORT}/register.html`);
    console.log(`\n=== TEST ENDPOINTS ===`);
    console.log(`Create test user: POST http://localhost:${PORT}/api/insert-test-user`);
    console.log(`Bulk create users: POST http://localhost:${PORT}/api/insert-test-users`);
    console.log(`View all users: GET http://localhost:${PORT}/api/users`);
    console.log(`Create "test" password account: POST http://localhost:${PORT}/api/create-test-account`);
});