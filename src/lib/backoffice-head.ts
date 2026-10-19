export function backofficeHead(section: string) {
  const title = `${section} — Share CoreMar Admin`;
  const description = `Manage ${section.toLowerCase()} securely in the Share CoreMar Egyptian marketplace control center.`;
  return { meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] };
}
