import { Cashfree, CFEnvironment } from "cashfree-pg";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// Initialize Cashfree
Cashfree.XClientId = process.env.CASHFREE_APP_ID || env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'PRODUCTION' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;

/**
 * Create a Cashfree Order
 */
export const createCashfreeOrder = async ({ orderId, orderAmount, customerId, customerPhone, customerEmail, orderNote }) => {
    try {
        const request = {
            order_amount: orderAmount,
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
                customer_id: String(customerId),
                customer_phone: String(customerPhone || '9999999999'),
                customer_email: customerEmail || 'customer@example.com'
            },
            order_meta: {
                return_url: `${env.APP_URL}/payment-status?order_id={order_id}`,
                notify_url: `${env.API_URL}/api/payments/webhook/cashfree`
            },
            order_note: orderNote || "Payment for Amezing Pay Services"
        };

        const response = await Cashfree.PGCreateOrder("2023-08-01", request);
        return response.data;
    } catch (error) {
        logger.error("Cashfree Order Error:", { error: error.response?.data || error.message });
        throw new Error(error.response?.data?.message || "Cashfree order creation failed");
    }
};

/**
 * Verify Cashfree Payment (Fetch Order)
 */
export const getCashfreeOrder = async (orderId) => {
    try {
        const response = await Cashfree.PGFetchOrder("2023-08-01", orderId);
        return response.data;
    } catch (error) {
        logger.error("Cashfree Fetch Error:", { error: error.response?.data || error.message });
        throw new Error(error.response?.data?.message || "Cashfree order fetch failed");
    }
};
