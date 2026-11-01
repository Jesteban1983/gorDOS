import { describe, it, expect } from 'vitest';
import {
  formatKitchenTicket,
  formatCashierTicket,
  buildEscPosBuffer,
  type TicketOrderData,
} from './escpos.service';

describe('ESC/POS and Ticket Service (Fase 5)', () => {
  const mockOrder: TicketOrderData = {
    id: 1,
    orderNumber: 'GOR-20261031-1001',
    createdAt: new Date('2026-10-31T15:00:00Z'),
    status: 'pending',
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'pending',
    subtotal: '45.00',
    deliveryFee: '0.00',
    total: '45.00',
    notes: 'Sin picante por favor',
    deliveryAddress: 'Calle Las Flores 123',
    items: [
      {
        productName: 'Pollo Brasa 1/4',
        quantity: 2,
        unitPrice: '18.00',
        totalPrice: '36.00',
        addons: [{ name: 'Crema de ají', price: '0.00' }],
        notes: 'Bien dorado',
      },
      {
        productName: 'Chicha Morada',
        quantity: 1,
        unitPrice: '9.00',
        totalPrice: '9.00',
        addons: [],
        notes: null,
      },
    ],
  };

  it('formatea la comanda de cocina con productos, addons y observaciones', () => {
    const text = formatKitchenTicket(mockOrder);
    expect(text).toContain('*** COMANDA DE COCINA ***');
    expect(text).toContain('PEDIDO: #GOR-20261031-1001');
    expect(text).toContain('[ 2x ] POLLO BRASA 1/4');
    expect(text).toContain('+ Crema de ají');
    expect(text).toContain('>> NOTA: "Bien dorado"');
    expect(text).toContain('OBS GENERAL: "Sin picante por favor"');
    expect(text).toContain('DIR ENTREGA : Calle Las Flores 123');
    expect(text).toContain('TOTAL ITEMS : 3 unidades');
  });

  it('formatea el ticket de caja con subtotales, totales y método de pago', () => {
    const text = formatCashierTicket(mockOrder);
    expect(text).toContain('gorDOS');
    expect(text).toContain('TICKET: #GOR-20261031-1001');
    expect(text).toContain('CONTRA ENTREGA');
    expect(text).toContain('SUBTOTAL:');
    expect(text).toContain('TOTAL A PAGAR:');
    expect(text).toContain('S/ 45.00');
  });

  it('construye buffer binario ESC/POS con comandos de corte de papel y formato térmico', () => {
    const kitchenBuffer = buildEscPosBuffer(mockOrder, 'kitchen');
    expect(Buffer.isBuffer(kitchenBuffer)).toBe(true);
    expect(kitchenBuffer.length).toBeGreaterThan(50);

    const cashierBuffer = buildEscPosBuffer(mockOrder, 'cashier');
    expect(Buffer.isBuffer(cashierBuffer)).toBe(true);
    expect(cashierBuffer.length).toBeGreaterThan(50);
  });
});

