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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`relative border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
        isDragging
          ? "border-kahoot-yellow bg-kahoot-purple-light/50 scale-105"
          : "border-white/40 bg-kahoot-purple-light/20 hover:border-white/60 hover:bg-kahoot-purple-light/30"
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

      <div className="text-6xl mb-4">💬</div>

      {fileName ? (
        <div>
          <p className="text-xl font-bold text-kahoot-yellow">{fileName}</p>
          <p className="text-white/60 mt-2">לחצו כדי להחליף קובץ</p>
        </div>
      ) : (
        <div>
          <p className="text-xl font-bold mb-2">
            גררו לכאן קובץ ייצוא וואטסאפ
          </p>
          <p className="text-white/60">או לחצו כדי לבחור קובץ (.txt)</p>
        </div>
      )}
    </motion.div>
  );
}
