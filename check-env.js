// 환경 변수 확인 스크립트
require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('=====================================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GAS_COUPON_API_URL:', process.env.GAS_COUPON_API_URL);
console.log('PORT:', process.env.PORT);
console.log('NEXT_PUBLIC_DEBUG:', process.env.NEXT_PUBLIC_DEBUG);
console.log('NEXT_PUBLIC_LOG_LEVEL:', process.env.NEXT_PUBLIC_LOG_LEVEL);
console.log('=====================================');

// .env 파일 경로 확인
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '.env');
console.log('📁 .env file exists:', fs.existsSync(envPath));
console.log('📁 .env file path:', envPath); 