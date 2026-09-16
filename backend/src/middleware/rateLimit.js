import { rateLimit } from 'express-rate-limit';

const make = (windowMs, limit, error) => rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error },
});

// Baseline for every /api/* route — generous, just a backstop against a
// runaway client or basic scripted abuse, not meant to bother real usage.
export const apiLimiter = make(15 * 60 * 1000, 300, 'Too many requests. Please try again later.');

// OTP request: bounds how many emails one IP can trigger, since each hit
// sends a real email (and the app text says verification is mandatory).
export const otpRequestLimiter = make(15 * 60 * 1000, 5, 'Too many OTP requests. Please wait a few minutes and try again.');

// OTP verify: a 5-digit code has 100,000 combinations, so the code's own
// expiry isn't enough on its own — this bounds guessing attempts per IP.
export const otpVerifyLimiter = make(15 * 60 * 1000, 10, 'Too many verification attempts. Please wait a few minutes and try again.');

// Admin login: throttles credential brute-forcing.
export const adminLoginLimiter = make(15 * 60 * 1000, 10, 'Too many login attempts. Please wait a few minutes and try again.');

// Order creation: defense-in-depth alongside the per-email dedupe check
// already in orders.js — bounds scripted spam across many different emails.
export const orderCreateLimiter = make(60 * 60 * 1000, 20, 'Too many orders from this network. Please try again later.');
