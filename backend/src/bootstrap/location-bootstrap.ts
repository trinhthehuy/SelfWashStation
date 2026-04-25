import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';

type ProvinceSeed = {
  id: number;
  province_name: string;
  province_code: string;
};

type WardSeed = {
  ward_name: string;
  ward_code: string;
  ward_type: string;
  province_id: number;
};

const PROVINCE_SEEDS: ProvinceSeed[] = [
  { id: 1, province_name: 'Ha Noi', province_code: 'HN' },
  { id: 2, province_name: 'Bac Ninh', province_code: 'BN' },
  { id: 3, province_name: 'Quang Ninh', province_code: 'QH' },
  { id: 4, province_name: 'Hai Phong', province_code: 'HP' },
  { id: 5, province_name: 'Hung Yen', province_code: 'HY' },
  { id: 6, province_name: 'Ninh Binh', province_code: 'NB' },
  { id: 7, province_name: 'Cao Bang', province_code: 'CB' },
  { id: 8, province_name: 'Tuyen Quang', province_code: 'TQ' },
  { id: 9, province_name: 'Lao Cai', province_code: 'LI' },
  { id: 10, province_name: 'Thai Nguyen', province_code: 'TN' },
  { id: 11, province_name: 'Lang Son', province_code: 'LS' },
  { id: 12, province_name: 'Phu Tho', province_code: 'PT' },
  { id: 13, province_name: 'Dien Bien', province_code: 'DB' },
  { id: 14, province_name: 'Lai Chau', province_code: 'LU' },
  { id: 15, province_name: 'Son La', province_code: 'SL' },
  { id: 16, province_name: 'Thanh Hoa', province_code: 'TH' },
  { id: 17, province_name: 'Nghe An', province_code: 'NA' },
  { id: 18, province_name: 'Ha Tinh', province_code: 'HT' },
  { id: 19, province_name: 'Quang Tri', province_code: 'QT' },
  { id: 20, province_name: 'Hue', province_code: 'HU' },
  { id: 21, province_name: 'Da Nang', province_code: 'DN' },
  { id: 22, province_name: 'Quang Ngai', province_code: 'QI' },
  { id: 23, province_name: 'Khanh Hoa', province_code: 'KH' },
  { id: 24, province_name: 'Gia Lai', province_code: 'GL' },
  { id: 25, province_name: 'Dak Lak', province_code: 'DL' },
  { id: 26, province_name: 'Lam Dong', province_code: 'LD' },
  { id: 27, province_name: 'Tay Ninh', province_code: 'TI' },
  { id: 28, province_name: 'Dong Nai', province_code: 'DI' },
  { id: 29, province_name: 'Ho Chi Minh', province_code: 'HC' },
  { id: 30, province_name: 'Vinh Long', province_code: 'VL' },
  { id: 31, province_name: 'Dong Thap', province_code: 'DT' },
  { id: 32, province_name: 'An Giang', province_code: 'AG' },
  { id: 33, province_name: 'Can Tho', province_code: 'CT' },
  { id: 34, province_name: 'Ca Mau', province_code: 'CM' }
];

function resolveWardDataPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidates = [
    path.resolve(process.cwd(), 'wards.json'),
    path.resolve(process.cwd(), 'backend', 'wards.json'),
    path.resolve(__dirname, '../../wards.json')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Cannot find wards.json for bootstrap seeding.');
}

async function ensureProvinces() {
  await db('provinces')
    .insert(PROVINCE_SEEDS)
    .onConflict('id')
    .merge(['province_name', 'province_code']);
}

async function insertWardsInChunks(wards: WardSeed[], chunkSize = 500) {
  for (let i = 0; i < wards.length; i += chunkSize) {
    const chunk = wards.slice(i, i + chunkSize);
    await db('wards').insert(chunk).onConflict('ward_code').ignore();
  }
}

export async function ensureLocationData() {
  const wardCountRow = await db('wards').count<{ total: number }>('id as total').first();
  const totalWards = Number(wardCountRow?.total ?? 0);

  if (totalWards > 0) {
    return;
  }

  const wardDataPath = resolveWardDataPath();
  const raw = await fs.promises.readFile(wardDataPath, 'utf-8');
  const wards = JSON.parse(raw) as WardSeed[];

  if (!Array.isArray(wards) || wards.length === 0) {
    throw new Error('wards.json is empty or invalid.');
  }

  await ensureProvinces();
  await insertWardsInChunks(wards, 500);

  const afterCountRow = await db('wards').count<{ total: number }>('id as total').first();
  const afterCount = Number(afterCountRow?.total ?? 0);
  console.log(`[BOOTSTRAP] Ward bootstrap completed. Current wards: ${afterCount}.`);
}