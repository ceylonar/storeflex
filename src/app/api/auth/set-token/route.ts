
import {NextResponse} from 'next/server';

export async function POST(req: Request) {
  const {token} = await req.json();
  const response = new NextResponse(JSON.stringify({status: 'success'}), {
    status: 200,
    headers: {'Content-Type': 'application/json'},
  });
  await response.cookies.set({
    name: '__session',
    value: token,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return response;
}
