import React, { useEffect, useRef, useState } from "react";
import ToolBar from "./ToolBar";
import * as FiIcons from "react-icons/fi";
import * as FaIcons from "react-icons/fa";
import * as MdIcons from "react-icons/md";


class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidUpdate(prevProps) {
        if (this.state.hasError && prevProps.children !== this.props.children) {
            this.setState({ hasError: false, error: null });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="text-red-500 p-4">
                    Component crashed: {this.state.error && this.state.error.message}
                </div>
            );
        }
        return this.props.children;
    }
}

export default function LeftPanel({ sourceCode }) {
    const [DynamicComp, setDynamicComp] = useState(null);
    const blobUrlRef = useRef(null);
    const lastLoadedRef = useRef("");
    const lastReloadKeyRef = useRef(0);
    const [reloadKey, setReloadKey] = useState(0);
    const [theme, setTheme] = useState("dark"); // 'dark' | 'light'
    const [device, setDevice] = useState("desktop"); // 'mobile' | 'tablet' | 'desktop'

    const deviceSizes = {
        mobile: 390,
        tablet: 768,
        desktop: "100%",
    };



    useEffect(() => {
        if (!sourceCode) {
            setDynamicComp(null);
            lastLoadedRef.current = "";
            return;
        }

        let cancelled = false;

        const forceReload = reloadKey !== lastReloadKeyRef.current;

        if (sourceCode === lastLoadedRef.current && !forceReload) {
            return;
        }

        lastReloadKeyRef.current = reloadKey;
        async function loadAndRenderComponent(source) {
            try {
                setDynamicComp(null);

                window.React = window.React || React;
                window.FiIcons = window.FiIcons || (typeof FiIcons !== "undefined" ? FiIcons : {});
                window.FaIcons = window.FaIcons || (typeof FaIcons !== "undefined" ? FaIcons : {});
                window.MdIcons = window.MdIcons || (typeof MdIcons !== "undefined" ? MdIcons : {});

                let finalCode = (source || "").trim();

                let detectedName = null;
                const nameMatchers = [
                    /\bexport\s+default\s+([A-Za-z0-9_$]+)/m,             // `export default Name;`
                    /\bfunction\s+([A-Za-z0-9_$]+)\s*\(/m,                // `function Name(...)`
                    /\bclass\s+([A-Za-z0-9_$]+)\b/m,                      // `class Name`
                    /\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:\(|async|\w)/m // `const Name = (...) =>`
                ];
                for (const rx of nameMatchers) {
                    const m = finalCode.match(rx);
                    if (m && m[1]) {
                        detectedName = m[1];
                        break;
                    }
                }

                const hasExportDefault = /\bexport\s+default\b/.test(finalCode);
                if (hasExportDefault && !detectedName) {
                    const tempName = "__defaultExport";
                    finalCode = finalCode.replace(/\bexport\s+default\b/, `var ${tempName} =`);
                    detectedName = tempName;
                }

                finalCode = finalCode
                    .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/gim, "")
                    .replace(/^\s*import\s+['"][^'"]+['"];?/gim, "")
                    .replace(/\bexport\s+default\s+[A-Za-z0-9_$]+\s*;?/gim, "")
                    .replace(/\bexport\s*\{[\s\S]*?\};?/gim, "")
                    .replace(/\bexport\s+(function|const|let|var|class)\s+/gim, "$1 ")
                    .replace(/(?:const|let|var)\s+[A-Za-z0-9_$,\s{}]+\s*=\s*require\(['"][^'"]+['"]\);?/gim, "")
                    .replace(/require\(['"][^'"]+['"]\);?/gim, "");

                finalCode = finalCode
                    .replace(/<\s*(\/?)\s*(Fi[A-Za-z0-9_]+)/g, "<$1window.FiIcons.$2")
                    .replace(/<\s*(\/?)\s*(Fa[A-Za-z0-9_]+)/g, "<$1window.FaIcons.$2")
                    .replace(/<\s*(\/?)\s*(Md[A-Za-z0-9_]+)/g, "<$1window.MdIcons.$2");

                const usedIcons = [
                    ...new Set([
                        ...(finalCode.match(/\bFa[A-Za-z0-9_]+\b/g) || []),
                        ...(finalCode.match(/\bFi[A-Za-z0-9_]+\b/g) || []),
                        ...(finalCode.match(/\bMd[A-Za-z0-9_]+\b/g) || []),
                    ]),
                ];

                const iconVarDeclarations = usedIcons
                    .map((name) => {
                        const sourceObj =
                            name.startsWith("Fa") ? "window.FaIcons" : name.startsWith("Fi") ? "window.FiIcons" : "window.MdIcons";
                        return `if (typeof ${name} === "undefined") { try { var ${name} = (${sourceObj} && ${sourceObj}.${name}) || undefined; } catch(e) { var ${name} = undefined; } }`;
                    })
                    .join("\n");

                const hookNames = ["useState", "useEffect", "useRef", "useMemo", "useCallback", "useLayoutEffect", "useContext"];
                const hookBindings = hookNames.map((h) => `if (typeof ${h} === "undefined") { var ${h} = React && React.${h}; }`).join("\n");

                if (!window.Babel || typeof window.Babel.transform !== "function") {
                    throw new Error("Babel not loaded. Add Babel standalone to index.html.");
                }
                const transformed = window.Babel.transform(finalCode, { presets: ["react"] }).code;

                const assignDefaultInsideTry = detectedName
                    ? `\n    try { if (typeof ${detectedName} !== "undefined" && ${detectedName}) { exports.default = ${detectedName}; module.exports.default = ${detectedName}; } } catch(e) { /* ignore */ }\n`
                    : "";

                const wrapped = `
/* Loader wrapper - isolates user code to avoid top-level collisions */
const __module = (function () {
  var React = window.React;
  var FiIcons = window.FiIcons || {};
  var FaIcons = window.FaIcons || {};
  var MdIcons = window.MdIcons || {};
  ${iconVarDeclarations}
  ${hookBindings}

  var exports = {};
  var module = { exports: exports };

  try {
${transformed}
    ${assignDefaultInsideTry}
  } catch (err) {
    // rethrow to outer scope
    throw err;
  }

  // prefer explicit exports.default if set
  if (typeof exports !== "undefined" && exports && exports.default) return { default: exports.default };
  if (typeof module !== "undefined" && module && module.exports && module.exports.default) return { default: module.exports.default };

  // common fallbacks
  if (typeof defaultExport !== "undefined" && defaultExport) return { default: defaultExport };
  if (typeof _default !== "undefined" && _default) return { default: _default };

  return { default: null };
})();
export default __module.default;
`;

                const blob = new Blob([wrapped], { type: "text/javascript" });
                const url = URL.createObjectURL(blob);

                if (blobUrlRef && blobUrlRef.current) {
                    try { URL.revokeObjectURL(blobUrlRef.current); } catch (e) { /* ignore */ }
                }
                if (blobUrlRef) blobUrlRef.current = url;

                const imported = await import(/* @vite-ignore */ url);
                const Comp = imported && imported.default ? imported.default : null;

                if (!Comp) {
                    console.error("Dynamic component load produced no default export. Detected name:", detectedName);
                    throw new Error("No default export found in code (component not detected). Check console for transformed source.");
                }

                lastLoadedRef.current = source;
                setDynamicComp(() => React.lazy(() => Promise.resolve({ default: Comp })));
            } catch (err) {
                console.error("Dynamic component load failed:", err);
                setDynamicComp(() => () => (
                    <div className="text-red-500 text-sm p-4">
                        Failed to load component: {err.message}
                    </div>
                ));
            }
        }


        loadAndRenderComponent(sourceCode);

        return () => {
            cancelled = true;
            if (blobUrlRef.current) {
                try {
                    URL.revokeObjectURL(blobUrlRef.current);
                } catch (e) { }
                blobUrlRef.current = null;
            }
        };
    }, [sourceCode, reloadKey]);

    function handleReload() {
        setReloadKey((k) => k + 1);
    }

    function toggleTheme() {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
    }

    function chooseDevice(d) {
        setDevice(d);
    }

    const sandboxBg = theme === "dark" ? "black" : "white";
    const sandboxColor = theme === "dark" ? "black" : "white";

    const deviceWidth = deviceSizes[device];

    return (
        <div className="w-3/5 border-r p-4 overflow-auto text-gray-200" style={{ minHeight: 0 }}>
            <ToolBar device={device} chooseDevice={chooseDevice} theme={theme} toggleTheme={toggleTheme} handleReload={handleReload} />

            <div
                className="w-full h-[90vh] flex items-center justify-center"
                style={{
                    background: sandboxBg,
                    color: sandboxColor,
                    borderRadius: 8,
                    padding: 12,
                    boxSizing: 'border-box',
                }}
            >
                <div
                    className="rounded-lg border"
                    style={{
                        width: typeof deviceWidth === 'number' ? deviceWidth : deviceWidth,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'auto',
                        background: theme === 'dark' ? 'black' : 'white',
                        boxShadow: '0 6px 18px rgba(2,6,23,0.4)',
                        padding: 8,
                        boxSizing: 'border-box',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                        }}
                    >
                        {DynamicComp ? (
                            <React.Suspense fallback={<div>Loading component...</div>}>
                                <ErrorBoundary>
                                    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                                        <DynamicComp isDark={theme === 'dark'} themeMode={theme} />
                                    </div>
                                </ErrorBoundary>
                            </React.Suspense>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Left Panel</h2>
                                <p style={{ marginTop: 6, marginBottom: 0 }}>Waiting for component from backend...</p>
                                <p style={{ marginTop: 6, fontSize: 12 }}>Use the reload button to re-run the last code.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
