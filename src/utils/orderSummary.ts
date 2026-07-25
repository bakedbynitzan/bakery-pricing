import { Order, OrderItem } from '../types';

/**
 * בונה את הודעת סיכום ההזמנה ללקוח (וואטסאפ) בפורמט הקבוע של העסק.
 * resolveName ממיר פריט לשם תצוגה (מארז או פריט מותאם).
 */
export function buildOrderSummary(
  order: Order,
  resolveName: (item: OrderItem) => string,
  pickupAddress: string
): string {
  const lines: string[] = [];
  lines.push('אז אני מסכמת לנו את ההזמנה');
  lines.push('');
  lines.push(`הזמנה על שם ${order.customerName}`);

  order.items.forEach((it) => {
    const name = resolveName(it);
    const qtyPrefix = it.quantity > 1 ? `${it.quantity} יח׳ ` : '';
    const noteSuffix = it.note ? ` (${it.note})` : '';
    lines.push(`- ${qtyPrefix}${name} ${it.totalPrice}₪${noteSuffix}`);
  });

  if (order.inscription) lines.push(`כיתוב: ${order.inscription}`);

  lines.push(`סה״כ : ${order.totalAmount}₪`);

  const when = order.fulfillmentWhen?.trim();
  if (order.fulfillmentType === 'delivery') {
    lines.push(when ? `משלוח: ${when}` : 'משלוח');
    if (order.deliveryAddress) lines.push(`כתובת למשלוח: ${order.deliveryAddress}`);
  } else {
    lines.push(when ? `איסוף: ${when}` : 'איסוף עצמי');
    if (pickupAddress) lines.push(`כתובת לאיסוף: ${pickupAddress}`);
  }

  lines.push('');
  lines.push('ניתן לשלם ב-BIT / Paybox');

  return lines.join('\n');
}
