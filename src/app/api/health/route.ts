import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // NODE_ENV만 사용 (ECS Task Definition에서 설정됨)
    const environment = process.env.NODE_ENV || 'development';
    
    // 기본적인 헬스체크 응답
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: environment,
      version: process.env.npm_package_version || '1.0.0',
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 503 }
    );
  }
} 