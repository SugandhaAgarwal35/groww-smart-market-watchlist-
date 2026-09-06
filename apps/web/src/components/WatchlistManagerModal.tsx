import React, { useState } from "react";
import type { Watchlist } from "@watchlist/contracts";

interface WatchlistManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  onSelectWatchlist: (id: string) => void;
  onCreateWatchlist: (name: string) => Promise<void>;
  onRenameWatchlist: (id: string, newName: string) => Promise<void>;
  onDeleteWatchlist: (id: string) => Promise<void>;
}

export const WatchlistManagerModal: React.FC<WatchlistManagerModalProps> = ({
  isOpen,
  onClose,
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
}) => {
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateWatchlist(newWatchlistName.trim());
      setNewWatchlistName("");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create watchlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRename = (w: Watchlist) => {
    setEditingId(w.id);
    setEditingName(w.name);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onRenameWatchlist(id, editingName.trim());
      setEditingId(null);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to rename watchlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (watchlists.length <= 1) {
      setError("Cannot delete your only watchlist.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onDeleteWatchlist(id);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to delete watchlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative w-full max-w-md bg-white border border-[#EAECF0] rounded-2xl shadow-xl p-5 text-[#1E222D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EAECF0]">
          <div>
            <h3 className="text-base font-bold font-display">Manage Watchlists</h3>
            <p className="text-xs text-[#7C7E8C] mt-0.5">
              Create, rename, or switch between custom tracked lists
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C7E8C] hover:text-[#1E222D] hover:bg-[#F2F4F7]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#FDF2F2] border border-[#EB5757]/30 text-xs text-[#EB5757] font-medium">
            {error}
          </div>
        )}

        {/* List of Watchlists */}
        <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
          {watchlists.map((w) => {
            const isActive = w.id === activeWatchlistId;
            const isEditing = editingId === w.id;

            return (
              <div
                key={w.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  isActive
                    ? "border-[#00D09C] bg-[#E6F9F5]/40 shadow-2xs"
                    : "border-[#EAECF0] hover:bg-[#F8F9FA]"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full text-xs font-semibold px-2 py-1 border border-[#00D09C] rounded-lg focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(w.id)}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-[#00D09C] rounded-lg hover:bg-[#00B386]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs text-[#7C7E8C] hover:text-[#1E222D]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => {
                        onSelectWatchlist(w.id);
                        onClose();
                      }}
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1E222D] truncate">
                          {w.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-[#00B386] bg-[#E6F9F5] px-1.5 py-0.2 rounded-md">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartRename(w)}
                        title="Rename"
                        className="p-1 rounded text-[#7C7E8C] hover:text-[#1E222D] hover:bg-[#EAECF0]"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(w.id, w.name)}
                        title="Delete"
                        className="p-1 rounded text-[#EB5757] hover:bg-[#FDF2F2]"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Create New Watchlist Form */}
        <form onSubmit={handleCreate} className="pt-3 border-t border-[#EAECF0] flex gap-2">
          <input
            type="text"
            placeholder="New watchlist name..."
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 text-xs border border-[#EAECF0] rounded-xl focus:border-[#00D09C] focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newWatchlistName.trim()}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#00D09C] hover:bg-[#00B386] rounded-xl transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "+ Add"}
          </button>
        </form>
      </div>
    </div>
  );
};
