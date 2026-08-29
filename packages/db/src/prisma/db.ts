import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
// @ts-expect-error - contract.d types not yet generated
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});

export const Batch = db.orm.public.Batch;
export const BatchUrl = db.orm.public.BatchUrl;
