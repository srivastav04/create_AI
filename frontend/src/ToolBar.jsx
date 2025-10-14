import React from "react";
import {
    MdRefresh,
    MdWbSunny,
    MdDarkMode,
    MdPhoneIphone,
    MdTabletAndroid,
    MdDesktopMac
} from "react-icons/md";

const ToolBar = ({ device, chooseDevice, theme, toggleTheme, handleReload }) => {
    return (
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-transparent rounded-lg p-1">
                    <button
                        onClick={handleReload}
                        aria-label="Reload component"
                        title="Reload component"
                        className="p-2 rounded-md border border-transparent hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                    >
                        <MdRefresh size={18} />
                    </button>
                    <button
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        title="Toggle theme"
                        className="p-2 rounded-md border border-transparent hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                    >
                        {theme === "dark" ? <MdWbSunny size={18} /> : <MdDarkMode size={18} />}
                    </button>

                    <div className="flex items-center gap-1 ml-2 bg-gray-900/10 dark:bg-white/6 rounded-full p-1">
                        <button
                            onClick={() => chooseDevice("mobile")}
                            title="Mobile (≈390px)"
                            aria-pressed={device === "mobile"}
                            className={`p-2 rounded-full transition focus:outline-none focus:ring-2 ${device === "mobile"
                                ? "bg-indigo-600/20 ring-2 ring-indigo-400"
                                : "hover:bg-gray-700/20"
                                }`}
                        >
                            <MdPhoneIphone size={16} />
                        </button>

                        <button
                            onClick={() => chooseDevice("tablet")}
                            title="Tablet (≈768px)"
                            aria-pressed={device === "tablet"}
                            className={`p-2 rounded-full transition focus:outline-none focus:ring-2 ${device === "tablet"
                                ? "bg-indigo-600/20 ring-2 ring-indigo-400"
                                : "hover:bg-gray-700/20"
                                }`}
                        >
                            <MdTabletAndroid size={16} />
                        </button>

                        <button
                            onClick={() => chooseDevice("desktop")}
                            title="Desktop (full width)"
                            aria-pressed={device === "desktop"}
                            className={`p-2 rounded-full transition focus:outline-none focus:ring-2 ${device === "desktop"
                                ? "bg-indigo-600/20 ring-2 ring-indigo-400"
                                : "hover:bg-gray-700/20"
                                }`}
                        >
                            <MdDesktopMac size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="text-sm text-gray-400 select-none">
                {device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile"}
            </div>
        </div>
    )
}

export default ToolBar
