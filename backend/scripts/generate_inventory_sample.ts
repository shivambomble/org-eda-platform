import fs from 'fs';
import path from 'path';

// Sample data for inventory generation
const categories = ['Electronics', 'Furniture', 'Office Supplies', 'Hardware', 'Software'];
const suppliers = ['TechCorp', 'OfficeMax', 'GlobalSupply', 'MegaStore', 'DirectImports'];

const products = [
  // Electronics
  { name: 'Laptop Dell XPS', category: 'Electronics', price: 1200, reorder: 10 },
  { name: 'Monitor 27inch', category: 'Electronics', price: 350, reorder: 15 },
  { name: 'Wireless Mouse', category: 'Electronics', price: 25, reorder: 50 },
  { name: 'Keyboard Mechanical', category: 'Electronics', price: 80, reorder: 30 },
  { name: 'USB-C Hub', category: 'Electronics', price: 45, reorder: 40 },
  
  // Furniture
  { name: 'Office Chair Ergonomic', category: 'Furniture', price: 450, reorder: 5 },
  { name: 'Standing Desk', category: 'Furniture', price: 600, reorder: 3 },
  { name: 'Filing Cabinet', category: 'Furniture', price: 200, reorder: 8 },
  { name: 'Bookshelf 5-Tier', category: 'Furniture', price: 150, reorder: 10 },
  
  // Office Supplies
  { name: 'Printer Paper A4 (Ream)', category: 'Office Supplies', price: 8, reorder: 100 },
  { name: 'Ballpoint Pens (Box of 50)', category: 'Office Supplies', price: 12, reorder: 80 },
  { name: 'Sticky Notes Pack', category: 'Office Supplies', price: 5, reorder: 150 },
  { name: 'Stapler Heavy Duty', category: 'Office Supplies', price: 18, reorder: 25 },
  { name: 'Whiteboard Markers (Set)', category: 'Office Supplies', price: 15, reorder: 60 },
  
  // Hardware
  { name: 'Screwdriver Set', category: 'Hardware', price: 35, reorder: 20 },
  { name: 'Power Drill', category: 'Hardware', price: 120, reorder: 10 },
  { name: 'Tool Box', category: 'Hardware', price: 55, reorder: 15 },
  
  // Software
  { name: 'Office 365 License', category: 'Software', price: 150, reorder: 20 },
  { name: 'Antivirus Suite', category: 'Software', price: 60, reorder: 30 },
  { name: 'Project Management Tool', category: 'Software', price: 200, reorder: 10 },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateInventoryData(count: number = 50): string {
  const headers = [
    'product_id',
    'product_name',
    'category',
    'quantity',
    'reorder_level',
    'unit_price',
    'supplier',
    'warehouse_location',
    'last_updated'
  ];

  const rows: string[] = [headers.join(',')];

  for (let i = 1; i <= count; i++) {
    const product = randomElement(products);
    const productId = `PRD-${String(i).padStart(4, '0')}`;
    const quantity = randomInt(0, 200);
    const supplier = randomElement(suppliers);
    const warehouse = `WH-${randomElement(['A', 'B', 'C'])}`;
    const lastUpdated = new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const row = [
      productId,
      `"${product.name}"`,
      product.category,
      quantity,
      product.reorder,
      product.price,
      supplier,
      warehouse,
      lastUpdated
    ];

    rows.push(row.join(','));
  }

  return rows.join('\n');
}

// Generate and save sample data
const csvData = generateInventoryData(75);
const outputPath = path.join(__dirname, '../../sample_data/inventory_sample.csv');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, csvData);
console.log(`✅ Generated sample inventory data: ${outputPath}`);
console.log(`   - 75 products`);
console.log(`   - ${categories.length} categories`);
console.log(`   - ${suppliers.length} suppliers`);
