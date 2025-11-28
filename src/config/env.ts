import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SECRET_KEY: process.env.SECRET_KEY || '',
  REAUTH_KEY: process.env.REAUTH_KEY || '',
  REFRESH_KEY: process.env.REFRESH_KEY || '',
};
