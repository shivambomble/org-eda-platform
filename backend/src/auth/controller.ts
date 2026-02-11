import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../db';

const HASURA_GRAPHQL_JWT_SECRET = process.env.JWT_SECRET || 'mysecretkeymustbeatleast32characterslong';

interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  org_id: string;
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user: User = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Construct Hasura JWT Claims
    // Map ADMIN role to org_admin to avoid Hasura's special admin role
    const hasuraRole = user.role === 'ADMIN' ? 'org_admin' : user.role.toLowerCase();
    
    const token = jwt.sign(
      {
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['org_admin', 'analyst', 'user'],
          'x-hasura-default-role': hasuraRole,
          'x-hasura-user-id': user.id,
          'x-hasura-org-id': user.org_id,
        },
      },
      HASURA_GRAPHQL_JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, org_id: user.org_id } });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
