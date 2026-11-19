import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
} from 'antd';
import { SendOutlined, ShopOutlined } from '@ant-design/icons';
import { api } from '../api/api';
import { errorMessage } from '../utils/errors';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

type Thread = {
  ma_tai_khoan: number;
  ho_ten: string;
  ten_dang_nhap: string;
  noi_dung: string;
  ngay_gui: string;
  chua_doc: number;
  ben_gui: string;
};
type Message = {
  ma_tin_nhan: string;
  ben_gui: string;
  noi_dung: string;
  ngay_gui: string;
  ngay_doc: string | null;
};
export default function StoreInbox({ active = true }: { active?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]),
    [selected, setSelected] = useState<Thread | null>(null),
    [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState(''),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [more, setMore] = useState(false);
  const query = useDebouncedValue(search),
    current = useRef<number | null>(null),
    bottom = useRef(true),
    body = useRef<HTMLDivElement>(null),
    lock = useRef(false);
  const drafts = useRef(new Map<number, string>()),
    pending = useRef(new Map<number, { body: string; id: string }>());
  const latest = useRef<string>();
  const marked = useRef('0');
  useEffect(() => {
    if (!active) return;
    let mounted = true,
      busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const r = await api.get('/inbox/threads', {
          params: { search: query },
        });
        if (mounted) {
          setThreads(r.data.data);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setError(errorMessage(e));
          setLoading(false);
        }
      } finally {
        busy = false;
      }
    };
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [query, active]);
  const id = selected?.ma_tai_khoan;
  const loadThread = useCallback(
    async (before?: string) => {
      if (!id) return;
      try {
        const r = await api.get(`/inbox/threads/${id}`, {
          params: before
            ? { before }
            : latest.current
              ? { after: latest.current }
              : undefined,
        });
        if (current.current !== id) return;
        const incoming: Message[] = r.data.data.messages;
        const last = incoming[incoming.length - 1];
        const first = !latest.current;
        if (last && Number(last.ma_tin_nhan) > Number(latest.current || 0))
          latest.current = last.ma_tin_nhan;
        setMessages((old) =>
          [
            ...new Map(
              [...old, ...incoming].map((m) => [m.ma_tin_nhan, m]),
            ).values(),
          ]
            .map((m) =>
              m.ben_gui === 'CuaHang' &&
              Number(m.ma_tin_nhan) <= Number(r.data.data.seenThrough || 0)
                ? { ...m, ngay_doc: r.data.data.seenAt }
                : m,
            )
            .sort((a, b) => Number(a.ma_tin_nhan) - Number(b.ma_tin_nhan)),
        );
        if (before || first) setMore(r.data.data.hasMore);
        setError('');
        if (
          !document.hidden &&
          bottom.current &&
          latest.current &&
          Number(latest.current) > Number(marked.current)
        ) {
          const upTo = latest.current;
          await api.post(`/inbox/threads/${id}/read`, { up_to: upTo });
          if (current.current === id) {
            marked.current = upTo;
            setThreads((old) =>
              old.map((t) =>
                t.ma_tai_khoan === id ? { ...t, chua_doc: 0 } : t,
              ),
            );
          }
        }
      } catch (e) {
        if (current.current === id) setError(errorMessage(e));
      }
    },
    [id],
  );
  useEffect(() => {
    if (!active) return;
    current.current = id || null;
    latest.current = undefined;
    marked.current = '0';
    setMessages([]);
    setMore(true);
    bottom.current = true;
    setText(id ? drafts.current.get(id) || '' : '');
    setError('');
    void loadThread();
    let busy = false;
    const timer = setInterval(() => {
      if (!document.hidden && !busy) {
        busy = true;
        void loadThread().finally(() => {
          busy = false;
        });
      }
    }, 4000);
    return () => {
      current.current = null;
      clearInterval(timer);
    };
  }, [id, loadThread, active]);
  useEffect(() => {
    if (bottom.current && body.current)
      body.current.scrollTop = body.current.scrollHeight;
  }, [messages]);
  const send = async () => {
    const value = text.trim();
    if (!id || !value || lock.current) return;
    lock.current = true;
    setSending(true);
    if (pending.current.get(id)?.body !== value)
      pending.current.set(id, {
        body: value,
        id:
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      });
    try {
      await api.post(`/inbox/threads/${id}`, {
        noi_dung: value,
        request_id: pending.current.get(id)!.id,
      });
      drafts.current.delete(id);
      pending.current.delete(id);
      if (current.current === id) {
        setText('');
        bottom.current = true;
        await loadThread();
      }
    } catch (e) {
      if (current.current === id) setError(errorMessage(e));
    } finally {
      lock.current = false;
      setSending(false);
    }
  };
  return (
    <div className="store-inbox">
      <aside className="inbox-list">
        <div className="inbox-list-heading">
          <strong>Cuộc trò chuyện</strong>
          <Input.Search
            aria-label="Tìm cuộc trò chuyện"
            placeholder="Tìm khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>
        {loading ? (
          <Spin />
        ) : !threads.length ? (
          <Empty description="Chưa có cuộc trò chuyện" />
        ) : (
          threads.map((t) => (
            <button
              className={`inbox-person ${id === t.ma_tai_khoan ? 'selected' : ''}`}
              key={t.ma_tai_khoan}
              onClick={() => setSelected(t)}
            >
              <Avatar>{t.ho_ten?.charAt(0)}</Avatar>
              <span className="inbox-person-copy">
                <strong>{t.ho_ten || t.ten_dang_nhap}</strong>
                <small>
                  {t.ben_gui === 'CuaHang' ? 'Cửa hàng: ' : ''}
                  {t.noi_dung}
                </small>
              </span>
              <Badge count={Number(t.chua_doc)} />
            </button>
          ))
        )}
      </aside>
      <section className="inbox-conversation">
        {selected ? (
          <>
            <div className="inbox-conversation-heading">
              <Space>
                <ShopOutlined />
                <strong>{selected.ho_ten}</strong>
                <Tag>{selected.ten_dang_nhap}</Tag>
              </Space>
              <Button onClick={() => void loadThread()}>Làm mới</Button>
            </div>
            {error && <Alert type="error" showIcon message={error} />}
            <div
              ref={body}
              className="inbox-messages"
              onScroll={(e) => {
                const el = e.currentTarget;
                bottom.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
            >
              {more && messages.length > 0 && (
                <Button
                  type="link"
                  onClick={() => {
                    bottom.current = false;
                    void loadThread(messages[0].ma_tin_nhan);
                  }}
                >
                  Tải tin nhắn trước
                </Button>
              )}
              {messages.map((m) => (
                <div
                  className={`inbox-bubble ${m.ben_gui === 'CuaHang' ? 'outgoing' : 'incoming'}`}
                  key={m.ma_tin_nhan}
                >
                  <div>{m.noi_dung}</div>
                  <small>
                    {new Date(m.ngay_gui).toLocaleString('vi-VN')}
                    {m.ben_gui === 'CuaHang'
                      ? m.ngay_doc
                        ? ' · Đã xem'
                        : ' · Đã gửi'
                      : ''}
                  </small>
                </div>
              ))}
            </div>
            <div className="inbox-composer">
              <Input.TextArea
                aria-label="Tin nhắn cho khách hàng"
                placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                autoSize={{ minRows: 2, maxRows: 5 }}
                maxLength={5000}
                disabled={sending}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  drafts.current.set(id!, e.target.value);
                }}
                onPressEnter={(e) => {
                  if (!e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button
                aria-label="Gửi"
                type="primary"
                icon={<SendOutlined />}
                loading={sending}
                disabled={!text.trim()}
                onClick={() => void send()}
              >
                Gửi
              </Button>
            </div>
          </>
        ) : (
          <div className="inbox-placeholder">
            {error ? (
              <Alert type="error" message={error} />
            ) : (
              <Empty description="Chọn một khách hàng để đọc và trả lời tin nhắn" />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
