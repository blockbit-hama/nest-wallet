import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 기본적인 ready 체크 - health와 동일하게 처리
    const readyCheck = {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(readyCheck, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'not ready', 
        timestamp: new Date().toISOString(),
      }, 
      { status: 503 }
    );
  }
}
