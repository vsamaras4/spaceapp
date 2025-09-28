// next.config.mjs
/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const repo = 'spaceapp' // <-- your repo name

export default {
  output: 'export',
  images: { unoptimized: true },
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  // ⬇️ Skip ESLint during `next build`
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }, 
  // (optional) if types ever fail your CI build:
  // typescript: { ignoreBuildErrors: true },
}
