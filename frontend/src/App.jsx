import { useState, useEffect, useRef } from "react";
import React from "react";
import axios from "axios";
import { MessageItem } from "./MessageListWithCode";
import LeftPanel from "./LeftPanel";
import { MdSend } from "react-icons/md";
import { FaSpinner } from "react-icons/fa";
import ChatHeader from "./ChatHeader";

const SESSION_KEY = "create_ai_session_id";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [leftSourceCode, setLeftSourceCode] = useState(null);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem(SESSION_KEY) || null;
  });
  const lastReplyRef = useRef("");
  const endRef = useRef(null);

  const handleSend = async (text) => {
    setLoading(true);
    try {
      const payload = { text };
      if (sessionId) payload.session_id = sessionId;

      const response = await axios.post(backendUrl, payload);
      const data = response.data;
      if (data?.session_id) {
        setSessionId(data.session_id);
        try {
          localStorage.setItem(SESSION_KEY, data.session_id);
        } catch (e) {
          console.warn("Failed to persist session id:", e);
        }
      }

      if (data?.response) {
        setReply({ parsed: data.response });
      } else if (data?.raw) {
        setReply({ raw: data.raw });
      } else {
        setReply({ raw: "⚠️ Unexpected backend response" });
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setReply({ raw: "⚠️ Unable to connect to backend" });
    } finally {
      setLoading(false);
    }
  };
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages((m) => [
      ...m,
      { id: Date.now() + Math.random(), role: "user", text: userText },
    ]);
    await handleSend(userText);
    setInput("");
  };

  useEffect(() => {
    if (!reply) return;

    const replyFingerprint = reply.parsed ? reply.parsed.code : reply.raw;
    if (!replyFingerprint) return;

    if (replyFingerprint === lastReplyRef.current) return;

    if (reply.parsed) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + Math.random(),
          role: "assistant",
          text: reply.parsed.code,
          code: reply.parsed.code,
          explanation: reply.parsed.explanation,
        },
      ]);
      if (reply.parsed.code) {
        setLeftSourceCode(reply.parsed.code);
      }
    } else {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + Math.random(),
          role: "assistant",
          text: reply.raw,
        },
      ]);
    }

    lastReplyRef.current = replyFingerprint;
    setReply(null);
  }, [reply]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const resetSession = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.warn("Failed to remove session key:", e);
    }
    setSessionId(null);
    setMessages([]);
    setLeftSourceCode(null);
    lastReplyRef.current = "";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex h-screen">
        <LeftPanel sourceCode={leftSourceCode} />

        <div className="w-2/5 p-6 flex flex-col">
          <div className="max-w-full w-full mx-auto flex flex-col h-full">
            <ChatHeader sessionId={sessionId} resetSession={resetSession} />

            <div className="flex-1 overflow-y-auto mb-4 px-2">
              <div className="space-y-4 max-w-full">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 mt-8">
                    No messages yet. Type something to start.
                  </div>
                )}

                {messages.map((msg) => (
                  <MessageItem key={msg.id} msg={msg} />
                ))}
                <div ref={endRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="mt-2">
              <div className="flex gap-3">
                <textarea
                  disabled={loading}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Type your message..."
                  className="flex-1 resize-none rounded-lg p-3 bg-gray-900 text-white border border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  aria-label={loading ? "Thinking" : "Send message"}
                  aria-busy={loading}
                  title={loading ? "Thinking..." : "Send"}
                  className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400
    ${loading
                      ? "bg-blue-400 cursor-not-allowed text-white shadow-none"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"}
  `}
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" style={{ fontSize: 18 }} aria-hidden="true" />
                  ) : (
                    <MdSend style={{ fontSize: 18 }} aria-hidden="true" />
                  )}

                  <span>{loading ? "Thinking..." : "Send"}</span>
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
