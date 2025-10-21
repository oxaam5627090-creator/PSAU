import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { userId: payload.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
