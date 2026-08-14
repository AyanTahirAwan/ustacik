import env from '#start/env'

/**
 * Provider-neutral SMS delivery boundary. Configure it with a trusted SMS
 * gateway endpoint; without one, phone verification remains unavailable.
 */
export class SmsDeliveryService {
  static get isConfigured() {
    return Boolean(env.get('SMS_DELIVERY_WEBHOOK_URL'))
  }

  static async send({ to, message }: { to: string; message: string }) {
    const endpoint = env.get('SMS_DELIVERY_WEBHOOK_URL')
    if (!endpoint) throw new Error('SMS delivery is not configured')

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.get('SMS_DELIVERY_WEBHOOK_TOKEN')
          ? { Authorization: `Bearer ${env.get('SMS_DELIVERY_WEBHOOK_TOKEN')}` }
          : {}),
      },
      body: JSON.stringify({ to, message }),
    })

    if (!response.ok) throw new Error('SMS delivery failed')
    return true
  }
}
