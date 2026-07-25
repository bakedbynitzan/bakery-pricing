import { describe, it, expect } from 'vitest';
import { productMaterialCost, orderItemUnitCost, orderProfit } from './orders';
import { Ingredient, Recipe, Product, Order, OrderItem } from '../types';

const ing = (id: string, unit: Ingredient['unit'], pricePerUnit: number): Ingredient => ({
  id, name: id, pricePerUnit, packagePrice: 0, packageQuantity: 1, unit, createdAt: 0, updatedAt: 0,
});

const recipe = (id: string, yieldN: number, ings: Recipe['ingredients']): Recipe => ({
  id, name: id, category: 'cake', ingredients: ings, yield: yieldN, yieldUnit: 'יח', laborMinutes: 0, createdAt: 0, updatedAt: 0,
});

const ingredients: Ingredient[] = [ing('flour', 'g', 0.01), ing('sugar', 'g', 0.02)];
// recipe R1: 100g flour (1) + 50g sugar (1) = 2 total, yield 2 => 1 per unit
const recipes: Recipe[] = [
  recipe('R1', 2, [
    { ingredientId: 'flour', quantity: 100, unit: 'g' },
    { ingredientId: 'sugar', quantity: 50, unit: 'g' },
  ]),
];

describe('productMaterialCost', () => {
  it('computes from components (cost per unit * qty)', () => {
    const p: Product = { id: 'P1', name: 'box', components: [{ recipeId: 'R1', quantity: 3 }], sellingPrice: 50, isActive: true, createdAt: 0, updatedAt: 0 };
    // per unit R1 = 2/2 = 1; * 3 = 3
    expect(productMaterialCost(p, recipes, ingredients)).toBeCloseTo(3, 5);
  });

  it('falls back to manual ingredientsCost when no components', () => {
    const p: Product = { id: 'P2', name: 'manual', ingredientsCost: 45, sellingPrice: 100, isActive: true, createdAt: 0, updatedAt: 0 };
    expect(productMaterialCost(p, recipes, ingredients)).toBe(45);
  });

  it('returns 0 when no components and no cost', () => {
    const p: Product = { id: 'P3', name: 'empty', sellingPrice: 100, isActive: true, createdAt: 0, updatedAt: 0 };
    expect(productMaterialCost(p, recipes, ingredients)).toBe(0);
  });
});

const products: Product[] = [
  { id: 'P1', name: 'box', components: [{ recipeId: 'R1', quantity: 3 }], sellingPrice: 50, isActive: true, createdAt: 0, updatedAt: 0 },
  { id: 'P2', name: 'manual', ingredientsCost: 45, sellingPrice: 100, isActive: true, createdAt: 0, updatedAt: 0 },
];

describe('orderItemUnitCost', () => {
  it('prefers the saved cost snapshot', () => {
    const item: OrderItem = { productId: 'P1', quantity: 2, pricePerUnit: 50, totalPrice: 100, costPerUnit: 7 };
    expect(orderItemUnitCost(item, products, recipes, ingredients)).toBe(7);
  });

  it('computes from product when no snapshot', () => {
    const item: OrderItem = { productId: 'P1', quantity: 1, pricePerUnit: 50, totalPrice: 50 };
    expect(orderItemUnitCost(item, products, recipes, ingredients)).toBeCloseTo(3, 5);
  });

  it('returns 0 for custom items', () => {
    const item: OrderItem = { productId: 'custom', customName: 'x', quantity: 1, pricePerUnit: 20, totalPrice: 20 };
    expect(orderItemUnitCost(item, products, recipes, ingredients)).toBe(0);
  });
});

const baseOrder = (over: Partial<Order>): Order => ({
  id: 'O1', date: '2026-01-01', customerName: 'c', items: [], packagingCost: 0, deliveryCost: 0, discount: 0, totalAmount: 0, status: 'delivered', createdAt: 0, updatedAt: 0, ...over,
});

describe('orderProfit', () => {
  it('uses stored totalCost snapshot when present', () => {
    const order = baseOrder({
      items: [{ productId: 'P2', quantity: 1, pricePerUnit: 100, totalPrice: 100 }],
      totalAmount: 100, totalCost: 45,
    });
    const p = orderProfit(order, products, recipes, ingredients);
    expect(p.materialCost).toBe(45);
    expect(p.itemsRevenue).toBe(100);
    expect(p.profit).toBe(55);
    expect(p.profitPercent).toBeCloseTo(55, 5);
    expect(p.hasSnapshot).toBe(true);
  });

  it('estimates cost from products when no snapshot', () => {
    const order = baseOrder({
      items: [{ productId: 'P1', quantity: 2, pricePerUnit: 50, totalPrice: 100 }],
      totalAmount: 100,
    });
    const p = orderProfit(order, products, recipes, ingredients);
    expect(p.materialCost).toBeCloseTo(6, 5); // 3 per unit * 2
    expect(p.profit).toBeCloseTo(94, 5);
    expect(p.hasSnapshot).toBe(false);
  });

  it('treats packaging & delivery as pass-through (excluded from profit)', () => {
    const order = baseOrder({
      items: [{ productId: 'P2', quantity: 1, pricePerUnit: 100, totalPrice: 100, costPerUnit: 45 }],
      packagingCost: 10, deliveryCost: 20, discount: 0,
      totalAmount: 130, totalCost: 45,
    });
    const p = orderProfit(order, products, recipes, ingredients);
    // profit = itemsRevenue(100) - discount(0) - material(45) = 55
    expect(p.profit).toBe(55);
    expect(p.revenue).toBe(130);
  });

  it('subtracts discount from profit', () => {
    const order = baseOrder({
      items: [{ productId: 'P2', quantity: 1, pricePerUnit: 100, totalPrice: 100, costPerUnit: 45 }],
      discount: 10, totalAmount: 90, totalCost: 45,
    });
    const p = orderProfit(order, products, recipes, ingredients);
    expect(p.profit).toBe(45); // 100 - 10 - 45
  });

  it('handles empty order without crashing', () => {
    const order = baseOrder({ items: [], totalAmount: 0 });
    const p = orderProfit(order, products, recipes, ingredients);
    expect(p.profit).toBe(0);
    expect(p.profitPercent).toBeNull();
  });
});
