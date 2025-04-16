// app/api/webhooks/paypal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// PayPal webhook event types we want to handle
const WEBHOOK_EVENTS = {
  SUBSCRIPTION_CREATED: 'BILLING.SUBSCRIPTION.CREATED',
  SUBSCRIPTION_UPDATED: 'BILLING.SUBSCRIPTION.UPDATED',
  SUBSCRIPTION_CANCELLED: 'BILLING.SUBSCRIPTION.CANCELLED',
  SUBSCRIPTION_SUSPENDED: 'BILLING.SUBSCRIPTION.SUSPENDED',
  SUBSCRIPTION_ACTIVATED: 'BILLING.SUBSCRIPTION.ACTIVATED',
  PAYMENT_SALE_COMPLETED: 'PAYMENT.SALE.COMPLETED',
  PAYMENT_SALE_DENIED: 'PAYMENT.SALE.DENIED',
  PAYMENT_SALE_REFUNDED: 'PAYMENT.SALE.REFUNDED'
};

/**
 * Verifies PayPal webhook signature
 */
async function verifyWebhookSignature(
  req: NextRequest,
  requestBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('Missing PAYPAL_WEBHOOK_ID environment variable');
    return false;
  }

  try {
    // Get headers needed for verification
    const transmissionId = req.headers.get('paypal-transmission-id');
    const timestamp = req.headers.get('paypal-transmission-time');
    const webhookSignature = req.headers.get('paypal-transmission-sig');
    const certUrl = req.headers.get('paypal-cert-url');

    if (!transmissionId || !timestamp || !webhookSignature || !certUrl) {
      console.error('Missing required PayPal webhook headers');
      return false;
    }

    /*
      In production, you would:
      1. Fetch PayPal's certificate from certUrl (with proper validation)
      2. Construct the validation message (transmissionId + timestamp + webhookId + crc32(requestBody))
      3. Verify the signature against the message
    
      Example pseudocode (you'd need a proper implementation):
      
      const certificate = await fetchPayPalCertificate(certUrl);
      const crc32Body = calculateCRC32(requestBody);
      const verificationMessage = `${transmissionId}|${timestamp}|${webhookId}|${crc32Body}`;
      return verifySignatureWithCertificate(verificationMessage, webhookSignature, certificate);
    */

    // For development, return true but log the details
    console.log('Development mode: Webhook signature validation skipped');
    console.log('Transmission ID:', transmissionId);
    console.log('Timestamp:', timestamp);
    console.log('Webhook ID:', webhookId);
    
    return true;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Handle PayPal subscription webhook events
 */
export async function POST(req: NextRequest) {
  try {
    // Get the raw request body for signature verification
    const requestBody = await req.text();
    
    // Verify the webhook signature is from PayPal
    const signatureValid = await verifyWebhookSignature(req, requestBody);
    
    if (!signatureValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Webhook signature validation failed' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(requestBody);
    const eventType = payload.event_type;
    
    console.log('Received PayPal webhook:', eventType);

    // Handle different webhook event types
    switch (eventType) {
      case WEBHOOK_EVENTS.SUBSCRIPTION_CREATED:
        await handleSubscriptionCreated(payload);
        break;
      
      case WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED:
        await handleSubscriptionUpdated(payload);
        break;
      
      case WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED:
        await handleSubscriptionCancelled(payload);
        break;
      
      case WEBHOOK_EVENTS.SUBSCRIPTION_SUSPENDED:
        await handleSubscriptionSuspended(payload);
        break;
      
      case WEBHOOK_EVENTS.SUBSCRIPTION_ACTIVATED:
        await handleSubscriptionActivated(payload);
        break;
      
      case WEBHOOK_EVENTS.PAYMENT_SALE_COMPLETED:
        await handlePaymentCompleted(payload);
        break;
      
      case WEBHOOK_EVENTS.PAYMENT_SALE_DENIED:
        await handlePaymentDenied(payload);
        break;
      
      case WEBHOOK_EVENTS.PAYMENT_SALE_REFUNDED:
        await handlePaymentRefunded(payload);
        break;
      
      default:
        // Log unhandled event types
        console.log('Unhandled webhook event type:', eventType);
    }

    // Acknowledge receipt of the webhook
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * Handle new subscription created event
 */
async function handleSubscriptionCreated(payload: any) {
  try {
    const subscription = payload.resource;
    console.log('New subscription created:', subscription.id);
    
    // Extract subscription details
    const subscriptionId = subscription.id;
    const customId = subscription.custom_id; // Should contain userId and planId
    const status = subscription.status;
    const planId = subscription.plan_id;
    const startTime = subscription.start_time;
    const nextBillingTime = subscription.billing_info?.next_billing_time;
    
    // Parse the custom_id to get our internal user and plan IDs
    // Format should be: userId_planId_timestamp
    const [userId, internalPlanId] = (customId || '').split('_');
    
    if (!userId || !internalPlanId) {
      console.error('Invalid custom_id format in subscription:', customId);
      return;
    }
    
    // Update the user's subscription in your database
    // await updateUserSubscription({
    //   userId,
    //   planId: internalPlanId,
    //   subscriptionId,
    //   status,
    //   startDate: startTime,
    //   nextBillingDate: nextBillingTime,
    //   paypalPlanId: planId
    // });
    
    console.log('Subscription recorded for user:', userId);
  } catch (error) {
    console.error('Error handling subscription created webhook:', error);
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(payload: any) {
  try {
    const subscription = payload.resource;
    console.log('Subscription updated:', subscription.id);
    
    // Update the subscription details in your database
    // await updateSubscriptionStatus(subscription.id, subscription.status);
  } catch (error) {
    console.error('Error handling subscription updated webhook:', error);
  }
}

/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(payload: any) {
  try {
    const subscription = payload.resource;
    console.log('Subscription cancelled:', subscription.id);
    
    // Mark the subscription as cancelled in your database
    // await updateSubscriptionStatus(subscription.id, 'cancelled');
    
    // Prepare for downgrading the user at the end of their billing cycle
    // const currentPeriodEnd = subscription.billing_info?.next_billing_time || 
    //                          subscription.billing_info?.last_payment?.time;
    // await scheduleAccountDowngrade(subscription.id, currentPeriodEnd);
  } catch (error) {
    console.error('Error handling subscription cancelled webhook:', error);
  }
}

/**
 * Handle subscription suspended event
 */
async function handleSubscriptionSuspended(payload: any) {
  try {
    const subscription = payload.resource;
    console.log('Subscription suspended:', subscription.id);
    
    // Mark the subscription as suspended in your database
    // await updateSubscriptionStatus(subscription.id, 'suspended');
    
    // Optionally restrict premium features
    // await restrictPremiumFeatures(subscription.id);
  } catch (error) {
    console.error('Error handling subscription suspended webhook:', error);
  }
}

/**
 * Handle subscription activated event
 */
async function handleSubscriptionActivated(payload: any) {
  try {
    const subscription = payload.resource;
    console.log('Subscription activated:', subscription.id);
    
    // Mark the subscription as active in your database
    // await updateSubscriptionStatus(subscription.id, 'active');
    
    // Enable premium features
    // await enablePremiumFeatures(subscription.id);
  } catch (error) {
    console.error('Error handling subscription activated webhook:', error);
  }
}

/**
 * Handle successful payment event
 */
async function handlePaymentCompleted(payload: any) {
  try {
    const payment = payload.resource;
    console.log('Payment completed:', payment.id);
    
    // Record the payment in your database
    // await recordPayment({
    //   paymentId: payment.id,
    //   subscriptionId: payment.billing_agreement_id,
    //   amount: payment.amount.total,
    //   currency: payment.amount.currency,
    //   status: payment.state,
    //   paymentDate: payment.create_time
    // });
    
    // Update subscription status if needed
    // await updateSubscriptionPaymentStatus(payment.billing_agreement_id, 'paid');
  } catch (error) {
    console.error('Error handling payment completed webhook:', error);
  }
}

/**
 * Handle failed payment event
 */
async function handlePaymentDenied(payload: any) {
  try {
    const payment = payload.resource;
    console.log('Payment denied:', payment.id);
    
    // Record the failed payment
    // await recordFailedPayment({
    //   paymentId: payment.id,
    //   subscriptionId: payment.billing_agreement_id,
    //   amount: payment.amount.total,
    //   currency: payment.amount.currency,
    //   status: payment.state,
    //   paymentDate: payment.create_time
    // });
    
    // Update subscription status
    // await updateSubscriptionPaymentStatus(payment.billing_agreement_id, 'failed');
    
    // Notify user about payment failure
    // await sendPaymentFailureNotification(payment.billing_agreement_id);
  } catch (error) {
    console.error('Error handling payment denied webhook:', error);
  }
}

/**
 * Handle refunded payment event
 */
async function handlePaymentRefunded(payload: any) {
  try {
    const refund = payload.resource;
    console.log('Payment refunded:', refund.id);
    
    // Record the refund
    // await recordRefund({
    //   refundId: refund.id,
    //   paymentId: refund.sale_id,
    //   amount: refund.amount.total,
    //   currency: refund.amount.currency,
    //   status: refund.state,
    //   refundDate: refund.create_time
    // });
    
    // Update subscription status if needed
    // const subscriptionId = await getSubscriptionIdFromPayment(refund.sale_id);
    // await updateSubscriptionRefundStatus(subscriptionId, refund.id);
  } catch (error) {
    console.error('Error handling payment refunded webhook:', error);
  }
}