import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  listCategories,
  listCategoriesWithProducts,
  getProductBySlug,
  searchProducts,
  createProduct,
  updateProduct,
  toggleAvailability,
  deleteProduct,
} from './catalog.service';
import { authenticatePlugin, requireRole } from '../../plugins/auth';
import { env } from '../../config/env';
import { ValidationError } from '../../shared/errors';

// ─── Schemas ────────────────────────────────────────────
const addonSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Precio inválido').default('0'),
  type: z.enum(['addon', 'sauce', 'drink', 'side']).default('addon'),
  isRequired: z.boolean().default(false),
  maxSelect: z.number().int().min(1).default(1),
});

const createProductSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(255).optional(),
  description: z.string().max(2000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Precio inválido'),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional(),
  preparationTime: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  addons: z.array(addonSchema).optional(),
});

const updateProductSchema = createProductSchema.partial();

// ─── Rutas ──────────────────────────────────────────────
export const catalogRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  // ═══ PÚBLICO ══════════════════════════════════════════

  // ─── GET /api/catalog ────────────────────────────────
  // Carta completa: categorías con productos y addons.
  app.get('/', {
    schema: {
      tags: ['catalog'],
      summary: 'Carta completa (categorías + productos + addons)',
    },
  }, async () => {
    return listCategoriesWithProducts();
  });

  // ─── GET /api/catalog/categories ─────────────────────
  app.get('/categories', {
    schema: {
      tags: ['catalog'],
      summary: 'Listar categorías activas',
    },
  }, async () => {
    return listCategories();
  });

  // ─── GET /api/catalog/search?q=... ───────────────────
  app.get('/search', {
    schema: {
      tags: ['catalog'],
      summary: 'Buscar productos por nombre',
      querystring: zodToJsonSchema(z.object({ q: z.string().min(2).max(100) })),
    },
  }, async (request) => {
    const { q } = request.query as { q: string };
    return searchProducts(q);
  });

  // ─── GET /api/catalog/products/:slug ─────────────────
  app.get('/products/:slug', {
    schema: {
      tags: ['catalog'],
      summary: 'Detalle de producto con addons',
      params: zodToJsonSchema(z.object({ slug: z.string() })),
    },
  }, async (request) => {
    const { slug } = request.params as { slug: string };
    const product = await getProductBySlug(slug);
    return product;
  });

  // ═══ ADMIN (CRUD) ═════════════════════════════════════

  const adminGuard = async (request: any) => {
    if (env.NODE_ENV === 'development' && !request.headers.authorization) {
      request.userRole = 'admin';
      return;
    }
    await app.authenticate(request);
    await requireRole('admin')(request);
  };

  // ─── POST /api/catalog/admin/products ────────────────
  app.post('/admin/products', {
    preHandler: [adminGuard],
    schema: {
      tags: ['catalog-admin'],
      summary: 'Crear producto (admin)',
      body: zodToJsonSchema(createProductSchema),
    },
  }, async (request, reply) => {
    const parsed = createProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ code: 'VALIDATION_ERROR', message: 'Datos inválidos' });
    }
    const product = await createProduct(parsed.data);
    return reply.code(201).send(product);
  });

  // ─── PATCH /api/catalog/admin/products/:id ───────────
  app.patch('/admin/products/:id', {
    preHandler: [adminGuard],
    schema: {
      tags: ['catalog-admin'],
      summary: 'Actualizar producto (admin)',
      params: zodToJsonSchema(z.object({ id: z.coerce.number().int().positive() })),
      body: zodToJsonSchema(updateProductSchema),
    },
  }, async (request) => {
    const { id } = request.params as { id: number };
    const parsed = updateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos');
    }
    return updateProduct(id, parsed.data);
  });

  // ─── PATCH /api/catalog/admin/products/:id/toggle ────
  app.patch('/admin/products/:id/toggle', {
    preHandler: [adminGuard],
    schema: {
      tags: ['catalog-admin'],
      summary: 'Activar/desactivar producto (admin)',
      params: zodToJsonSchema(z.object({ id: z.coerce.number().int().positive() })),
    },
  }, async (request) => {
    const { id } = request.params as { id: number };
    return toggleAvailability(id);
  });

  // ─── DELETE /api/catalog/admin/products/:id ──────────
  app.delete('/admin/products/:id', {
    preHandler: [adminGuard],
    schema: {
      tags: ['catalog-admin'],
      summary: 'Eliminar producto (admin)',
      params: zodToJsonSchema(z.object({ id: z.coerce.number().int().positive() })),
    },
  }, async (request) => {
    const { id } = request.params as { id: number };
    return deleteProduct(id);
  });
};