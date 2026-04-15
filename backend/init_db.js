const mysql = require('mysql2/promise');

const host = 'localhost';
const port = 3307;
const user = 'root';
const password = 'arun2005';
const database = 'ecommerce_db';

const sampleProducts = [
    {
        name: 'Premium Wireless Headphones',
        description: 'High-fidelity audio with active noise cancellation and 30-hour battery life.',
        price: 299.99,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60',
        category: 'Audio'
    },
    {
        name: 'Minimalist Smartwatch',
        description: 'Sleek design with heart rate monitoring, sleep tracking, and notifications.',
        price: 199.50,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60',
        category: 'Wearables'
    },
    {
        name: 'Ergonomic Mechanical Keyboard',
        description: 'Customizable RGB backlighting and tactile switches for perfect typing.',
        price: 149.00,
        image_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=60',
        category: 'Accessories'
    },
    {
        name: 'Ultra-slim Power Bank',
        description: '10000mAh capacity in a pocket-sized form factor with fast charging.',
        price: 49.99,
        image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=60',
        category: 'Accessories'
    },
    {
        name: '4K Action Camera',
        description: 'Waterproof stabilization camera for capturing your adventures.',
        price: 249.95,
        image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=60',
        category: 'Cameras'
    },
    {
        name: 'Smart Home Speaker',
        description: 'Voice-controlled assistant with premium room-filling sound.',
        price: 129.00,
        image_url: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800&auto=format&fit=crop&q=60',
        category: 'Audio'
    }
];

async function initializeDatabase() {
    let connection;
    try {
        console.log('Connecting to MySQL server...');
        connection = await mysql.createConnection({ host, port, user, password });
        
        console.log(`Creating database '${database}' if not exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${database}`);
        
        await connection.query(`USE ${database}`);

        console.log('Creating `users` table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating `products` table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                image_url VARCHAR(500),
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating `cart` table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cart (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        // Check if products already exist
        const [existing] = await connection.query('SELECT COUNT(*) as count FROM products');
        
        if (existing[0].count === 0) {
            console.log('Seeding initial products with categories...');
            const insertQuery = `INSERT INTO products (name, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)`;
            for (const p of sampleProducts) {
                await connection.query(insertQuery, [p.name, p.description, p.price, p.image_url, p.category]);
            }
            console.log('Sample products seeded.');
        } else {
            // Upgrade existing DB to have categories safely if missing
            try {
                await connection.query('ALTER TABLE products ADD COLUMN category VARCHAR(100) DEFAULT "Uncategorized"');
                console.log('Added category column to existing products table.');
                
                // Try updating categories for existing samples
                for (const p of sampleProducts) {
                    await connection.query('UPDATE products SET category = ? WHERE name = ?', [p.category, p.name]);
                }
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                   console.log('Category column already exists.');
                } else {
                   console.error('Migration notice:', e.message);
                }
            }
            console.log('Products already exist, checked category schema.');
        }

        console.log('Database initialization completed successfully!');
        
    } catch (error) {
        console.error('--------------------------------------------------');
        console.error('Error initializing database! MySQL Connection failed.');
        console.error('Did you create the user "arun" with password "arun2005"?');
        console.error('Please open MySQL Workbench, login as root, and run:');
        console.error("CREATE USER IF NOT EXISTS 'arun'@'localhost' IDENTIFIED BY 'arun2005';");
        console.error("GRANT ALL PRIVILEGES ON *.* TO 'arun'@'localhost';");
        console.error("FLUSH PRIVILEGES;");
        console.error('--------------------------------------------------');
        console.error('Details:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Connection closed.');
        }
    }
}

initializeDatabase();
