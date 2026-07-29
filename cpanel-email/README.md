# Tezra cPanel Email API Gateway

This folder contains a PHP script designed to run on your cPanel web hosting server to handle sending emails natively without hitting Vercel SMTP port blocks or limits.

## How to Set Up

### 1. Upload to cPanel
1. Log into your **cPanel Account**.
2. Open **File Manager** and navigate to your domain's folder (usually `public_html`).
3. Create a folder named `api` (so the path is `public_html/api`).
4. Upload `send-email.php` into that folder.
5. Your public endpoint URL will be:
   `https://yourdomain.com/api/send-email.php` (replace with your actual domain).

### 2. Configure Vercel Environment Variables
Add the following variables to your project settings in the **Vercel Dashboard**:

1. **`CPANEL_EMAIL_API_URL`**: Set this to your uploaded script URL.
   * Example: `https://tezra.xyz/api/send-email.php`
2. **`CPANEL_EMAIL_API_KEY`**: Set this to match the `API_KEY` defined in the PHP script.
   * Default: `tezra_secure_email_key_2026`

Once configured, all emails sent by Tezra will automatically route through your secure cPanel server.
