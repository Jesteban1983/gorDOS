import { asc, eq, ilike, and, sql } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { categories, products, productAddons } from '../../config/schema';
import { NotFoundError, ConflictError } from '../../shared/errors';

// ─── Tipos ──────────────────────────────────────────────
export type ProductWithAddons = typeof products.$inferSelect & {
  addons: typeof productAddons.$inferSelect[];
};

export interface CatalogItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  preparationTime: number | null;
  addons: {
    id: number;
    name: string;
    price: string;
    type: string;
    isRequired: boolean;
    maxSelect: number;
  }[];
}

export interface CategoryWithProducts {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  products: CatalogItem[];
}

// ─── Consultas públicas ─────────────────────────────────
export async function listCategories() {
  const db = getDb();
  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));
}

export async function listCategoriesWithProducts(): Promise<CategoryWithProducts[]> {
  const db = getDb();
  const cats = await listCategories();
  const items = await db
    .select()
    .from(products)
    .where(eq(products.isAvailable, true))
    .orderBy(asc(products.sortOrder));

  // Addons agrupados por producto
  const addonRows = await db.select().from(productAddons);
  const addonsByProduct = new Map<number, typeof addonRows>();
  for (const a of addonRows) {
    const list = addonsByProduct.get(a.productId) ?? [];
    list.push(a);
    addonsByProduct.set(a.productId, list);
  }

  return cats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    products: items
      .filter((p) => p.categoryId === cat.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        isAvailable: p.isAvailable,
        preparationTime: p.preparationTime,
        addons: (addonsByProduct.get(p.id) ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
          type: a.type,
          isRequired: a.isRequired,
          maxSelect: a.maxSelect,
        })),
      })),
  }));
}

export async function getProductBySlug(slug: string): Promise<ProductWithAddons> {
  const db = getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!product) {
    throw new NotFoundError('Producto no encontrado');
  }

  const addons = await db
    .select()
    .from(productAddons)
    .where(eq(productAddons.productId, product.id))
    .orderBy(asc(productAddons.id));

  return { ...product, addons };
}

export async function searchProducts(query: string) {
  const db = getDb();
  const q = `%${query.toLowerCase()}%`;
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      imageUrl: products.imageUrl,
      categoryId: products.categoryId,
      description: products.description,
    })
    .from(products)
    .where(
      and(
        eq(products.isAvailable, true),
        sql`lower(${products.name}) LIKE ${q}`,
      ),
    )
    .orderBy(asc(products.sortOrder));
}

// ─── CRUD admin ─────────────────────────────────────────
interface CreateProductInput {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  price: string;
  imageUrl?: string;
  preparationTime?: number;
  sortOrder?: number;
  addons?: {
    name: string;
    price: string;
    type: string;
    isRequired: boolean;
    maxSelect: number;
  }[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createProduct(input: CreateProductInput) {
  const db = getDb();
  const slug = input.slug ?? slugify(input.name);

  const [cat] = await db.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1);
  if (!cat) {
    throw new NotFoundError('Categoría no existe');
  }

  const existing = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (existing.length > 0) {
    throw new ConflictError('Ya existe un producto con ese slug');
  }

  const [product] = await db
    .insert(products)
    .values({
      categoryId: input.categoryId,
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      price: input.price,
      imageUrl: input.imageUrl ?? null,
      preparationTime: input.preparationTime ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  if (input.addons?.length) {
    await db.insert(productAddons).values(
      input.addons.map((a) => ({
        productId: product.id,
        name: a.name,
        price: a.price,
        type: a.type,
        isRequired: a.isRequired,
        maxSelect: a.maxSelect,
      })),
    );
  }

  return getProductBySlug(product.slug);
}

export async function updateProduct(id: number, input: Partial<CreateProductInput>) {
  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    throw new NotFoundError('Producto no encontrado');
  }

  const [updated] = await db
    .update(products)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.preparationTime !== undefined ? { preparationTime: input.preparationTime } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(products.id, id))
    .returning();

  return getProductBySlug(updated.slug);
}

export async function toggleAvailability(id: number) {
  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    throw new NotFoundError('Producto no encontrado');
  }

  const [updated] = await db
    .update(products)
    .set({ isAvailable: !existing.isAvailable, updatedAt: sql`now()` })
    .where(eq(products.id, id))
    .returning();

  return { id: updated.id, isAvailable: updated.isAvailable };
}

export async function deleteProduct(id: number) {
  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    throw new NotFoundError('Producto no encontrado');
  }
  await db.delete(productAddons).where(eq(productAddons.productId, id));
  await db.delete(products).where(eq(products.id, id));
  return { deleted: true, id };
}