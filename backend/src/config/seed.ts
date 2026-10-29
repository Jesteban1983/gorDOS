import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from './env';
import { categories, products, productAddons } from './schema';

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
const db = drizzle(pool);

/**
 * Carta inicial tipo fast food peruano (referencia: Gordo's Fast Food).
 * - Categorías ordenadas como se muestra al cliente
 * - Productos con precio en soles (PEN)
 * - Addons: cremas, adicionales, bebidas, guarniciones
 */
const CARD = [
  {
    category: { name: 'Pollos a la brasa', slug: 'pollos-a-la-brasa', description: 'Nuestro pollo marinado 12 horas y horneado a la brasa', sortOrder: 1 },
    products: [
      {
        name: 'Pollo Brasa 1/4', slug: 'pollo-brasa-1-4', price: '18.00',
        description: 'Cuarto de pollo a la brasa + 2 guarniciones + cremas', preparationTime: 25, sortOrder: 1,
        addons: [
          { name: 'Crema de ají', price: '0.00', type: 'sauce', isRequired: true, maxSelect: 1 },
          { name: 'Crema de huancaína', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
          { name: 'Crema de ocopa', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
          { name: 'Salsa de tamarindo', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
          { name: 'Extras de crema', price: '1.00', type: 'addon', isRequired: false, maxSelect: 3 },
        ],
      },
      {
        name: 'Pollo Brasa 1/2', slug: 'pollo-brasa-1-2', price: '34.00',
        description: 'Medio pollo a la brasa + 2 guarniciones + cremas', preparationTime: 30, sortOrder: 2,
        addons: [
          { name: 'Crema de ají', price: '0.00', type: 'sauce', isRequired: true, maxSelect: 1 },
          { name: 'Crema de huancaína', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
          { name: 'Crema de ocopa', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
          { name: 'Salsa de tamarindo', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
        ],
      },
      {
        name: 'Pollo Brasa Entero', slug: 'pollo-brasa-entero', price: '62.00',
        description: 'Pollo entero + 4 guarniciones + cremas (rinde 4 personas)', preparationTime: 40, sortOrder: 3,
        addons: [
          { name: 'Crema de ají', price: '0.00', type: 'sauce', isRequired: true, maxSelect: 2 },
          { name: 'Crema de huancaína', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 2 },
          { name: 'Crema de ocopa', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 2 },
          { name: 'Salsa de tamarindo', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 2 },
        ],
      },
    ],
  },
  {
    category: { name: 'Parrillas', slug: 'parrillas', description: 'Carnes a la parrilla con guarniciones', sortOrder: 2 },
    products: [
      {
        name: 'Lomo Saltado', slug: 'lomo-saltado', price: '28.00',
        description: 'Trocitos de lomo salteados con cebolla, tomate y papas fritas', preparationTime: 20, sortOrder: 1,
        addons: [
          { name: 'Arroz blanco', price: '3.00', type: 'side', isRequired: false, maxSelect: 1 },
          { name: 'Papas fritas extra', price: '4.00', type: 'side', isRequired: false, maxSelect: 2 },
          { name: 'Crema de ají', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
        ],
      },
      {
        name: 'Parrilla Mixta', slug: 'parrilla-mixta', price: '45.00',
        description: 'Pechuga, lomo, chorizo y salchicha a la parrilla + guarniciones', preparationTime: 30, sortOrder: 2,
        addons: [
          { name: 'Crema de ají', price: '0.00', type: 'sauce', isRequired: true, maxSelect: 1 },
          { name: 'Papas fritas extra', price: '4.00', type: 'side', isRequired: false, maxSelect: 2 },
          { name: 'Arroz blanco', price: '3.00', type: 'side', isRequired: false, maxSelect: 1 },
        ],
      },
    ],
  },
  {
    category: { name: 'Hamburguesas', slug: 'hamburguesas', description: 'Hamburguesas artesanales', sortOrder: 3 },
    products: [
      {
        name: 'Hamburguesa Gordo', slug: 'hamburguesa-gordo', price: '16.00',
        description: 'Doble carne, queso cheddar, tocino y salsa de la casa', preparationTime: 15, sortOrder: 1,
        addons: [
          { name: 'Huevo frito', price: '2.00', type: 'addon', isRequired: false, maxSelect: 1 },
          { name: 'Tocino extra', price: '3.00', type: 'addon', isRequired: false, maxSelect: 2 },
          { name: 'Queso extra', price: '2.00', type: 'addon', isRequired: false, maxSelect: 2 },
          { name: 'Sin cebolla', price: '0.00', type: 'addon', isRequired: false, maxSelect: 1 },
        ],
      },
      {
        name: 'Hamburguesa Clásica', slug: 'hamburguesa-clasica', price: '12.00',
        description: 'Carne, lechuga, tomate y salsa especial', preparationTime: 12, sortOrder: 2,
        addons: [
          { name: 'Huevo frito', price: '2.00', type: 'addon', isRequired: false, maxSelect: 1 },
          { name: 'Queso extra', price: '2.00', type: 'addon', isRequired: false, maxSelect: 2 },
        ],
      },
    ],
  },
  {
    category: { name: 'Guarniciones', slug: 'guarniciones', description: 'Acompañamientos para tu pedido', sortOrder: 4 },
    products: [
      {
        name: 'Papas Fritas', slug: 'papas-fritas', price: '8.00',
        description: 'Porción de papas fritas crocantes', preparationTime: 10, sortOrder: 1,
        addons: [
          { name: 'Crema de ají', price: '0.00', type: 'sauce', isRequired: false, maxSelect: 1 },
          { name: 'Salsa de queso', price: '2.00', type: 'sauce', isRequired: false, maxSelect: 1 },
        ],
      },
      {
        name: 'Arroz Chaufa', slug: 'arroz-chaufa', price: '14.00',
        description: 'Arroz frito con pollo, jamón y cebollita china', preparationTime: 15, sortOrder: 2,
        addons: [
          { name: 'Huevo extra', price: '2.00', type: 'addon', isRequired: false, maxSelect: 2 },
        ],
      },
      {
        name: 'Ensalada Fresca', slug: 'ensalada-fresca', price: '7.00',
        description: 'Lechuga, tomate, cebolla y pepino', preparationTime: 8, sortOrder: 3,
        addons: [],
      },
    ],
  },
  {
    category: { name: 'Bebidas', slug: 'bebidas', description: 'Refrescos y bebidas frías', sortOrder: 5 },
    products: [
      {
        name: 'Chicha Morada', slug: 'chicha-morada', price: '6.00',
        description: 'Refresco de maíz morado con piña', preparationTime: 2, sortOrder: 1,
        addons: [
          { name: 'Hielo', price: '0.00', type: 'addon', isRequired: true, maxSelect: 1 },
        ],
      },
      {
        name: 'Inca Kola 500ml', slug: 'inca-kola-500ml', price: '5.00',
        description: 'La gaseosa peruana favorita', preparationTime: 1, sortOrder: 2,
        addons: [],
      },
      {
        name: 'Agua Mineral 625ml', slug: 'agua-mineral-625ml', price: '4.00',
        description: 'Agua sin gas', preparationTime: 1, sortOrder: 3,
        addons: [],
      },
    ],
  },
];

async function seed() {
  console.log('🌱 Sembrando carta de gorDOS...');

  // Reset solo de datos de carta (NO toca users/orders)
  await db.delete(productAddons);
  await db.delete(products);
  await db.delete(categories);

  for (const { category, products: productList } of CARD) {
    const [cat] = await db
      .insert(categories)
      .values(category)
      .returning();
    console.log(`  📁 Categoría: ${cat.name}`);

    for (const p of productList) {
      const { addons, ...productData } = p;
      const [prod] = await db
        .insert(products)
        .values({ ...productData, categoryId: cat.id, stock: 100, isAvailable: true })
        .returning();
      console.log(`    🍔 ${prod.name} — S/${prod.price}`);

      if (addons.length > 0) {
        await db.insert(productAddons).values(
          addons.map((a) => ({ ...a, productId: prod.id })),
        );
      }
    }
  }

  console.log('✅ Carta sembrada correctamente');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Error sembrando:', err);
  process.exit(1);
});