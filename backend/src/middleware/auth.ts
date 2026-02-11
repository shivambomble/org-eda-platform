import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const HASURA_GRAPHQL_JWT_SECRET = process.env.JWT_SECRET || 'mysecretkeymustbeatleast32characterslong';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    org_id: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded: any = jwt.verify(token, HASURA_GRAPHQL_JWT_SECRET);
    const claims = decoded['https://hasura.io/jwt/claims'];
    
    // Map org_admin back to ADMIN for internal use
    const role = claims['x-hasura-default-role'] === 'org_admin' ? 'ADMIN' : claims['x-hasura-default-role'].toUpperCase();
    
    req.user = {
      id: claims['x-hasura-user-id'],
      role: role,
      org_id: claims['x-hasura-org-id']
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};
