import React, { useState } from "react";
import type { ThemePreference, DisplayDensity } from "@watchlist/contracts";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemePreference;
  currentDensity: DisplayDensity;
  onSavePreferences: (theme: ThemePreference, density: DisplayDensity) => Promise<void>;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  currentDensity,
  onSavePreferences,
}) => {
  const [theme, setTheme] = useState<ThemePreference>(currentTheme);
  const [density, setDensity] = useState<DisplayDensity>(currentDensity);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePreferences(theme, density);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative w-full max-w-sm bg-white border border-[#EAECF0] rounded-2xl shadow-xl p-5 text-[#1E222D]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EAECF0]">
          <div>
            <h3 className="text-base font-bold font-display">Watchlist Preferences</h3>
            <p className="text-xs text-[#7C7E8C] mt-0.5">Persisted across all your sessions</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C7E8C] hover:text-[#1E222D] hover:bg-[#F2F4F7]"
          >
            ✕
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Theme Selection */}
          <div>
            <label className="text-xs font-bold text-[#44475B] block mb-2">Theme Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "light", label: "☀️ Light" },
                { id: "dark", label: "🌙 Dark" },
                { id: "system", label: "💻 System" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as ThemePreference)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    theme === t.id
                      ? "border-[#00D09C] bg-[#E6F9F5] text-[#00B386]"
                      : "border-[#EAECF0] text-[#7C7E8C] hover:bg-[#F8F9FA]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Density Selection */}
          <div>
            <label className="text-xs font-bold text-[#44475B] block mb-2">Display Density</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "comfortable", label: "Comfortable" },
                { id: "compact", label: "Compact" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDensity(d.id as DisplayDensity)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    density === d.id
                      ? "border-[#00D09C] bg-[#E6F9F5] text-[#00B386]"
                      : "border-[#EAECF0] text-[#7C7E8C] hover:bg-[#F8F9FA]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#EAECF0] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[#7C7E8C] hover:text-[#1E222D]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00D09C] hover:bg-[#00B386] rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
};
