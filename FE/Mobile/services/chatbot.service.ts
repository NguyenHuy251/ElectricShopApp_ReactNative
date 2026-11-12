import api from './api';

export interface ChatMessage { role: 'user' | 'assistant'; text: string }
export interface ChatProduct { ma_san_pham: number; ten_san_pham: string; gia_ban: number | string }
export const chatbotService = {
  ask: async (message: string, history: ChatMessage[], signal?: AbortSignal) => {
    const response = await api.post<{ data: { reply: string; products: ChatProduct[] } }>('/chatbot', { message, history: history.slice(-8) }, { timeout: 30000, signal });
    return response.data.data;
  },
};
