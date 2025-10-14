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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 768);
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (isMobile) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white text-lg">
        Device not supported. Please use a tablet or desktop.
      </div>
    );
  }


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
    <div className="min-h-screen flex justify-center items-center bg-black text-white">

      <h1 className="text-2xl font-bold ">Soon To be deployed</h1>
    </div>
  );
}

export default App;
