import { resolve } from 'node:path';
import { config } from 'dotenv';

// Resolve from this file so source, compiled code, and the migration CLI agree.
config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
