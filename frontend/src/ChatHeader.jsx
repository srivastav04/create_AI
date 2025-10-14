import React, { useState } from "react";

function ChatHeader({ sessionId, resetSession }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!sessionId) return;
        try {
            await navigator.clipboard.writeText(sessionId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // ignore copy failures silently
        }
    };

    return (
        <header className="w-full pb-4 mb-4 border-b border-gray-800 flex items-center justify-between">
            {/* Left side: title */}
            <h1 className="text-xl font-semibold text-blue-400 flex items-center gap-2 select-none">

                <span>Create.AI</span>
            </h1>

            {/* Right side: session + reset */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-xs text-gray-500">session</span>

                    <span
                        className="font-mono text-sm px-2 py-1 bg-gray-900 rounded-md border border-gray-800 text-gray-200"
                        title={sessionId || "no session"}
                    >
                        {sessionId ? sessionId.slice(0, 8) : "none"}
                    </span>



                </div>

                <button
                    onClick={resetSession}
                    className="text-xs px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 transition-shadow shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Reset session"
                >
                    Reset
                </button>
            </div>
        </header>

    );
}

export default ChatHeader;
