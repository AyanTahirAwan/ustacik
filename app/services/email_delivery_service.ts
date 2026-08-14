import env from '#start/env'

/**
 * Minimal Resend HTTP transport. It keeps email delivery outside controllers
 * and is a safe no-op until production mail credentials are configured.
 */
export class EmailDeliveryService {
  static get isConfigured() {
    return Boolean(env.get('RESEND_API_KEY') && env.get('MAIL_FROM'))
  }

  static async send({ to, subject, text }: { to: string; subject: string; text: string }) {
    if (!this.isConfigured) return false

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.get('MAIL_FROM'), to: [to], subject, text }),
    })

    if (!response.ok) throw new Error('Email delivery failed')
    return true
  }
}
