// Site-wide settings. Nothing here is secret.

export const SITE = {
  name: 'StatWise.in',
  url: 'https://statwise.in',
  tagline: 'India, explained with data.',
  description:
    'StatWise.in turns reliable public data about India into clear, well-sourced stories.',
  locale: 'en-IN',
  // Leave empty to hide the address. The Contact page shows a placeholder until it is set.
  contactEmail: '',
};

// Google AdSense. Everything stays off while `client` is empty.
// 1. Paste the publisher ID from AdSense (e.g. 'ca-pub-1234567890123456'): adds the site-verification
//    meta tag and a valid ads.txt. Apply in AdSense with the "Meta tag" or "ads.txt" option.
// 2. After approval, create two display ad units in AdSense and paste their slot IDs below.
//    Ads then appear on article pages only, and only in these two positions.
export const ADS = {
  client: 'ca-pub-7825172645589464',
  slots: {
    inArticle: '', // after the 3rd paragraph
    afterArticle: '', // below the sources, before "Related stories"
  },
};

export const FOOTER_LINKS = [
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Editorial policy', href: '/editorial-policy/' },
  { label: 'Privacy policy', href: '/privacy-policy/' },
];
