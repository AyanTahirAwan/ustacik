import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { translate, type Locale } from '#services/i18n'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    lang: Locale
  }
}

export default class LocaleMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const queryLang = ctx.request.input('lang') as string | undefined
    const sessionLang = ctx.session?.get('lang') as string | undefined
    const cookieLang = ctx.request.cookie('lang') as string | undefined

    let lang: Locale = 'tr'

    if (queryLang === 'tr' || queryLang === 'en') {
      lang = queryLang
      if (ctx.session) ctx.session.put('lang', lang)
      ctx.response.cookie('lang', lang, { maxAge: '1y', path: '/' })
    } else if (sessionLang === 'tr' || sessionLang === 'en') {
      lang = sessionLang as Locale
    } else if (cookieLang === 'tr' || cookieLang === 'en') {
      lang = cookieLang as Locale
      if (ctx.session) ctx.session.put('lang', lang)
    }

    ctx.lang = lang

    if (ctx.view) {
      ctx.view.share({
        lang,
        t: (key: string, params?: Record<string, string | number>) => translate(key, lang, params),
        translations: translate,
      })
    }

    return next()
  }
}
