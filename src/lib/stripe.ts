import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(apiKey, {
  apiVersion: '2026-04-22.dahlia', // Use exact version expected by Stripe types
  appInfo: {
    name: 'Dyllicit Music',
    version: '1.0.0',
  },
});

export const getStripePriceId = (plan: 'monthly' | 'yearly') => {
  if (plan === 'monthly') {
    return process.env.STRIPE_MONTHLY_PRICE_ID;
  }
  return process.env.STRIPE_YEARLY_PRICE_ID;
};

