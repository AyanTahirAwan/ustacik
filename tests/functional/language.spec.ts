import { test } from '@japa/runner'

test.group('Language Switcher', () => {
  test('GET /lang/tr sets language cookie to tr and redirects', async ({ client }) => {
    const response = await client.get('/lang/tr').redirects(0)

    response.assertStatus(302)
    response.assertCookie('lang', 'tr')
  })

  test('GET /lang/en sets language cookie to en and redirects', async ({ client }) => {
    const response = await client.get('/lang/en').redirects(0)

    response.assertStatus(302)
    response.assertCookie('lang', 'en')
  })
})
