import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  // 1. Get token from the Authorization header
  const authHeader = req.headers.authorization;

  // 2. Check if the header exists and is formatted as "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }

  try {
    // 3. Extract the token from the header
    const token = authHeader.split(' ')[1];

    // 4. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid." });
  }
};

export default authMiddleware;