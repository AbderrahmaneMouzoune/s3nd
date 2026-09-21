/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Every page is static; the site has no dynamic route and no data fetching at
  // request time. Deploy it as a Next app or add `output: 'export'` for a plain
  // static host — nothing here needs a server.
  trailingSlash: false,
  poweredByHeader: false,
}

export default config
