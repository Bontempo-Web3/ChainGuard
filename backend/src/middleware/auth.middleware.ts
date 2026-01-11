import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.githubToken) {
    return res.status(401).json({ error: 'Unauthorized. Please login with GitHub.' });
  }
  next();
};
