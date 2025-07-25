import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 사용하지 않는 변수 허용 (개발 중인 코드)
      "@typescript-eslint/no-unused-vars": "warn",
      
      // any 타입 허용 (점진적 타입 개선)
      "@typescript-eslint/no-explicit-any": "warn",
      
      // React Hook 의존성 경고만
      "react-hooks/exhaustive-deps": "warn",
      
      // 이스케이프되지 않은 엔티티 허용
      "react/no-unescaped-entities": "off",
      
      // img 태그 사용 허용
      "@next/next/no-img-element": "warn",
      
      // require() 스타일 import 허용
      "@typescript-eslint/no-require-imports": "warn"
    }
  }
];

export default eslintConfig;