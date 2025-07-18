
import {NextResponse} from 'next/server';

export async function POST() {
  const response = new NextResponse(JSON.stringify({status: 'success'}), {
    status: 200,
    headers: {'Content-Type': 'application/json'},
  });
  await response.cookies.set({
    name: '__session',
    value: '',
    path: '/',
    maxAge: -1,
  });
  return response;
}
