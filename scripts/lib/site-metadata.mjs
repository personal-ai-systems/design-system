export function siteMetadata(config, page = 'index.html') {
  const base = new URL(config.url);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) {
    throw new Error('Site URL must be an HTTPS base with a trailing slash and no credentials, query or fragment');
  }
  const id = (fragment) => new URL(fragment, base).href;
  const home = page === 'index.html';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': id('#operator'), name: config.operatorName, email: config.contact, brand: { '@id': id('#brand') } },
      { '@type': 'Brand', '@id': id('#brand'), name: config.brandName },
      { '@type': 'WebSite', '@id': id('#website'), url: base.href, name: config.productName, publisher: { '@id': id('#operator') }, inLanguage: 'en' },
      { '@type': 'WebPage', '@id': home ? id('#webpage') : id(page + '#webpage'), url: home ? base.href : id(page), name: home ? 'Creator Flow | Your stories, ready to share' : 'Creator Flow | Product brief', isPartOf: { '@id': id('#website') }, about: { '@id': id('#software') }, inLanguage: 'en', description: config.description },
      { '@type': 'SoftwareApplication', '@id': id('#software'), name: config.productName, applicationCategory: 'MultimediaApplication', description: config.description, creator: { '@id': id('#operator') }, audience: { '@type': 'Audience', audienceType: 'Independent travel and UGC creators' } },
    ],
  };
}

export function renderSitePage(template, config, page) {
  const json = JSON.stringify(siteMetadata(config, page), null, 2).replaceAll('<', '\\u003c');
  return template.replaceAll('__SITE_URL__', config.url).replace('__STRUCTURED_DATA__', json);
}
