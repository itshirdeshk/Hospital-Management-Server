const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];  // Get the token from Authorization header
    if (!token) {
      return res.status(403).json({ error: 'Token is required' });
    }
  
    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET , (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.user = decoded;  // Attach the decoded token to the request object (contains user info like user ID)
     
      next();
    });
  };

module.exports = {verifyToken}