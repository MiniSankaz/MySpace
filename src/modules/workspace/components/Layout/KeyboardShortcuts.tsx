import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface KeyboardShortcutsProps {
  theme: "dark" | "light";
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ theme }) => {
  const [showHelp, setShowHelp] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "?") {
        e.preventDefault();
        setShowHelp(!showHelp);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp]);

  const shortcuts = [
    {
      category: "General",
      items: [
        { keys: ["⌘", "K"], description: "Quick actions" },
        { keys: ["⌘", "\\"], description: "Toggle sidebar" },
        { keys: ["⌘", "⇧", "D"], description: "Toggle theme" },
        { keys: ["⌘", "⇧", "F"], description: "Fullscreen terminal" },
        { keys: ["⌘", "⇧", "?"], description: "Show keyboard shortcuts" },
      ],
    },
    {
      category: "Projects",
      items: [
        { keys: ["⌘", "N"], description: "New project" },
        { keys: ["⌘", "O"], description: "Open project" },
        { keys: ["⌘", "W"], description: "Close project" },
        { keys: ["⌘", "⇧", "P"], description: "Project settings" },
      ],
    },
    {
      category: "Terminal",
      items: [
        { keys: ["⌘", "T"], description: "New terminal tab" },
        { keys: ["⌘", "⇧", "T"], description: "New Claude terminal" },
        { keys: ["⌘", "D"], description: "Split terminal" },
        { keys: ["⌘", "⇧", "C"], description: "Copy from terminal" },
        { keys: ["⌘", "⇧", "V"], description: "Paste to terminal" },
      ],
    },
    {
      category: "Navigation",
      items: [
        { keys: ["⌘", "P"], description: "Search files" },
        { keys: ["⌘", "⇧", "E"], description: "File explorer" },
        { keys: ["⌘", "1-9"], description: "Switch to tab" },
        { keys: ["⌘", "←/→"], description: "Navigate tabs" },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {showHelp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`relative w-full max-w-4xl max-h-[80vh] ${theme === "dark" ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={`px-6 py-4 border-b ${theme === "dark" ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className={`p-1 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"} transition-colors`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[60vh] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shortcuts.map((section) => (
                  <div key={section.category}>
                    <h3
                      className={`text-sm font-semibold uppercase tracking-wider mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {section.category}
                    </h3>
                    <div className="space-y-2">
                      {section.items.map((shortcut, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700/50" : "hover:bg-gray-50"} transition-colors`}
                        >
                          <span
                            className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                          >
                            {shortcut.description}
                          </span>
                          <div className="flex items-center space-x-1">
                            {shortcut.keys.map((key, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && (
                                  <span
                                    className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                                  >
                                    +
                                  </span>
                                )}
                                <kbd
                                  className={`px-2 py-1 text-xs font-medium ${theme === "dark" ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-300"} border rounded`}
                                >
                                  {key}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div
              className={`px-6 py-3 border-t ${theme === "dark" ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                >
                  Press{" "}
                  <kbd
                    className={`px-1.5 py-0.5 mx-1 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} rounded text-xs`}
                  >
                    ⌘⇧?
                  </kbd>{" "}
                  to toggle this help
                </p>
                <button
                  onClick={() => setShowHelp(false)}
                  className={`px-4 py-2 text-sm font-medium ${theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white rounded-lg transition-colors`}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcuts;
