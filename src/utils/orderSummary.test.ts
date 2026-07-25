import { describe, it, expect } from 'vitest';
import { buildOrderSummary } from './orderSummary';
import { Order, OrderItem } from '../types';

const baseOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'O1',
  date: '2026-07-16',
  customerName: 'דורית אבידני',
  items: [],
  packagingCost: 0,
  deliveryCost: 0,
  discount: 0,
  totalAmount: 0,
  status: 'pending',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const nameFor = (item: OrderItem) => item.customName || item.productId;
const PICKUP = 'עמק חפר 21, מודיעין-מכבים-רעות';

describe('buildOrderSummary', () => {
  it('builds the full pickup summary in the expected format', () => {
    const order = baseOrder({
      totalAmount: 357,
      inscription: 'מזל טוב ירדן',
      fulfillmentType: 'pickup',
      fulfillmentWhen: 'יום חמישי 16/7 בערב',
      items: [
        { productId: 'p1', customName: 'מארז יום הולדת', quantity: 1, pricePerUnit: 299, totalPrice: 299, note: 'בהמשך היום אחזיר תשובה' },
        { productId: 'p2', customName: 'כדורי שוקולד', quantity: 14, pricePerUnit: 4, totalPrice: 58 },
      ],
    });

    const text = buildOrderSummary(order, nameFor, PICKUP);

    expect(text).toContain('הזמנה על שם דורית אבידני');
    expect(text).toContain('- מארז יום הולדת 299₪ (בהמשך היום אחזיר תשובה)');
    expect(text).toContain('- 14 יח׳ כדורי שוקולד 58₪');
    expect(text).toContain('כיתוב: מזל טוב ירדן');
    expect(text).toContain('סה״כ : 357₪');
    expect(text).toContain('איסוף: יום חמישי 16/7 בערב');
    expect(text).toContain(`כתובת לאיסוף: ${PICKUP}`);
    expect(text).toContain('ניתן לשלם ב-BIT / Paybox');
  });

  it('uses delivery labels and address when fulfillmentType is delivery', () => {
    const order = baseOrder({
      totalAmount: 120,
      fulfillmentType: 'delivery',
      fulfillmentWhen: 'שישי בבוקר',
      deliveryAddress: 'הרצל 5 תל אביב',
      items: [{ productId: 'p1', customName: 'עוגה', quantity: 1, pricePerUnit: 120, totalPrice: 120 }],
    });

    const text = buildOrderSummary(order, nameFor, PICKUP);

    expect(text).toContain('משלוח: שישי בבוקר');
    expect(text).toContain('כתובת למשלוח: הרצל 5 תל אביב');
    expect(text).not.toContain('כתובת לאיסוף');
  });

  it('omits inscription line when not provided', () => {
    const order = baseOrder({
      totalAmount: 50,
      items: [{ productId: 'p1', customName: 'עוגייה', quantity: 1, pricePerUnit: 50, totalPrice: 50 }],
    });

    const text = buildOrderSummary(order, nameFor, PICKUP);
    expect(text).not.toContain('כיתוב:');
    expect(text).toContain('איסוף עצמי');
  });
});
