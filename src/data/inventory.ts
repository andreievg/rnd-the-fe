export interface InventoryItem {
  id: number;
  itemCode: string;
  itemName: string;
  batchNumber: string;
  category: string;
  quantityOnHand: number;
  unitPrice: number;
  expiryDate: string; // ISO yyyy-mm-dd
  location: string;
  status: BatchStatus;
}

export type BatchStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expired';

const DRUG_NAMES = [
  'Amoxicillin',
  'Paracetamol',
  'Ibuprofen',
  'Metformin',
  'Atorvastatin',
  'Omeprazole',
  'Amlodipine',
  'Salbutamol',
  'Ceftriaxone',
  'Azithromycin',
  'Ciprofloxacin',
  'Losartan',
  'Hydrochlorothiazide',
  'Prednisolone',
  'Insulin Glargine',
  'Diclofenac',
  'Ranitidine',
  'Furosemide',
  'Warfarin',
  'Levothyroxine',
  'Doxycycline',
  'Clopidogrel',
  'Gabapentin',
  'Sertraline',
  'Tramadol',
];

const FORMS = ['Tablet', 'Capsule', 'Injection', 'Syrup', 'Suspension', 'Cream', 'Inhaler'];
const STRENGTHS = ['100mg', '250mg', '500mg', '5mg', '10mg', '20mg', '40mg', '1g', '2.5mg'];

const CATEGORIES = [
  'Antibiotics',
  'Analgesics',
  'Cardiovascular',
  'Antidiabetic',
  'Respiratory',
  'Gastrointestinal',
  'Endocrine',
  'CNS',
];

const LOCATIONS = ['A-01', 'A-02', 'B-03', 'B-04', 'C-05', 'C-06', 'D-07', 'Cold Room', 'Quarantine'];

// Deterministic pseudo-random generator so the dataset is stable across renders.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

function deriveStatus(quantity: number, expiryDate: string, today: Date): BatchStatus {
  if (new Date(expiryDate) < today) return 'Expired';
  if (quantity === 0) return 'Out of Stock';
  if (quantity < 50) return 'Low Stock';
  return 'In Stock';
}

export function generateInventory(count = 6000): InventoryItem[] {
  const rand = mulberry32(42);
  const today = new Date('2026-06-30');
  const items: InventoryItem[] = [];

  for (let i = 0; i < count; i++) {
    const drug = pick(rand, DRUG_NAMES);
    const form = pick(rand, FORMS);
    const strength = pick(rand, STRENGTHS);
    const itemName = `${drug} ${strength} ${form}`;

    // Quantity: bias toward having some out-of-stock and low-stock rows.
    const roll = rand();
    let quantity: number;
    if (roll < 0.05) quantity = 0;
    else if (roll < 0.2) quantity = Math.floor(rand() * 49) + 1;
    else quantity = Math.floor(rand() * 5000) + 50;

    // Expiry between ~6 months in the past and ~3 years in the future.
    const expiryOffsetDays = Math.floor(rand() * (365 * 3 + 180)) - 180;
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + expiryOffsetDays);
    const expiryDate = expiry.toISOString().slice(0, 10);

    items.push({
      id: i + 1,
      itemCode: `MED-${pad(Math.floor(rand() * 90000) + 10000, 5)}`,
      itemName,
      batchNumber: `B${pad(i % 100000, 5)}-${pick(rand, ['A', 'B', 'C', 'D'])}`,
      category: pick(rand, CATEGORIES),
      quantityOnHand: quantity,
      unitPrice: Math.round((rand() * 199 + 1) * 100) / 100,
      expiryDate,
      location: pick(rand, LOCATIONS),
      status: deriveStatus(quantity, expiryDate, today),
    });
  }

  return items;
}
