const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = 'supersekret_ecommerce_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Get all products (with optional search and category filters)
app.get('/api/products', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get distinct categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL');
    res.json(rows.map(r => r.category));
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'Username or email already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token, user: { username: user.username, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get cart items for logged in user
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const query = `SELECT c.id as cart_id, c.quantity, p.* FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`;
    const [rows] = await db.query(query, [req.user.userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add to cart (user specific)
app.post('/api/cart', authenticateToken, async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ error: 'Product ID is required' });
  try {
    const [existing] = await db.query('SELECT * FROM cart WHERE product_id = ? AND user_id = ?', [productId, req.user.userId]);
    if (existing.length > 0) {
      const newQuantity = existing[0].quantity + (quantity || 1);
      await db.query('UPDATE cart SET quantity = ? WHERE product_id = ? AND user_id = ?', [newQuantity, productId, req.user.userId]);
    } else {
      await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.userId, productId, quantity || 1]);
    }
    res.status(201).json({ message: 'Added to cart successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update cart item quantity
app.put('/api/cart/:id', authenticateToken, async (req, res) => {
  const cartId = req.params.id;
  const { quantity } = req.body;
  if (quantity === undefined || quantity < 1)
    return res.status(400).json({ error: 'Invalid quantity' });
  try {
    const [result] = await db.query('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, cartId, req.user.userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ message: 'Cart updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Remove item from cart
app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
  const cartId = req.params.id;
  try {
    const [result] = await db.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [cartId, req.user.userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
