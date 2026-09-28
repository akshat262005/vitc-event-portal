/**
 * Patch copied React components for Next.js App Router:
 * - Add 'use client'
 * - Replace react-router-dom with next/navigation + next/link
 * - Fix import paths to @/
 */
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx|js)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = [
  ...walk('components'),
  'context/AuthContext.jsx',
  'lib/client-api.js',
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, 'utf8');
  const original = src;

  // Client directive for components/context (not for client-api which is a module)
  if (file.endsWith('.jsx') && !src.startsWith("'use client'") && !src.startsWith('"use client"')) {
    src = "'use client';\n\n" + src;
  }

  // Import path fixes
  src = src.replace(/from ['"]\.\.\/\.\.\/utils\/api['"]/g, "from '@/lib/client-api'");
  src = src.replace(/from ['"]\.\.\/utils\/api['"]/g, "from '@/lib/client-api'");
  src = src.replace(/from ['"]\.\.\/\.\.\/context\/AuthContext['"]/g, "from '@/context/AuthContext'");
  src = src.replace(/from ['"]\.\.\/context\/AuthContext['"]/g, "from '@/context/AuthContext'");

  // react-router-dom → next
  if (src.includes('react-router-dom')) {
    // Login: useNavigate + Navigate
    if (file.includes('Login.jsx')) {
      src = src.replace(
        /import \{ useNavigate, Navigate \} from ['"]react-router-dom['"];/,
        "import { useRouter } from 'next/navigation';\nimport { redirect } from 'next/navigation';"
      );
      // Actually redirect can't be used in client the same way - use router.replace
      src = src.replace(
        /import \{ useRouter \} from 'next\/navigation';\nimport \{ redirect \} from 'next\/navigation';/,
        "import { useRouter } from 'next/navigation';"
      );
      src = src.replace(/const navigate = useNavigate\(\);/, 'const router = useRouter();');
      src = src.replace(
        /return <Navigate to=\{user\.role === 'Admin' \? '\/admin\/dashboard' : '\/dashboard'\} replace \/>;/,
        `router.replace(user.role === 'Admin' ? '/admin/dashboard' : '/dashboard');\n    return null;`
      );
      src = src.replace(/navigate\(/g, 'router.push(');
    }

    // RouteGuard
    if (file.includes('RouteGuard.jsx')) {
      src = src.replace(
        /import \{ Navigate \} from ['"]react-router-dom['"];/,
        "import { useRouter } from 'next/navigation';\nimport { useEffect } from 'react';"
      );
      // Rewrite component to use router
      src = `'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from './Loader';

const RouteGuard = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(user.role === 'Admin' ? '/admin/dashboard' : '/dashboard');
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vit-neutral-50 dark:bg-vit-neutral-900">
        <Loader size="lg" />
      </div>
    );
  }

  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return children;
};

export default RouteGuard;
`;
    }

    // Sidebar: NavLink + useNavigate
    if (file.includes('Sidebar.jsx')) {
      src = src.replace(
        /import \{ NavLink, useNavigate \} from ['"]react-router-dom['"];/,
        "import Link from 'next/link';\nimport { usePathname, useRouter } from 'next/navigation';"
      );
      src = src.replace(/const navigate = useNavigate\(\);/, 'const router = useRouter();\n  const pathname = usePathname();');
      src = src.replace(/navigate\(/g, 'router.push(');
      // Replace NavLink with Link + className function adapted
      src = src.replace(
        /<NavLink\s+to=\{item\.path\}\s+className=\{\(\{ isActive \}\) =>\s*`([^`]+)`\s*\}\s*>/g,
        `<Link\n            href={item.path}\n            className={\`\${pathname === item.path || pathname.startsWith(item.path + '/') ? 'bg-vit-blue text-white shadow-md shadow-vit-blue/20' : 'text-vit-neutral-600 dark:text-vit-neutral-300 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-700/50'} $1\`.replace(/\\$\\{isActive[^}]+\\}/g, '')}\n          >`
      );
      // Simpler approach - redo NavLink blocks
    }

    // Generic replacements for remaining files
    src = src.replace(
      /import \{ useNavigate \} from ['"]react-router-dom['"];/g,
      "import { useRouter } from 'next/navigation';"
    );
    src = src.replace(
      /import \{ useNavigate, Link \} from ['"]react-router-dom['"];/g,
      "import { useRouter } from 'next/navigation';\nimport Link from 'next/link';"
    );
    src = src.replace(
      /import \{ useNavigate, useParams \} from ['"]react-router-dom['"];/g,
      "import { useRouter, useParams } from 'next/navigation';"
    );
    src = src.replace(
      /import \{ useNavigate, useLocation, useParams \} from ['"]react-router-dom['"];/g,
      "import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';"
    );
    src = src.replace(
      /import \{ useSearchParams, useNavigate \} from ['"]react-router-dom['"];/g,
      "import { useRouter, useSearchParams } from 'next/navigation';"
    );

    src = src.replace(/const navigate = useNavigate\(\);/g, 'const router = useRouter();');
    src = src.replace(/navigate\(/g, 'router.push(');

    // Link `to=` → `href=`
    src = src.replace(/<Link\s+to=/g, '<Link href=');

    // useLocation → pathname/searchParams
    if (src.includes('useLocation()')) {
      src = src.replace(
        /const location = useLocation\(\);/g,
        "const pathname = usePathname();\n  const searchParamsHook = useSearchParams();\n  const location = { pathname, search: searchParamsHook?.toString() ? `?${searchParamsHook.toString()}` : '', state: null };"
      );
    }
  }

  // client-api: same-origin /api
  if (file.includes('client-api.js')) {
    src = `import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = \`Bearer \${token}\`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.endsWith('/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
`;
  }

  if (src !== original) {
    fs.writeFileSync(file, src);
    console.log('patched', file);
  }
}

console.log('Component patch complete');
