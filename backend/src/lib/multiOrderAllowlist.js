// Emails allowed to place more than one order. Normal clients are limited to
// a single order per verified email (see orders.js and auth.js); these are
// exempt from that check and from the "you already have an order" resume flow.
export const MULTI_ORDER_EMAILS = new Set([
  'chandan.bs@randstad.in',
  'srihari.durairajan@randstad.in',
  'astha.ch@randstad.in',
  'vasu.deva@randstad.in',
  'anjali.r@randstad.in',
  'support@sunsys.in',
]);
