import express from 'express';
import { sendMail } from '../../utils/mailer.js';

const router = express.Router();

router.post('/send', async (req, res, next) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ success: false, message: 'Recipient (to) and subject are required.' });
    }

    const result = await sendMail({ to, subject, text, html });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
