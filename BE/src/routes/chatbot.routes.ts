import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { answerChat, validateChat } from '../services/chatbot.service.js';
import { CheckoutError } from '../utils/checkout.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();
router.post('/', authenticate, rateLimit(10), async (req, res) => {
  try { return sendSuccess(res, 'Trợ lý ElectricShop', await answerChat(validateChat(req.body))); }
  catch (error) {
    if (error instanceof CheckoutError) return sendError(res, error.status, error.message);
    return sendError(res, 503, 'Trợ lý tạm thời không phản hồi. Bạn có thể thử lại hoặc gửi yêu cầu tại mục Liên hệ.');
  }
});
export default router;
