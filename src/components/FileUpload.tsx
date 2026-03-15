"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

export default function FileUpload({ onFileSelected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".txt")) {
        setFileName(file.name);
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`relative rounded-xl cursor-pointer transition-all duration-200 ${
        isDragging
          ? "bg-wa-green/10 ring-2 ring-wa-green scale-[1.02]"
          : fileName
            ? "bg-wa-panel border border-wa-green/30"
            : "bg-wa-panel border border-wa-border/30 hover:border-wa-text-secondary/30"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".txt"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex items-center gap-4 px-4 py-5">
        {/* Attachment icon — WhatsApp style */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
          fileName ? "bg-wa-green/20" : "bg-wa-input"
        }`}>
          {fileName ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#00A884">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#8696A0">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {fileName ? (
            <>
              <p className="text-sm font-bold text-wa-green truncate">{fileName}</p>
              <p className="text-wa-text-secondary text-xs mt-0.5">לחצו כדי להחליף</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">העלו קובץ ייצוא וואטסאפ</p>
              <p className="text-wa-text-secondary text-xs mt-0.5">גררו או לחצו לבחירת קובץ (.txt)</p>
            </>
          )}
        </div>

        {/* Arrow */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#8696A0" className="shrink-0 rotate-180">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </div>
    </motion.div>
  );
}
