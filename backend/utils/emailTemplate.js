import { env } from '../config/env.js';

/**
 * Generates a professional, table-based HTML email template with a centered brand logo.
 * @param {string} title - The title/heading of the email.
 * @param {string} contentHtml - The main body content in HTML format.
 * @param {string} buttonText - Optional text for a CTA button.
 * @param {string} buttonUrl - Optional URL for the CTA button.
 * @returns {string} - Complete HTML email string.
 */
export const wrapInTemplate = (title, contentHtml, buttonText = '', buttonUrl = '') => {
    const logoUrl = `${env.API_URL}/public/assets/logo.png`;
    const appName = "AmazingPay Services";
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table {
            border-spacing: 0;
            width: 100%;
        }
        td {
            padding: 0;
        }
        img {
            border: 0;
            -ms-interpolation-mode: bicubic;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding-bottom: 40px;
            padding-top: 40px;
        }
        .main-container {
            width: 100%;
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .header {
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            width: 120px;
            height: auto;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        .app-name {
            margin-top: 15px;
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .content {
            padding: 30px 40px;
            font-size: 16px;
            line-height: 1.6;
            color: #334155;
        }
        .content h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 20px;
            text-align: center;
        }
        .button-container {
            padding: 20px 40px 40px;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #673ab7;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }
        @media only screen and (max-width: 600px) {
            .content {
                padding: 20px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <table role="presentation">
            <tr>
                <td align="center">
                    <div class="main-container">
                        <!-- HEADER -->
                        <div class="header">
                            <img src="${logoUrl}" alt="Logo" class="logo">
                            <div class="app-name">${appName}</div>
                        </div>
                        
                        <!-- CONTENT -->
                        <div class="content">
                            <h1>${title}</h1>
                            ${contentHtml}
                        </div>

                        <!-- BUTTON -->
                        ${buttonText ? `
                        <div class="button-container">
                            <a href="${buttonUrl}" class="button">${buttonText}</a>
                        </div>
                        ` : ''}

                        <!-- FOOTER -->
                        <div class="footer">
                            &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br>
                            If you have any questions, contact us at support@amezingpay.com
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
    `;
};
