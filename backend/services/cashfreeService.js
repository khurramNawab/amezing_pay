/**
 * cashfreeService.js
 *
 * Direct HTTP integration with the Cashfree PG API (2023-08-01).
 * We bypass the cashfree-pg SDK because its ESM/static-property auth
 * initialization is unreliable at module load time in ESM projects.
 * The raw REST API is straightforward and battle-tested (200 confirmed).
 */
import axios from "axios";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const CASHFREE_ENV   = (process.env.CASHFREE_ENV || env.CASHFREE_ENV || 'TEST');
const CASHFREE_BASE  = CASHFREE_ENV === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
const API_VERSION    = '2023-08-01';
const APP_ID         = process.env.CASHFREE_APP_ID     || env.CASHFREE_APP_ID;
const SECRET_KEY     = process.env.CASHFREE_SECRET_KEY || env.CASHFREE_SECRET_KEY;

const cfHttp = axios.create({
    baseURL: CASHFREE_BASE,
    headers: {
        'Content-Type':    'application/json',
        'x-api-version':   API_VERSION,
        'x-client-id':     APP_ID,
        'x-client-secret': SECRET_KEY,
    },
    timeout: 15000,
});

/**
 * Create a Cashfree Order
 */
export const createCashfreeOrder = async ({
    orderId,
    orderAmount,
    customerId,
    customerPhone,
    customerEmail,
    orderNote,
}) => {
    try {
        const { data } = await cfHttp.post('/orders', {
            order_id:       orderId,
            order_amount:   orderAmount,
            order_currency: 'INR',
            customer_details: {
                customer_id:    String(customerId),
                customer_phone: String(customerPhone || '9999999999'),
                customer_email: customerEmail || 'customer@example.com',
            },
            order_meta: {
                return_url: `${env.APP_URL}/payment-status?order_id={order_id}`,
                notify_url: `${env.API_URL}/payments/webhook/cashfree`,
            },
            order_note: orderNote || 'Wallet Top-up — Amezing Pay',
        });
        logger.info(`[Cashfree] Order created: ${data.cf_order_id} | session: ${data.payment_session_id?.slice(0, 20)}...`);
        return data;
    } catch (error) {
        const cfErr = error.response?.data;
        const detail = cfErr?.message || cfErr?.error || error.message || 'Cashfree order creation failed';
        logger.error('[Cashfree] Order Error:', { status: error.response?.status, detail, raw: cfErr });
        throw new Error(`Cashfree: ${detail}`);
    }
};

/**
 * Fetch a Cashfree Order by ID
 */
export const getCashfreeOrder = async (orderId) => {
    try {
        const { data } = await cfHttp.get(`/orders/${encodeURIComponent(orderId)}`);
        return data;
    } catch (error) {
        const cfErr = error.response?.data;
        const detail = cfErr?.message || cfErr?.error || error.message || 'Cashfree order fetch failed';
        logger.error('[Cashfree] Fetch Error:', { status: error.response?.status, detail, raw: cfErr });
        throw new Error(`Cashfree: ${detail}`);
    }
};
