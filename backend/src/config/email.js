require('dotenv').config();

const emailConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  from: process.env.SMTP_FROM || 'UTEShop <noreply@uteshop.com>'
};

module.exports = emailConfig;
