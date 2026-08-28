import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
// @ts-ignore
import type { Contract } from './contract.d';
// @ts-ignore
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
