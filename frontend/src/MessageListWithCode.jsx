
import React, { useState } from "react";

function stripFences(raw = "") {
    let s = raw.trim();
    // remove leading fence + optional lang
    s = s.replace(/^\s*```[a-zA-Z0-9+-]*\n?/, "");
    // remove trailing fence
    s = s.replace(/```\s*$/, "");
    return s.trim();
}

function MessageItem({ msg }) {
    const isUser = msg.role === "user";

    let code = "";
    let explanation = "";

    if (msg.code && msg.explanation) {
        code = stripFences(msg.code);
        explanation = (msg.explanation || "").trim();

    } else if (typeof msg.text === "string" && /```/.test(msg.text)) {
        const fenced = msg.text.match(/```[a-zA-Z0-9+-]*\n([\s\S]*?)```/);
        if (fenced) {
            code = fenced[1] ?? "";
            explanation = msg.text.replace(fenced[0], "").trim();
        } else {
            code = "";
            explanation = msg.text;
        }
    } else {
        code = "";
        explanation = msg.text;
    }

    const [copied, setCopied] = useState(false);
    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            console.error("copy failed", e);
        }
    }

    const containerAlign = isUser ? "justify-end" : "justify-start";
    const bubbleBase =
        "rounded-lg p-3 max-w-[90%] whitespace-pre-wrap text-sm leading-relaxed";
    const bubbleStyle = isUser
        ? "bg-blue-600 text-white rounded-br-none"
        : "bg-gray-200 text-black rounded-bl-none";

    return (
        <div className={`flex ${containerAlign} mb-2`}>
            <div className={`${bubbleBase} ${bubbleStyle}`}>
                {code ? (
                    <div className="space-y-3">
                        <div className="relative rounded-lg border border-gray-800 bg-gray-900 text-white">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                                    <span className="text-xs font-medium">Code</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={copyToClipboard}
                                        className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 focus:outline-none"
                                        aria-pressed={copied}
                                        aria-label="Copy code"
                                    >
                                        {copied ? (
                                            <span className="text-green-300">Copied</span>
                                        ) : (
                                            <>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16h8M8 12h8m-7-8h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2h1" />
                                                </svg>
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-56 overflow-auto px-3 py-3">
                                <pre className="whitespace-pre-wrap text-xs"><code>{code}</code></pre>
                            </div>
                        </div>

                        {explanation ? (
                            <div className="text-sm text-gray-100">
                                <div className={isUser ? "text-green-500" : "text-black"}>
                                    {explanation}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-sm break-words">{explanation}</div>
                )}
            </div>
        </div>
    );
}

export { MessageItem };
