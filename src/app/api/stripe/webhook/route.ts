import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/db/prisma';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      console.error('Webhook Error: Missing signature or webhook secret');
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const userId = session.metadata?.userId;
        const planType = session.metadata?.planType;

        if (!userId || !subscriptionId) {
          console.warn('Webhook Warning: Missing userId or subscriptionId in session metadata');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

        // Create or update subscription record
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subscription.id },
          update: {
            isActive: true,
            stripeStatus: subscription.status,
            expiresAt: new Date(subscription.current_period_end * 1000),
            tier: "premium",
            planType: planType || "monthly",
          },
          create: {
            userId: userId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeStatus: subscription.status,
            isActive: true,
            expiresAt: new Date(subscription.current_period_end * 1000),
            tier: "premium",
            planType: planType || "monthly",
          },
        });

        // Record payment
        await prisma.payment.create({
          data: {
            userId: userId,
            stripeSessionId: session.id,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || 'usd',
            status: "succeeded",
          }
        });
        
        console.log(`Webhook Success: Subscription created/updated for user ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            isActive: true,
            stripeStatus: subscription.status,
            expiresAt: new Date(subscription.current_period_end * 1000),
          },
        });
        
        console.log(`Webhook Success: Subscription renewed for ${subscriptionId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        
        if (!subscriptionId) break;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            isActive: false,
            stripeStatus: 'past_due',
          },
        });
        
        console.warn(`Webhook Warning: Payment failed for subscription ${subscriptionId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            isActive: false,
            stripeStatus: 'canceled',
            expiresAt: new Date(), // Set to now as it's deleted
          },
        });
        
        console.log(`Webhook Success: Subscription deleted ${subscription.id}`);
        break;
      }

      default:
        console.log(`Webhook Info: Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook Error: Handler failed: ${error.message}`);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
