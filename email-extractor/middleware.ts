import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Get the user from localStorage (stored by our AuthContext)
  const user = req.cookies.get('user')?.value;

  // Check if user is authenticated
  if (!user) {
    // If the user is not authenticated and trying to access a protected route,
    // redirect them to the login page
    if (req.nextUrl.pathname !== '/auth/login') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/auth/login';
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // If user is authenticated and trying to access login page,
  // redirect them to the dashboard
  if (req.nextUrl.pathname === '/auth/login') {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  // Parse the user data
  try {
    const userData = JSON.parse(user);
    const validUsernames = ['sankalp', 'lee'];
    
    if (!userData.username || !validUsernames.includes(userData.username)) {
      // If the user is not authorized, clear their cookie and redirect to login
      const response = NextResponse.redirect(new URL('/auth/login', req.url));
      response.cookies.delete('user');
      return response;
    }
  } catch (error) {
    // If there's an error parsing the user data, clear their cookie and redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', req.url));
    response.cookies.delete('user');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 