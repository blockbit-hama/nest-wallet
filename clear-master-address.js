// 브라우저 콘솔에서 실행할 스크립트
// F12 → Console 탭에서 실행

console.log('=== Master Address 초기화 ===');

// 기존 masterAddress 확인
const oldMasterAddress = localStorage.getItem('masterAddress');
const oldMasterPrivateKey = localStorage.getItem('masterPrivateKey');

console.log('기존 masterAddress:', oldMasterAddress);
console.log('기존 masterAddress 길이:', oldMasterAddress?.length);
console.log('기존 masterPrivateKey 길이:', oldMasterPrivateKey?.length);

// 로컬 스토리지에서 masterAddress 관련 데이터 삭제
localStorage.removeItem('masterAddress');
localStorage.removeItem('masterPrivateKey');

console.log('✅ Master Address 관련 데이터 삭제 완료');

// 페이지 새로고침
console.log('🔄 페이지를 새로고침합니다...');
window.location.reload(); 