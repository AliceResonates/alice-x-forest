Server (Express) for PayPal order creation/capture

Environment variables (set on the server):

- PAYPAL_CLIENT_ID
- PAYPAL_SECRET
- PAYPAL_ENV (sandbox or production)
- PORT (optional)

Install and run:

```bash
cd server
npm ci
node app.js
```

Expose this server via a reverse-proxy (nginx) or use an ALB.

Notes:
- This is a minimal example. For production verify webhooks using PayPal verification API.
- Store secrets in AWS Secrets Manager and not in environment variables on shared machines.
