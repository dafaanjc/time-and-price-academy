/** URL absolut untuk canonical/OG/salin tautan. `undefined` bila `site` belum di-set (env SITE_URL). */
export function absoluteUrl(pathname: string, site: URL | undefined): string | undefined {
  return site ? new URL(pathname, site).href : undefined;
}
