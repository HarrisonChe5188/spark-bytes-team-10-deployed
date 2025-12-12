import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/'
  }

  // Use environment variable for site URL, with Vercel URL as fallback
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Validate bu.edu domain server-side (backup check if hd parameter is bypassed)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && !user.email.toLowerCase().endsWith('@bu.edu')) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${baseUrl}/auth/error?error=Only Boston University (@bu.edu) email addresses are allowed`)
      }
      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${baseUrl}/auth/auth-code-error`)
}
