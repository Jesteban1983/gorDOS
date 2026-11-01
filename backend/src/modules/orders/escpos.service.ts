/**
 * Servicio de generación de comandas térmicas ESC/POS y texto plano.
 * Compatible con impresoras térmicas de 58mm y 80mm (Epson, Bixolon, Xprinter, etc.)
 */

// Comandos ESC/POS estándar
const ESC = '\x1B';
const GS = '\x1D';

export const ESCPOS_COMMANDS = {
  INIT: `${ESC}@`,                      // Inicializar impresora
  ALIGN_LEFT: `${ESC}a\x00`,           // Alinear a la izquierda
  ALIGN_CENTER: `${ESC}a\x01`,         // Alinear al centro
  ALIGN_RIGHT: `${ESC}a\x02`,          // Alinear a la derecha
  BOLD_ON: `${ESC}E\x01`,              // Negrita activada
  BOLD_OFF: `${ESC}E\x00`,             // Negrita desactivada
  DOUBLE_HEIGHT: `${GS}!\x01`,         // Altura doble
  DOUBLE_WIDTH: `${GS}!\x10`,          // Ancho doble
  QUADRUPLE_SIZE: `${GS}!\x11`,        // Altura y ancho doble (4x)
  NORMAL_SIZE: `${GS}!\x00`,           // Tamaño normal
  LINE_FEED: '\x0A',                   // Salto de línea
  CUT_FULL: `${GS}V\x41\x03`,          // Corte completo de papel tras 3 líneas
  CUT_PARTIAL: `${GS}V\x42\x03`,       // Corte parcial tras 3 líneas
};

export interface TicketOrderItem {
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  addons?: { name: string; price: string }[];
  notes?: string | null;
}

export interface TicketOrderData {
  id: number;
  orderNumber: string;
  createdAt: Date | string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  notes?: string | null;
  deliveryAddress?: string | null;
  items: TicketOrderItem[];
}

/**
 * Genera el texto legible de la comanda para cocina (80 columnas o consola)
 */
export function formatKitchenTicket(order: TicketOrderData): string {
  const dateStr = new Date(order.createdAt).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  const sep = '='.repeat(40);
  const thin = '-'.repeat(40);

  const lines: string[] = [
    sep,
    '          *** COMANDA DE COCINA ***',
    '                 gorDOS',
    sep,
    `PEDIDO: #${order.orderNumber}`,
    `FECHA : ${dateStr}`,
    `TIPO  : ${order.deliveryAddress ? 'DELIVERY' : 'PARA LLEVAR / MESA'}`,
    thin,
    'CANT  PRODUCTO / OBSERVACIONES',
    thin,
  ];

  for (const item of order.items) {
    lines.push(`[ ${item.quantity}x ] ${item.productName.toUpperCase()}`);
    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        lines.push(`       + ${addon.name}`);
      }
    }
    if (item.notes) {
      lines.push(`       >> NOTA: "${item.notes}"`);
    }
    lines.push('');
  }

  lines.push(thin);
  if (order.notes) {
    lines.push(`OBS GENERAL: "${order.notes}"`);
    lines.push(thin);
  }
  if (order.deliveryAddress) {
    lines.push(`DIR ENTREGA : ${order.deliveryAddress}`);
    lines.push(thin);
  }
  lines.push(`TOTAL ITEMS : ${order.items.reduce((s, i) => s + i.quantity, 0)} unidades`);
  lines.push(sep);

  return lines.join('\n');
}

/**
 * Genera el ticket de caja / cliente con desglose de precios y pago
 */
export function formatCashierTicket(order: TicketOrderData): string {
  const dateStr = new Date(order.createdAt).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  const sep = '='.repeat(40);
  const thin = '-'.repeat(40);

  const lines: string[] = [
    sep,
    '                 gorDOS',
    '       Comida Rápida Peruana Auténtica',
    '             RUC: 20601234567',
    sep,
    `TICKET: #${order.orderNumber}`,
    `FECHA : ${dateStr}`,
    `PAGO  : ${order.paymentMethod === 'stripe' ? 'ONLINE (STRIPE)' : 'CONTRA ENTREGA'}`,
    `ESTADO: ${order.paymentStatus === 'paid' ? 'PAGADO ✓' : 'PENDIENTE'}`,
    thin,
    'CANT  DESCRIPCIÓN              TOTAL (S/)',
    thin,
  ];

  for (const item of order.items) {
    const lineItem = `${item.quantity}x ${item.productName}`.padEnd(30).slice(0, 30);
    const priceStr = `S/ ${item.totalPrice}`.padStart(10);
    lines.push(`${lineItem}${priceStr}`);

    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        lines.push(`   + ${addon.name}`);
      }
    }
  }

  lines.push(thin);
  lines.push(`SUBTOTAL:`.padEnd(28) + `S/ ${order.subtotal}`.padStart(12));
  lines.push(`DELIVERY:`.padEnd(28) + `S/ ${order.deliveryFee}`.padStart(12));
  lines.push(sep);
  lines.push(`TOTAL A PAGAR:`.padEnd(26) + `S/ ${order.total}`.padStart(14));
  lines.push(sep);
  if (order.deliveryAddress) {
    lines.push(`ENTREGA: ${order.deliveryAddress}`);
  }
  lines.push('');
  lines.push('     ¡Gracias por su preferencia!');
  lines.push('          www.gordos.pe');
  lines.push(sep);

  return lines.join('\n');
}

/**
 * Genera el Buffer de bytes binarios ESC/POS para enviar a impresora térmica (USB/Red/Bluetooth)
 */
export function buildEscPosBuffer(order: TicketOrderData, type: 'kitchen' | 'cashier'): Buffer {
  const chunks: string[] = [];

  chunks.push(ESCPOS_COMMANDS.INIT);
  chunks.push(ESCPOS_COMMANDS.ALIGN_CENTER);

  if (type === 'kitchen') {
    chunks.push(ESCPOS_COMMANDS.QUADRUPLE_SIZE);
    chunks.push(ESCPOS_COMMANDS.BOLD_ON);
    chunks.push(`COCINA #${order.orderNumber.slice(-4)}\n`);
    chunks.push(ESCPOS_COMMANDS.NORMAL_SIZE);
    chunks.push(ESCPOS_COMMANDS.BOLD_OFF);
    chunks.push(`Orden: ${order.orderNumber}\n`);
    chunks.push(`${new Date(order.createdAt).toLocaleTimeString('es-PE')}\n`);
    chunks.push('--------------------------------\n');
    chunks.push(ESCPOS_COMMANDS.ALIGN_LEFT);

    for (const item of order.items) {
      chunks.push(ESCPOS_COMMANDS.DOUBLE_HEIGHT);
      chunks.push(ESCPOS_COMMANDS.BOLD_ON);
      chunks.push(`[${item.quantity}x] ${item.productName}\n`);
      chunks.push(ESCPOS_COMMANDS.NORMAL_SIZE);
      chunks.push(ESCPOS_COMMANDS.BOLD_OFF);

      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          chunks.push(`   * ${addon.name}\n`);
        }
      }
      if (item.notes) {
        chunks.push(ESCPOS_COMMANDS.BOLD_ON);
        chunks.push(`   >> OBS: ${item.notes}\n`);
        chunks.push(ESCPOS_COMMANDS.BOLD_OFF);
      }
      chunks.push('\n');
    }

    if (order.notes) {
      chunks.push('--------------------------------\n');
      chunks.push(ESCPOS_COMMANDS.BOLD_ON);
      chunks.push(`OBS GENERAL: ${order.notes}\n`);
      chunks.push(ESCPOS_COMMANDS.BOLD_OFF);
    }
  } else {
    // Ticket Caja
    chunks.push(ESCPOS_COMMANDS.DOUBLE_HEIGHT);
    chunks.push(ESCPOS_COMMANDS.BOLD_ON);
    chunks.push('gorDOS FAST FOOD\n');
    chunks.push(ESCPOS_COMMANDS.NORMAL_SIZE);
    chunks.push(ESCPOS_COMMANDS.BOLD_OFF);
    chunks.push(`Pedido #${order.orderNumber}\n`);
    chunks.push('--------------------------------\n');
    chunks.push(ESCPOS_COMMANDS.ALIGN_LEFT);

    for (const item of order.items) {
      chunks.push(`${item.quantity}x ${item.productName}\n`);
      chunks.push(ESCPOS_COMMANDS.ALIGN_RIGHT);
      chunks.push(`S/ ${item.totalPrice}\n`);
      chunks.push(ESCPOS_COMMANDS.ALIGN_LEFT);
    }

    chunks.push('--------------------------------\n');
    chunks.push(ESCPOS_COMMANDS.ALIGN_RIGHT);
    chunks.push(ESCPOS_COMMANDS.BOLD_ON);
    chunks.push(`TOTAL: S/ ${order.total}\n`);
    chunks.push(ESCPOS_COMMANDS.BOLD_OFF);
    chunks.push(ESCPOS_COMMANDS.ALIGN_CENTER);
    chunks.push('¡Gracias por su compra!\n');
  }

  // Avance y corte de papel
  chunks.push(ESCPOS_COMMANDS.LINE_FEED);
  chunks.push(ESCPOS_COMMANDS.LINE_FEED);
  chunks.push(ESCPOS_COMMANDS.CUT_FULL);

  return Buffer.from(chunks.join(''), 'binary');
}

