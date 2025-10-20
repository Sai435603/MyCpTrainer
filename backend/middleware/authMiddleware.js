import jwt from 'jsonwebtoken';

export default function(req, res, next) {
  // 1. Get token from the cookie
  const token = req.cookies.token;

  // 2. Check if not token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // 3. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};