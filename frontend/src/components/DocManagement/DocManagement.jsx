import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFolder,
  FaPlus,
  FaFileUpload,
  FaTimes,
  FaEdit,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
  FaFilePdf,
  FaFileWord,
  FaFileAlt,
  FaFileCode,
  FaDownload,
  FaEye,
  FaExternalLinkAlt,
  FaSave,
  FaFilter,
} from "react-icons/fa";
import {
  FiFolderPlus,
  FiUpload,
  FiSearch,
  FiX,
  FiFile,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";
import { useDropzone } from "react-dropzone";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { docApi } from '../../utils/api';

/* Custom Select Component */
function CustomSelect({ value, onChange, options, disabled, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Move focus to selected option when opening
  useEffect(() => {
    if (open && listRef.current) {
      const selectedIndex = options.findIndex((opt) => opt.value === value);
      const children = listRef.current.querySelectorAll("[role='option']");
      if (children && children[selectedIndex]) {
        children[selectedIndex].focus();
      } else if (children[0]) {
        children[0].focus();
      }
    }
  }, [open, options, value]);

  const handleToggle = () => {
    if (!disabled) setOpen((v) => !v);
  };

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const handleOptionKeyDown = (e, opt, idx) => {
    const key = e.key;
    const children = listRef.current
      ? Array.from(listRef.current.querySelectorAll("[role='option']"))
      : [];
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      handleSelect(opt);
    } else if (key === "ArrowDown") {
      e.preventDefault();
      const next = children[idx + 1] || children[0];
      next && next.focus();
    } else if (key === "ArrowUp") {
      e.preventDefault();
      const prev = children[idx - 1] || children[children.length - 1];
      prev && prev.focus();
    } else if (key === "Home") {
      e.preventDefault();
      children[0] && children[0].focus();
    } else if (key === "End") {
      e.preventDefault();
      children[children.length - 1] && children[children.length - 1].focus();
    } else if (key === "Escape") {
      setOpen(false);
    }
  };

  const selectedOption =
    options.find((opt) => opt.value === value) || { label: "Choose a topic" };

  return (
    <div ref={rootRef} className="relative inline-block w-full text-sm">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-md px-3 py-2.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span className="truncate" title={selectedOption.label}>
          {selectedOption.label}
        </span>
        {/* custom arrow */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            open ? "transform rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-56 overflow-auto focus:outline-none"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelect(opt)}
                onKeyDown={(e) => handleOptionKeyDown(e, opt, idx)}
                className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition
                  ${isSelected ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700"}`}
              >
                <span className="truncate" title={opt.label}>
                  {opt.label}
                </span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-purple-600"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 10l3 3L15 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper: escape html
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Enhanced DOCX parser that preserves formatting and handles images
async function parseDocxToHtml(arrayBuffer) {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) throw new Error("word/document.xml not found in docx");

    const xmlStr = await docFile.async("string");
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlStr, "application/xml");

    // Parse relationships to map rId -> target path (e.g., media/image1.png)
    const relsFile = zip.file("word/_rels/document.xml.rels");
    const relsMap = {}; // rId -> path in zip (e.g., 'word/media/image1.png')
    if (relsFile) {
      try {
        const relsStr = await relsFile.async("string");
        const relsXml = parser.parseFromString(relsStr, "application/xml");
        const rels = relsXml.getElementsByTagName("Relationship");
        for (let i = 0; i < rels.length; i++) {
          const rel = rels[i];
          const id = rel.getAttribute("Id") || rel.getAttribute("RID") || rel.getAttribute("Id");
          let target = rel.getAttribute("Target") || "";
          if (!id || !target) continue;
          // Normalize target to a path inside the zip
          // Common variants: 'media/image1.png' or '../media/image1.png'
          if (target.startsWith("..")) {
            target = target.replace(/^(\.\.\/)+/, "");
          }
          // Ensure target is under 'word/'
          let fullPath = target.startsWith("word/") ? target : `word/${target}`;
          // Remove any leading './'
          fullPath = fullPath.replace(/^word\/\.\//, "word/");
          relsMap[id] = fullPath;
        }
      } catch (err) {
        // Ignore rel parsing errors but continue (we'll attempt fallback)
        console.warn("Failed to parse document.xml.rels:", err);
      }
    }

    // Function to extract images from the document using relation map
    const imagesByRelId = {};
    // Iterate relsMap and create object URLs for those targets present in zip
    for (const [rid, path] of Object.entries(relsMap)) {
      const imageFile = zip.file(path);
      if (imageFile) {
        try {
          const blob = await imageFile.async("blob");
          imagesByRelId[rid] = URL.createObjectURL(blob);
        } catch (err) {
          console.warn("Failed to create blob for image:", path, err);
        }
      }
    }

    // Additionally, create a fallback map for any direct media files (by path)
    const imagesByPath = {};
    const imageFiles = Object.keys(zip.files).filter(path => path.startsWith('word/media/'));
    for (const imagePath of imageFiles) {
      const imageFile = zip.file(imagePath);
      if (imageFile) {
        try {
          const blob = await imageFile.async('blob');
          imagesByPath[imagePath] = URL.createObjectURL(blob);
        } catch (err) {
          console.warn("Failed to create blob for fallback image:", imagePath, err);
        }
      }
    }

    // Enhanced extractor to handle various formatting and image references
    function extractContentFromNode(node) {
      let out = "";

      // Handle text runs inside this node
      const textRuns = node.getElementsByTagName("w:r");
      for (let ri = 0; ri < textRuns.length; ri++) {
        const run = textRuns[ri];
        const textNodes = run.getElementsByTagName("w:t");
        for (let ti = 0; ti < textNodes.length; ti++) {
          const textNode = textNodes[ti];
          const textContent = textNode.textContent || "";

          if (textContent.trim() === "") {
            out += " ";
            continue;
          }

          // Formatting detection
          const rPr = run.getElementsByTagName("w:rPr")?.[0];
          const isBold = !!(rPr && rPr.getElementsByTagName("w:b")?.[0]);
          const isItalic = !!(rPr && rPr.getElementsByTagName("w:i")?.[0]);
          const isUnderline = !!(rPr && rPr.getElementsByTagName("w:u")?.[0]);

          let formattedText = escapeHtml(textContent);
          if (isBold) formattedText = `<strong>${formattedText}</strong>`;
          if (isItalic) formattedText = `<em>${formattedText}</em>`;
          if (isUnderline) formattedText = `<u>${formattedText}</u>`;

          out += formattedText;
        }
      }

      // Handle images referenced via <w:drawing> ... <a:blip r:embed="rIdX" />
      const drawings = node.getElementsByTagName("w:drawing");
      for (let di = 0; di < drawings.length; di++) {
        const drawing = drawings[di];

        // Try standard blip element
        const blip = drawing.getElementsByTagName("a:blip")?.[0] || drawing.getElementsByTagName("pic:blipFill")?.[0];
        const embedId = blip?.getAttribute("r:embed") || blip?.getAttribute("r:id");

        if (embedId) {
          // Preferred: lookup by relsMap -> imagesByRelId
          const imageUrl = imagesByRelId[embedId] || imagesByPath[relsMap[embedId]] || null;
          if (imageUrl) {
            out += `<img src="${imageUrl}" class="max-w-full h-auto rounded-lg shadow-sm my-4 border border-gray-200" alt="Document image" />`;
            continue;
          }
          // Fallback: sometimes embedId looks like 'rId###' where file name includes that number
          // Try to find matching media file by suffix number
          const suffixMatch = embedId.match(/rId(\d+)/i);
          if (suffixMatch) {
            const fallbackPathCandidate = `word/media/image${suffixMatch[1]}.png`;
            if (imagesByPath[fallbackPathCandidate]) {
              out += `<img src="${imagesByPath[fallbackPathCandidate]}" class="max-w-full h-auto rounded-lg shadow-sm my-4 border border-gray-200" alt="Document image" />`;
              continue;
            }
          }
        }

        // As another fallback, look for <pic:blipFill><a:blip ...> inside drawing
        const blipAlt = drawing.querySelector && drawing.querySelector('a\\:blip, blip');
        const emb = blipAlt && (blipAlt.getAttribute('r:embed') || blipAlt.getAttribute('r:id'));
        if (emb && imagesByRelId[emb]) {
          out += `<img src="${imagesByRelId[emb]}" class="max-w-full h-auto rounded-lg shadow-sm my-4 border border-gray-200" alt="Document image" />`;
          continue;
        }
      }

      // Handle older v:imagedata style references (v:imagedata r:id="rIdX")
      const vImages = node.getElementsByTagName("v:imagedata");
      for (let vi = 0; vi < vImages.length; vi++) {
        const vimg = vImages[vi];
        const rid = vimg.getAttribute("r:id") || vimg.getAttribute("r:embed");
        if (rid && imagesByRelId[rid]) {
          out += `<img src="${imagesByRelId[rid]}" class="max-w-full h-auto rounded-lg shadow-sm my-4 border border-gray-200" alt="Document image" />`;
        }
      }

      // Handle line breaks
      const breaks = node.getElementsByTagName("w:br");
      if (breaks.length > 0) {
        out += "<br/>".repeat(breaks.length);
      }

      // Handle tabs
      const tabs = node.getElementsByTagName("w:tab");
      if (tabs.length > 0) {
        out += "&emsp;".repeat(tabs.length);
      }

      return out;
    }

    const paragraphs = xml.getElementsByTagName("w:p");
    let html = "";

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pHtml = extractContentFromNode(p);

      if (pHtml && pHtml.trim() !== "") {
        // Check if this is a heading (based on style or font size)
        const style = p.getElementsByTagName("w:pStyle")?.[0];
        const styleVal = style?.getAttribute("w:val");

        if (styleVal?.includes("Heading") || styleVal?.includes("Title")) {
          const level = styleVal.includes("1") ? "1" : styleVal.includes("2") ? "2" : "3";
          html += `<h${level} class="text-${level === "1" ? "2xl" : level === "2" ? "xl" : "lg"} font-bold text-gray-900 mb-4 mt-6">${pHtml}</h${level}>`;
        } else {
          html += `<p class="text-gray-700 mb-3 leading-relaxed">${pHtml}</p>`;
        }
      }
    }

    if (!html) html = `<p class="text-gray-700">No extractable content</p>`;
    return html;
  } catch (err) {
    console.error("parseDocxToHtml error", err);
    throw err;
  }
}

// Enhanced Document Viewer Component with improved DOCX viewing
function DocumentViewer({ document, onClose, onSaveDocument }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);

  const isEditableFile = () => {
    const fileType = document.name.split(".").pop()?.toLowerCase();
    return ["txt", "md", "html"].includes(fileType);
  };

  // Convert base64 data URL to Blob
  const dataUrlToBlob = (dataUrl) => {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // Simple markdown -> html converter used for new-tab preview
  const markdownToHtml = (md) => {
    if (!md) return "";
    return md
      .split("\n")
      .map((line) => {
        if (line.startsWith("# ")) {
          return `<h1 class="text-3xl font-bold text-gray-900 mb-6 mt-8 border-b border-gray-200 pb-2">${escapeHtml(
            line.replace("# ", "")
          )}</h1>`;
        } else if (line.startsWith("## ")) {
          return `<h2 class="text-2xl font-bold text-gray-800 mb-4 mt-6">${escapeHtml(
            line.replace("## ", "")
          )}</h2>`;
        } else if (line.startsWith("### ")) {
          return `<h3 class="text-xl font-bold text-gray-700 mb-3 mt-5">${escapeHtml(
            line.replace("### ", "")
          )}</h3>`;
        } else if (line.startsWith("#### ")) {
          return `<h4 class="text-lg font-semibold text-gray-700 mb-2 mt-4">${escapeHtml(
            line.replace("#### ", "")
          )}</h4>`;
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          return `<li class="ml-6 text-gray-700 mb-2 leading-relaxed">${escapeHtml(
            line.replace(/^[-*] /, "")
          )}</li>`;
        } else if (line.startsWith("> ")) {
          return `<blockquote class="border-l-4 border-purple-500 pl-4 italic text-gray-600 mb-4 bg-purple-50 py-2 px-4 rounded-r">${escapeHtml(
            line.replace("> ", "")
          )}</blockquote>`;
        } else if (line.trim() === "") {
          return "<br/>";
        } else {
          return `<p class="text-gray-700 mb-4 leading-relaxed">${escapeHtml(line)}</p>`;
        }
      })
      .join("");
  };

  useEffect(() => {
    const loadDocument = async () => {
      if (document.data) {
        // Convert base64 data URL to Blob for file operations
        const blob = dataUrlToBlob(document.data);
        const file = new File([blob], document.name, { type: document.mime_type });
        setCurrentFile(file);
        
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
        setIsLoading(true);

        const fileType = document.name.split(".").pop()?.toLowerCase();

        if (isEditableFile()) {
          const text = await blob.text();
          setFileContent(text);
          setEditedContent(text);
          setIsLoading(false);
        } else if (fileType === "docx") {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const html = await parseDocxToHtml(arrayBuffer);
            setFileContent(html);
          } catch (err) {
            console.error("DOCX parsing error:", err);
            setFileContent("");
            toast.error("Unable to preview .docx (file may be unsupported)");
          } finally {
            setIsLoading(false);
          }
        } else if (fileType === "pdf") {
          setIsLoading(false);
        } else {
          // fallback try to read as text
          try {
            const text = await blob.text();
            setFileContent(text);
          } catch (err) {
            setFileContent("");
          } finally {
            setIsLoading(false);
          }
        }

        return () => URL.revokeObjectURL(url);
      }
    };

    loadDocument();
  }, [document]);

  const handleDownload = () => {
    if (currentFile) {
      saveAs(currentFile, document.name);
    }
  };

  // Enhanced new tab preview with simple PDF handling
  const openPreviewInNewTab = () => {
    if (!fileUrl && !fileContent) {
      toast.warn("Preview not ready yet.");
      return;
    }

    const fileType = document.name.split(".").pop()?.toLowerCase();
    
    // For PDF files, simply open the PDF URL directly
    if (fileType === "pdf") {
      window.open(fileUrl, '_blank');
      return;
    }

    let innerHtml = "";
    let title = document.name;

    if (fileType === "docx") {
      innerHtml = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-8">
            <div class="prose prose-lg max-w-none">
              <div class="docx-content">
                ${fileContent}
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (fileType === "md") {
      const mdHtml = markdownToHtml(fileContent);
      innerHtml = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-8">
            <div class="prose prose-lg max-w-none">
              ${mdHtml}
            </div>
          </div>
        </div>
      `;
    } else if (fileType === "html") {
      innerHtml = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-8">
            <div class="prose prose-lg max-w-none">
              ${fileContent}
            </div>
          </div>
        </div>
      `;
    } else {
      innerHtml = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-8">
            <pre class="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed bg-gray-50 p-6 rounded-lg border border-gray-200">${escapeHtml(
              fileContent
            )}</pre>
          </div>
        </div>
      `;
    }

    const fullHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${escapeHtml(document.name)} - Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Inter', sans-serif; }
      .docx-content strong { font-weight: 600; color: #1f2937; }
      .docx-content em { font-style: italic; color: #4b5563; }
      .docx-content u { text-decoration: underline; color: #374151; }
      .docx-content img { max-width: 100%; height: auto; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); margin: 1rem 0; border: 1px solid #e5e7eb; }
      .prose { 
        color: #374151;
        line-height: 1.75;
      }
      .prose h1, .prose h2, .prose h3, .prose h4 {
        color: #111827;
        font-weight: 600;
        margin-top: 2em;
        margin-bottom: 1em;
      }
      .prose p {
        margin-bottom: 1.25em;
      }
      .prose ul, .prose ol {
        margin-bottom: 1.25em;
        padding-left: 1.625em;
      }
      .prose li {
        margin-bottom: 0.5em;
      }
      .prose blockquote {
        border-left-width: 4px;
        border-color: #8b5cf6;
        padding-left: 1.5rem;
        font-style: italic;
        color: #6b7280;
        margin: 2em 0;
        background-color: #faf5ff;
        padding: 1.5rem;
        border-radius: 0 0.5rem 0.5rem 0;
      }
    </style>
  </head>
  <body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div class="flex items-center gap-4 mb-4 sm:mb-0">
            <div class="p-3 rounded-xl bg-white shadow-sm border border-gray-200">
              ${
                (() => {
                  const ext = (document.name.split(".").pop() || "").toLowerCase();
                  switch (ext) {
                    case "pdf":
                      return '<svg class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/></svg>';
                    case "docx":
                      return '<svg class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/></svg>';
                    default:
                      return '<svg class="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2h12v20H6z"/></svg>';
                  }
                })()
              }
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(document.name)}</h1>
              <p class="text-sm text-gray-600 mt-1">Document Preview • ${fileType?.toUpperCase() || 'FILE'} • ${formatFileSize(document.size)}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <button id="downloadBtn" class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Download
            </button>
            <button id="closeBtn" class="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Close
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-1">
          ${innerHtml}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="text-center text-sm text-gray-500 mt-8">
        <p>Document preview generated by Document Management System</p>
      </div>
    </div>

    <script>
      (function(){
        const downloadBtn = document.getElementById('downloadBtn');
        const closeBtn = document.getElementById('closeBtn');
        
        closeBtn.addEventListener('click', () => window.close());
        
        downloadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Please use the Download button in the main application window to save this file.');
        });
      })();
    </script>
  </body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const previewUrl = URL.createObjectURL(blob);
    const newWindow = window.open(previewUrl, "_blank");
    if (newWindow) newWindow.focus();
  };

  const handleOpenInNewTab = () => {
    openPreviewInNewTab();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Convert edited content to base64
      const blob = new Blob([editedContent], { type: document.mime_type });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = async () => {
        const base64Data = reader.result;
        
        // Call the save handler passed from parent
        await onSaveDocument(document.id, base64Data, document.name);

        // Update current file to reflect changes
        const newFile = new File([blob], document.name, { type: document.mime_type });
        setCurrentFile(newFile);
        setIsEditing(false);
        setFileContent(editedContent);
        toast.success("Document saved successfully!");
      };
    } catch (error) {
      toast.error("Failed to save document");
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(fileContent);
    setIsEditing(false);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FaFilePdf className="text-red-500 text-4xl" />;
      case "docx":
        return <FaFileWord className="text-blue-500 text-4xl" />;
      case "txt":
        return <FaFileAlt className="text-gray-500 text-4xl" />;
      case "md":
        return <FiFileText className="text-blue-400 text-4xl" />;
      case "html":
        return <FaFileCode className="text-orange-500 text-4xl" />;
      default:
        return <FiFile className="text-gray-400 text-4xl" />;
    }
  };

  const renderFileContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading document...</p>
          </div>
        </div>
      );
    }

    const fileType = document.name.split(".").pop()?.toLowerCase();

    if (isEditing) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full p-6 font-mono text-sm border-0 resize-none focus:outline-none bg-white"
              spellCheck={false}
              placeholder="Start editing your document..."
            />
          </div>
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-600">Editing {document.name}</span>
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
              >
                <FaSave size={14} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      );
    }

    switch (fileType) {
      case "pdf":
        return (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={document.name}
          />
        );
      case "txt":
        return (
          <div className="h-full flex flex-col bg-white">
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                <pre className="whitespace-pre-wrap font-mono text-gray-800 text-sm leading-relaxed bg-white p-6">
                  {fileContent}
                </pre>
              </div>
            </div>
          </div>
        );
      case "md":
        return (
          <div className="h-full flex flex-col bg-white">
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="prose prose-lg max-w-none">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                    {fileContent.split("\n").map((line, index) => {
                      if (line.startsWith("# ")) {
                        return (
                          <h1
                            key={index}
                            className="text-3xl font-bold text-gray-900 mb-6 mt-8 border-b border-gray-200 pb-2 first:mt-0"
                          >
                            {line.replace("# ", "")}
                          </h1>
                        );
                      } else if (line.startsWith("## ")) {
                        return (
                          <h2
                            key={index}
                            className="text-2xl font-bold text-gray-800 mb-4 mt-6"
                          >
                            {line.replace("## ", "")}
                          </h2>
                        );
                      } else if (line.startsWith("### ")) {
                        return (
                          <h3
                            key={index}
                            className="text-xl font-bold text-gray-700 mb-3 mt-5"
                          >
                            {line.replace("### ", "")}
                          </h3>
                        );
                      } else if (line.startsWith("#### ")) {
                        return (
                          <h4
                            key={index}
                            className="text-lg font-semibold text-gray-700 mb-2 mt-4"
                          >
                            {line.replace("#### ", "")}
                          </h4>
                        );
                      } else if (line.startsWith("- ") || line.startsWith("* ")) {
                        return (
                          <li key={index} className="ml-6 text-gray-700 mb-2 leading-relaxed">
                            {line.replace(/^[-*] /, "")}
                          </li>
                        );
                      } else if (line.startsWith("> ")) {
                        return (
                          <blockquote key={index} className="border-l-4 border-purple-500 pl-4 italic text-gray-600 mb-4 bg-purple-50 py-2 px-4 rounded-r">
                            {line.replace("> ", "")}
                          </blockquote>
                        );
                      } else if (line.trim() === "") {
                        return <br key={index} />;
                      } else {
                        return (
                          <p
                            key={index}
                            className="text-gray-700 mb-4 leading-relaxed"
                          >
                            {line}
                          </p>
                        );
                      }
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "html":
        return (
          <div className="h-full flex flex-col bg-white">
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div
                  className="p-8 prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: fileContent }}
                />
              </div>
            </div>
          </div>
        );
      case "docx":
        return (
          <div className="h-full flex flex-col bg-white">
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="prose prose-lg max-w-none">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                    <div
                      className="docx-content"
                      dangerouslySetInnerHTML={{ __html: fileContent }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 p-8">
            {getFileIcon(document.name)}
            <p className="mt-4 text-lg font-medium text-gray-700">Document Preview</p>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Preview not available for this file type.<br />
              Please download the file to view its contents.
            </p>
            <button
              onClick={handleDownload}
              className="mt-6 flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
            >
              <FaDownload size={16} />
              Download File
            </button>
          </div>
        );
    }
  };

  const isPdfFile = document.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-white text-purple-600 shadow-sm border border-gray-200">
              <FaEye size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{document.name}</h2>
              <p className="text-sm text-gray-500">
                Document Viewer • {formatFileSize(document.size)} • {new Date(document.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditableFile() && !isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
              >
                <FaEdit size={14} />
                Edit
              </button>
            )}
            {!isEditing && (
              <>
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm"
                >
                  <FaExternalLinkAlt size={14} />
                  Open in New Tab
                </button>
                {!isPdfFile && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                  >
                    <FaDownload size={16} />
                    Download
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white text-gray-500 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-300"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className="h-[calc(90vh-120px)] bg-gray-100">
          {renderFileContent()}
        </div>
      </div>
    </div>
  );
}

// Enhanced Documents Popup Component with purple actions
function DocumentsPopup({ topic, onClose, onDocumentAction }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [editingDocument, setEditingDocument] = useState(null);
  const [newDocumentName, setNewDocumentName] = useState("");
  const [viewingDocument, setViewingDocument] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // File type icons mapping
  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FaFilePdf className="text-red-500 text-xl" />;
      case "docx":
        return <FaFileWord className="text-blue-500 text-xl" />;
      case "txt":
        return <FaFileAlt className="text-gray-500 text-xl" />;
      case "md":
        return <FiFileText className="text-blue-400 text-xl" />;
      case "html":
        return <FaFileCode className="text-orange-500 text-xl" />;
      default:
        return <FiFile className="text-gray-400 text-xl" />;
    }
  };

  const getFileType = (fileName) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ext ? ext.toUpperCase() : "Unknown";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchDocuments = async (page = 1) => {
    try {
      setLoading(true);
      const data = await docApi.getTopicDocuments(topic.id, { page, limit: 10 });
      // Sort documents by uploaded_at in ascending order (oldest first)
      const sortedDocuments = data.documents.sort((a, b) => 
        new Date(a.uploaded_at) - new Date(b.uploaded_at)
      );
      setDocuments(sortedDocuments);
      setTotalPages(data.totalPages);
      setCurrentPage(page);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (topic) {
      fetchDocuments();
    }
  }, [topic]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments(currentPage);
    setRefreshing(false);
    toast.success("Documents refreshed successfully!");
  };

  const toggleSelectDocument = (docId) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((doc) => doc.id)));
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newDocumentName.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    try {
      // Preserve file extension
      const oldExt = editingDocument.name.split(".").pop();
      const newName = newDocumentName.trim().endsWith(`.${oldExt}`)
        ? newDocumentName.trim()
        : `${newDocumentName.trim()}.${oldExt}`;

      await docApi.renameDocument(editingDocument.id, newName);
      
      setEditingDocument(null);
      setNewDocumentName("");
      await fetchDocuments(currentPage);
      toast.success("Document renamed successfully!");
    } catch (error) {
      toast.error(error.message || 'Failed to rename document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#5D3FD3",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await docApi.deleteDocument(docId);
          setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
          setSelectedDocuments((prev) => {
            const newSelected = new Set(prev);
            newSelected.delete(docId);
            return newSelected;
          });
          toast.success("Document deleted successfully!");
          await fetchDocuments(currentPage);
        } catch (error) {
          toast.error(error.message || 'Failed to delete document');
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) {
      toast.warn("No documents selected");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedDocuments.size} document(s). This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#5D3FD3",
      confirmButtonText: "Yes, delete them!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const deletePromises = Array.from(selectedDocuments).map(docId => 
            docApi.deleteDocument(docId)
          );
          await Promise.all(deletePromises);
          
          setDocuments((prev) => prev.filter((doc) => !selectedDocuments.has(doc.id)));
          setSelectedDocuments(new Set());
          await fetchDocuments(currentPage);
          toast.success(`${selectedDocuments.size} document(s) deleted successfully!`);
        } catch (error) {
          toast.error(error.message || 'Failed to delete documents');
        }
      }
    });
  };

  const handleViewDocument = async (document) => {
    try {
      const docData = await docApi.getDocument(document.id);
      setViewingDocument(docData.document);
    } catch (error) {
      toast.error(error.message || 'Failed to load document');
    }
  };

  const handleSaveDocument = async (docId, base64Data, fileName) => {
    try {
      await docApi.updateDocument(docId, { content: base64Data });
      await fetchDocuments(currentPage);
    } catch (error) {
      throw new Error(error.message || 'Failed to save document');
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      const docData = await docApi.getDocument(document.id);
      const blob = dataUrlToBlob(docData.document.data);
      saveAs(blob, document.name);
    } catch (error) {
      toast.error(error.message || 'Failed to download document');
    }
  };

  const dataUrlToBlob = (dataUrl) => {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // Filter documents based on type and search query
  const filteredDocuments = documents.filter(doc => {
    const fileType = doc.name.split('.').pop()?.toLowerCase();
    const matchesType = filterType === 'all' || fileType === filterType;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // File type filter options
  const fileTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'DOCX' },
    { value: 'txt', label: 'TXT' },
    { value: 'md', label: 'MD' },
    { value: 'html', label: 'HTML' }
  ];

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (viewingDocument) {
          setViewingDocument(null);
        } else if (editingDocument) {
          setEditingDocument(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, editingDocument, viewingDocument]);

  if (viewingDocument) {
    return (
      <DocumentViewer
        document={viewingDocument}
        onClose={() => setViewingDocument(null)}
        onSaveDocument={handleSaveDocument}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-white text-purple-600 shadow-sm border border-gray-200">
              <FaFolder size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{topic?.name} - Documents</h2>
              <p className="text-sm text-gray-500">
                {filteredDocuments.length} document(s) • {formatFileSize(filteredDocuments.reduce((total, doc) => total + doc.size, 0))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-full hover:bg-white text-gray-500 hover:text-purple-600 transition-colors border border-transparent hover:border-gray-300 ${refreshing ? "animate-spin" : ""}`}
              title="Refresh documents"
              disabled={refreshing}
            >
              <FiRefreshCw size={18} />
            </button>
            {selectedDocuments.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <FaTrash size={14} />
                Delete Selected ({selectedDocuments.size})
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white text-gray-500 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-300"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 w-full sm:w-48">
            <FaFilter className="text-gray-500" />
            <CustomSelect
              value={filterType}
              onChange={setFilterType}
              options={fileTypeOptions}
              ariaLabel="Filter by file type"
            />
          </div>
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="h-[calc(90vh-180px)] overflow-hidden flex flex-col">
          {/* Documents Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </th>
                  <th className="p-4 font-semibold text-gray-700">Name</th>
                  <th className="p-4 font-semibold text-gray-700">Type</th>
                  <th className="p-4 font-semibold text-gray-700">Size</th>
                  <th className="p-4 font-semibold text-gray-700">Uploaded</th>
                  <th className="p-4 font-semibold text-gray-700 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(doc.id)}
                        onChange={() => toggleSelectDocument(doc.id)}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="p-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => handleViewDocument(doc)}
                      >
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors truncate max-w-xs">
                            {doc.name}
                          </div>
                          <div className="text-xs text-gray-500 cursor-pointer group-hover:text-purple-500 transition-colors">
                            Click to view document
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getFileType(doc.name)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{formatFileSize(doc.size)}</td>
                    <td className="p-4 text-gray-600">{formatDate(doc.uploaded_at)}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="w-8 h-8 flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-transparent hover:border-purple-200"
                          title="Download Document"
                        >
                          <FaDownload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDocument(doc);
                            // Remove extension for editing
                            const nameWithoutExt = doc.name.replace(/\.[^/.]+$/, "");
                            setNewDocumentName(nameWithoutExt);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-transparent hover:border-purple-200"
                          title="Rename Document"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="w-8 h-8 flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-transparent hover:border-purple-200"
                          title="Delete Document"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            )}

            {filteredDocuments.length === 0 && !loading && (
              <div className="text-center py-12">
                <FaFolder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900">No documents found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria' 
                    : 'Get started by uploading a document.'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchDocuments(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchDocuments(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Rename Document Modal */}
      <AnimatePresence>
        {editingDocument && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setEditingDocument(null)}></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto border border-gray-200"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white text-purple-600 shadow-sm border border-gray-200">
                    <FaEdit size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Rename Document</h2>
                </div>
                <button
                  onClick={() => setEditingDocument(null)}
                  className="p-1 rounded-full hover:bg-white text-gray-500 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-300"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <form onSubmit={handleRename} className="p-6">
                <div className="mb-5">
                  <label htmlFor="document-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Document Name
                  </label>
                  <input
                    id="document-name"
                    type="text"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="Enter document name"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    File extension (.{editingDocument.name.split(".").pop()}) will be preserved
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingDocument(null)}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-500 text-white rounded whitespace-nowrap text-sm hover:bg-purple-600 focus:outline-none focus:ring-purple-500 transition px-5 py-2.5 font-medium"
                  >
                    Rename
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Format file size helper function
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format file count for display
function formatFileCount(count) {
  if (count === 0) return "Nil";
  if (count === 1) return "1 file";
  return `${count} files`;
}

// Main Component
export default function DocManagement() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [file, setFile] = useState(null);
  const [showCreateTopicModal, setShowCreateTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTopic, setEditingTopic] = useState(null);
  const [editTopicName, setEditTopicName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [topicsPerPage] = useState(10);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCanceled, setUploadCanceled] = useState(false);
  const [refreshAnimation, setRefreshAnimation] = useState(false);
  const [selectedTopicForDocuments, setSelectedTopicForDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const uploadIntervalRef = useRef(null);

  // Fetch topics on component mount and when search/page changes
  useEffect(() => {
    fetchTopics();
  }, [currentPage, searchQuery]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const data = await docApi.getAllTopics({
        page: currentPage,
        limit: topicsPerPage,
        search: searchQuery
      });
      // Sort topics by created_at in ascending order (oldest first)
      const sortedTopics = data.topics.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      setTopics(sortedTopics);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  // Filter topics based on search query (now handled by backend)
  const filteredTopics = topics;

  // Get current topics for pagination
  const currentTopics = filteredTopics;

  // Prepare options for CustomSelect
  const topicOptions = [{ value: "", label: "Choose a topic" }, ...topics.map((topic) => ({ value: topic.name, label: topic.name }))];

  // Configure dropzone for file uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxSize: 52428800, // 50MB in bytes
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        if (rejectedFiles[0].errors[0].code === "file-too-large") {
          toast.error("File size exceeds 50MB limit");
        } else {
          toast.error("Invalid file type. Please upload PDF, DOCX, TXT, MD, or HTML files.");
        }
        return;
      }

      setFile(acceptedFiles[0]);
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/html": [".html"],
    },
    multiple: false,
  });

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (showCreateTopicModal) setShowCreateTopicModal(false);
        if (editingTopic) setEditingTopic(null);
        if (selectedTopicForDocuments) setSelectedTopicForDocuments(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showCreateTopicModal, editingTopic, selectedTopicForDocuments]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }
    };
  }, []);

  // Create new topic with modal
  const handleCreateTopic = async (e) => {
    e.preventDefault();

    if (!newTopicName.trim()) {
      toast.error("Please enter a topic name");
      return;
    }

    setIsCreatingTopic(true);

    try {
      const result = await docApi.createTopic(newTopicName.trim());
      setNewTopicName("");
      setShowCreateTopicModal(false);
      await fetchTopics(); // Refresh the list
      toast.success(result.message);
    } catch (error) {
      toast.error(error.message || 'Failed to create topic');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // Simulate file upload with progress
  const simulateUpload = (topicId) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadCanceled(false);

    let progress = 0;
    uploadIntervalRef.current = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 1;
      if (progress >= 100) {
        progress = 100;
        clearInterval(uploadIntervalRef.current);

        // Complete the upload
        handleActualUpload(topicId);
      }
      setUploadProgress(progress);
    }, 200);
  };

  // Actual file upload to backend
  const handleActualUpload = async (topicId) => {
    try {
      await docApi.uploadDocument(topicId, file);
      
      setFile(null);
      setSelectedTopic("");
      setUploadProgress(0);
      setIsUploading(false);
      toast.success("File uploaded successfully!");
      await fetchTopics(); // Refresh topics to update file counts
    } catch (error) {
      setUploadProgress(0);
      setIsUploading(false);
      toast.error(error.message || 'Failed to upload file');
    }
  };

  // Handle file upload
  const handleAddDocument = () => {
    if (!selectedTopic) {
      toast.warn("Please select a topic first.");
      return;
    }
    if (!file) {
      toast.warn("Please choose a file to upload.");
      return;
    }

    // Find topic ID from selected topic name
    const topic = topics.find(t => t.name === selectedTopic);
    if (!topic) {
      toast.error('Selected topic not found');
      return;
    }

    // Check if topic has reached file limit
    if (topic.files >= topic.max_files) {
      toast.error(`Topic cannot have more than ${topic.max_files} files`);
      return;
    }

    simulateUpload(topic.id);
  };

  // Cancel upload
  const cancelUpload = () => {
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
    }
    setUploadCanceled(true);
    setIsUploading(false);

    setTimeout(() => {
      setUploadProgress(0);
      setUploadCanceled(false);
    }, 1500);
  };

  // Handle edit topic
  const handleEditTopic = async (e) => {
    e.preventDefault();

    if (!editTopicName.trim()) {
      toast.error("Please enter a topic name");
      return;
    }

    try {
      await docApi.updateTopic(editingTopic.id, editTopicName.trim());
      setEditingTopic(null);
      setEditTopicName("");
      await fetchTopics(); // Refresh the list
      toast.success("Topic updated successfully!");
    } catch (error) {
      toast.error(error.message || 'Failed to update topic');
    }
  };

  // Handle delete topic
  const handleDeleteTopic = async (topic) => {
    Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete the topic "${topic.name}". This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#5D3FD3",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await docApi.deleteTopic(topic.id);
          await fetchTopics(); // Refresh the list
          toast.success(`Topic "${topic.name}" deleted successfully!`);
        } catch (error) {
          toast.error(error.message || 'Failed to delete topic');
        }
      }
    });
  };

  // Start editing a topic
  const startEditingTopic = (topic) => {
    setEditingTopic(topic);
    setEditTopicName(topic.name);
  };

  // Handle refresh topics
  const handleRefresh = async () => {
    setRefreshAnimation(true);
    try {
      await fetchTopics();
      toast.success("Topics refreshed successfully!");
    } catch (error) {
      toast.error(error.message || 'Failed to refresh topics');
    } finally {
      setRefreshAnimation(false);
    }
  };

  // Handle topic click to show documents
  const handleTopicClick = (topic) => {
    setSelectedTopicForDocuments(topic);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-3 sm:p-6 bg-gray-50 text-gray-800"
    >
      {/* Toast Container */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover draggable />

      {/* Use a full width wrapper so the layout stretches on small screens (fixes centered narrow layout) */}
      <div className="w-full px-3 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Document Management</h1>

          <button
            onClick={() => setShowCreateTopicModal(true)}
            className="bg-[#5D3FD3] text-white rounded whitespace-nowrap text-sm sm:text-base hover:bg-[#6d4fe4] focus:outline-none focus:ring-[#5D3FD3] transition px-4 py-2.5 font-medium flex items-center gap-2 shadow-sm"
          >
            <FiFolderPlus className="text-lg" />
            Create New Topic
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Upload File</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Topic</label>
                <CustomSelect ariaLabel="Select topic" value={selectedTopic} onChange={setSelectedTopic} options={topicOptions} disabled={isUploading} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select File (Max 50MB)</label>
                <div
                  {...getRootProps()}
                  className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragActive ? "border-[#5D3FD3] bg-purple-50" : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                  } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input {...getInputProps()} disabled={isUploading} />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiUpload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOCX, TXT, MD, HTML (MAX. 50MB)</p>
                  </div>
                </div>

                {file && !isUploading && !uploadCanceled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-md mr-3">
                        <FaFileUpload className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-gray-200">
                      <FiX className="text-lg" />
                    </button>
                  </motion.div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Uploading...</span>
                      <span className="text-sm font-medium text-purple-600">{uploadProgress}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3 overflow-hidden">
                      <motion.div className="bg-gradient-to-r from-purple-500 to-[#5D3FD3] h-2.5 rounded-full" initial={{ width: "0%" }} animate={{ width: `${uploadProgress}%` }} transition={{ ease: "easeOut", duration: 0.3 }} />
                    </div>

                    {/* Wave Animation Container */}
                    <div className="relative h-1 mb-4 overflow-hidden">
                      <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-300 opacity-50" animate={{ scaleX: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
                    </div>

                    <button onClick={cancelUpload} className="flex items-center text-sm text-red-500 hover:text-red-700 mt-2">
                      <FaTimes className="mr-1" />
                      Cancel Upload
                    </button>
                  </motion.div>
                )}

                {/* Upload Canceled Message */}
                {uploadCanceled && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      <FiX className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800">Upload canceled</p>
                      <p className="text-xs text-red-600">The upload was stopped</p>
                    </div>
                  </motion.div>
                )}
              </div>

              <button
                onClick={handleAddDocument}
                disabled={!file || !selectedTopic || isUploading}
                className="w-full bg-[#5D3FD3] text-white rounded whitespace-nowrap text-sm sm:text-base hover:bg-[#6d4fe4] focus:outline-none focus:ring-[#5D3FD3] transition px-4 py-2.5 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <FaFileUpload className="text-sm" />
                    Upload File
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Topics Table Section */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-gray-200 gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-700">All Topics</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {filteredTopics.length} {filteredTopics.length === 1 ? "Topic" : "Topics"}
                  </span>
                  <button onClick={handleRefresh} className={`text-gray-500 hover:text-purple-600 transition ${refreshAnimation ? "animate-spin" : ""}`} title="Refresh topics">
                    <FaSync />
                  </button>
                </div>
              </div>

              <div className="flex items-center w-full sm:w-auto">
                <div className="relative w-full sm:w-56">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search topics..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : currentTopics.length === 0 ? (
              <div className="text-center py-10">
                <FaFolder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{searchQuery ? "No matching topics found" : "No topics"}</h3>
                <p className="mt-1 text-sm text-gray-500">{searchQuery ? "Try a different search term" : "Get started by creating a new topic."}</p>
                {!searchQuery && (
                  <div className="mt-6">
                    <button type="button" onClick={() => setShowCreateTopicModal(true)} className="bg-[#5D3FD3] text-white rounded whitespace-nowrap text-sm sm:text-base hover:bg-[#6d4fe4] focus:outline-none focus:ring-[#5D3FD3] transition px-4 py-2 font-medium inline-flex items-center shadow-sm">
                      <FaPlus className="mr-2 h-4 w-4" />
                      New Topic
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-sm text-left">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 font-semibold text-gray-700 text-left">Topic</th>
                        <th className="p-3 font-semibold text-gray-700 text-left">File Count</th>
                        <th className="p-3 font-semibold text-gray-700 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-gray-200 ${refreshAnimation ? "opacity-50 transition-opacity duration-300" : "opacity-100 transition-opacity duration-300"}`}>
                      {currentTopics.map((topic, index) => (
                        <motion.tr key={topic.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleTopicClick(topic)}>
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                <FaFolder className="text-lg" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">{topic.name}</div>
                                <div className="text-xs text-gray-500 cursor-pointer group-hover:text-purple-500 transition-colors">Click to view documents</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-gray-700">{formatFileCount(topic.files)}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => startEditingTopic(topic)} className="w-8 h-8 flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-transparent hover:border-purple-200" title="Edit Topic">
                                <FaEdit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteTopic(topic)} className="w-8 h-8 flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-transparent hover:border-purple-200" title="Delete Topic">
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * topicsPerPage + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(currentPage * topicsPerPage, filteredTopics.length)}</span> of <span className="font-medium">{filteredTopics.length}</span> topics
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <FaChevronLeft className="mr-1 h-3 w-3" />
                        Previous
                      </button>
                      <div className="flex space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                          <button key={number} onClick={() => paginate(number)} className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${currentPage === number ? "border-[#5D3FD3] bg-[#5D3FD3] text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                            {number}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Next
                        <FaChevronRight className="ml-1 h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Create Topic Modal */}
      <AnimatePresence>
        {showCreateTopicModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowCreateTopicModal(false)}></div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white text-purple-600 shadow-sm border border-gray-200">
                    <FiFolderPlus size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Create New Topic</h2>
                </div>
                <button onClick={() => setShowCreateTopicModal(false)} className="p-1 rounded-full hover:bg-white text-gray-500 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-300">
                  <FaTimes size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTopic} className="p-6">
                <div className="mb-5">
                  <label htmlFor="topic-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Topic Name
                  </label>
                  <input id="topic-name" type="text" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" placeholder="Enter topic name" autoFocus />
                </div>

                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowCreateTopicModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreatingTopic} className="bg-[#5D3FD3] text-white rounded whitespace-nowrap text-sm hover:bg-[#6d4fe4] focus:outline-none focus:ring-[#5D3FD3] transition px-5 py-2.5 font-medium disabled:opacity-70 disabled:cursor-not-allowed">
                    {isCreatingTopic ? "Creating..." : "Create Topic"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Topic Modal */}
      <AnimatePresence>
        {editingTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setEditingTopic(null)}></div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-white text-purple-600 shadow-sm border border-gray-200">
                    <FaEdit size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Edit Topic</h2>
                </div>
                <button onClick={() => setEditingTopic(null)} className="p-1 rounded-full hover:bg-white text-gray-500 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-300">
                  <FaTimes size={20} />
                </button>
              </div>

              <form onSubmit={handleEditTopic} className="p-6">
                <div className="mb-5">
                  <label htmlFor="edit-topic-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Topic Name
                  </label>
                  <input id="edit-topic-name" type="text" value={editTopicName} onChange={(e) => setEditTopicName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" placeholder="Enter topic name" autoFocus />
                </div>

                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setEditingTopic(null)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="bg-[#5D3FD3] text-white rounded whitespace-nowrap text-sm hover:bg-[#6d4fe4] focus:outline-none focus:ring-[#5D3FD3] transition px-5 py-2.5 font-medium">
                    Update Topic
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Documents Popup */}
      <AnimatePresence>
        {selectedTopicForDocuments && (
          <DocumentsPopup
            topic={selectedTopicForDocuments}
            onClose={() => setSelectedTopicForDocuments(null)}
            onDocumentAction={() => {
              // Handle document actions if needed
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}