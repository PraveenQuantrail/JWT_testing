import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFolder,
  FaTimes,
  FaFilePdf,
  FaFileWord,
  FaFileAlt,
  FaFileCode,
  FaEye,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";
import JSZip from "jszip";
import { docApi } from "../../utils/api";

/* Helpers */
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const dataUrlToBlob = (dataUrl) => {
  const byteString = atob(dataUrl.split(",")[1]);
  const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

/* DOCX parser */
async function parseDocxToHtml(arrayBuffer) {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) throw new Error("word/document.xml not found in docx");

    const xmlStr = await docFile.async("string");
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlStr, "application/xml");

    const relsFile = zip.file("word/_rels/document.xml.rels");
    const relsMap = {};
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
          if (target.startsWith("..")) {
            target = target.replace(/^(\.\.\/)+/, "");
          }
          let fullPath = target.startsWith("word/") ? target : `word/${target}`;
          fullPath = fullPath.replace(/^word\/\.\//, "word/");
          relsMap[id] = fullPath;
        }
      } catch (err) {
        console.warn("Failed to parse document.xml.rels:", err);
      }
    }

    const imagesByRelId = {};
    const imagesByPath = {};
    const imageFiles = Object.keys(zip.files).filter((p) => p.startsWith("word/media/"));
    for (const imagePath of imageFiles) {
      const imageFile = zip.file(imagePath);
      if (imageFile) {
        try {
          const blob = await imageFile.async("blob");
          imagesByPath[imagePath] = URL.createObjectURL(blob);
        } catch (err) {
          console.warn("Failed to create blob for image:", imagePath, err);
        }
      }
    }
    for (const [rid, path] of Object.entries(relsMap)) {
      const f = zip.file(path);
      if (f) {
        try {
          const blob = await f.async("blob");
          imagesByRelId[rid] = URL.createObjectURL(blob);
        } catch (err) {
          // ignore
        }
      }
    }

    function extractContentFromNode(node) {
      let out = "";

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

      const drawings = node.getElementsByTagName("w:drawing");
      for (let di = 0; di < drawings.length; di++) {
        const drawing = drawings[di];
        const blip = drawing.getElementsByTagName("a:blip")?.[0] || drawing.getElementsByTagName("pic:blipFill")?.[0];
        const embedId = blip?.getAttribute("r:embed") || blip?.getAttribute("r:id");

        if (embedId) {
          const imageUrl = imagesByRelId[embedId] || imagesByPath[relsMap[embedId]] || null;
          if (imageUrl) {
            out += `<img src="${imageUrl}" class="max-w-full h-auto rounded-lg my-4 border border-gray-200" alt="Document image" />`;
            continue;
          }
          const suffixMatch = embedId.match(/rId(\d+)/i);
          if (suffixMatch) {
            const fallbackPathCandidate = `word/media/image${suffixMatch[1]}.png`;
            if (imagesByPath[fallbackPathCandidate]) {
              out += `<img src="${imagesByPath[fallbackPathCandidate]}" class="max-w-full h-auto rounded-lg my-4 border border-gray-200" alt="Document image" />`;
              continue;
            }
          }
        }

        const blipAlt = drawing.querySelector && drawing.querySelector('a\\:blip, blip');
        const emb = blipAlt && (blipAlt.getAttribute('r:embed') || blipAlt.getAttribute('r:id'));
        if (emb && imagesByRelId[emb]) {
          out += `<img src="${imagesByRelId[emb]}" class="max-w-full h-auto rounded-lg my-4 border border-gray-200" alt="Document image" />`;
          continue;
        }
      }

      const vImages = node.getElementsByTagName("v:imagedata");
      for (let vi = 0; vi < vImages.length; vi++) {
        const vimg = vImages[vi];
        const rid = vimg.getAttribute("r:id") || vimg.getAttribute("r:embed");
        if (rid && imagesByRelId[rid]) {
          out += `<img src="${imagesByRelId[rid]}" class="max-w-full h-auto rounded-lg my-4 border border-gray-200" alt="Document image" />`;
        }
      }

      const breaks = node.getElementsByTagName("w:br");
      if (breaks.length > 0) {
        out += "<br/>".repeat(breaks.length);
      }
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
        const style = p.getElementsByTagName("w:pStyle")?.[0];
        const styleVal = style?.getAttribute("w:val");
        if (styleVal?.includes("Heading") || styleVal?.includes("Title")) {
          const level = styleVal.includes("1") ? "1" : styleVal.includes("2") ? "2" : "3";
          html += `<h${level} class="font-bold text-gray-900 mb-4 mt-6">${pHtml}</h${level}>`;
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

/* Read-only Document Viewer */
function DocumentViewerReadOnly({ document, onClose }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      try {
        if (!document || !document.data) {
          setFileContent("");
          setIsLoading(false);
          return;
        }

        const blob = dataUrlToBlob(document.data);
        const file = new File([blob], document.name, { type: document.mime_type });
        setCurrentFile(file);
        const url = URL.createObjectURL(blob);
        setFileUrl(url);

        const fileType = document.name.split(".").pop()?.toLowerCase();
        if (["txt", "md", "html"].includes(fileType)) {
          const text = await blob.text();
          setFileContent(text);
        } else if (fileType === "docx") {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const html = await parseDocxToHtml(arrayBuffer);
            setFileContent(html);
          } catch (err) {
            console.error("DOCX parsing error:", err);
            setFileContent("<p class='text-gray-700'>Unable to preview .docx</p>");
          }
        } else {
          // pdf fallback: nothing to read, shown in iframe
          try {
            const text = await blob.text();
            setFileContent(text);
          } catch (err) {
            // ignore
            setFileContent("");
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load document");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document]);

  // Close this inner viewer on Escape.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Focus the viewer container for accessibility when opened
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.focus();
    }
  }, []);

  const openPreviewInNewTab = () => {
    if (!document || !document.data) {
      toast.warn("Preview not ready yet.");
      return;
    }
    const fileType = document.name.split(".").pop()?.toLowerCase();
    const title = escapeHtml(document.name);

    // PDF special: iframe
    if (fileType === "pdf") {
      const blob = dataUrlToBlob(document.data);
      const pdfUrl = URL.createObjectURL(blob);
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title} - Preview</title>
    <style>
      body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; margin:0; background:#f3f4f6; }
      .toolbar { display:flex; gap:8px; align-items:center; justify-content:flex-end; padding:12px; background:white; border-bottom:1px solid #e5e7eb; position:sticky; top:0; z-index:10; }
      .btn { padding:8px 12px; border-radius:8px; border:1px solid #ddd; background:#fff; cursor:pointer; font-weight:600; }
      .container { padding: 16px; max-width: 960px; margin: 0 auto; }
      iframe { width:100%; height: calc(100vh - 56px); border:0; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-radius:8px; }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="btn" id="closeBtn">Close</button>
    </div>
    <div class="container">
      <iframe id="pdfFrame" src="${pdfUrl}"></iframe>
    </div>
    <script>
      document.getElementById('closeBtn').addEventListener('click', () => window.close());
      // Note: Print intentionally not provided as a UI button. Users can use browser Print (Ctrl/Cmd+P).
    </script>
  </body>
</html>`;
      const blobHtml = new Blob([html], { type: "text/html" });
      const previewUrl = URL.createObjectURL(blobHtml);
      const newWin = window.open(previewUrl, "_blank");
      if (newWin) newWin.focus();
      return;
    }

    // Other file types: create printable HTML
    let innerContent = "";
    const fileExt = fileType || "file";
    if (fileExt === "docx") {
      innerContent = `<div class="docx-content">${fileContent}</div>`;
    } else if (fileExt === "md") {
      innerContent = `<pre style="white-space:pre-wrap;">${escapeHtml(fileContent || "")}</pre>`;
    } else if (fileExt === "html") {
      innerContent = fileContent || "<div>No preview available</div>";
    } else {
      innerContent = `<pre style="white-space:pre-wrap;">${escapeHtml(fileContent || "")}</pre>`;
    }

    const fullHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title} - Preview</title>
    <style>
      body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; background:#f8fafc; color:#111827; margin:0; padding:0; }
      .toolbar { display:flex; gap:8px; align-items:center; justify-content:flex-end; padding:12px; background:white; border-bottom:1px solid #e5e7eb; position:sticky; top:0; z-index:10; }
      .btn { padding:8px 12px; border-radius:8px; border:1px solid #ddd; background:#fff; cursor:pointer; font-weight:600; }
      .wrap { max-width: 980px; margin: 16px auto; padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(16,24,40,0.06); }
      .docx-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; }
      pre { white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="btn" id="closeBtn">Close</button>
    </div>
    <div class="wrap">
      <h1 style="margin:0 0 12px 0; font-size:20px;">${title}</h1>
      ${innerContent}
    </div>
    <script>
      document.getElementById('closeBtn').addEventListener('click', () => window.close());
      // Note: Print intentionally not provided as a UI button. Users can use browser Print (Ctrl/Cmd+P).
    </script>
  </body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const previewUrl = URL.createObjectURL(blob);
    const newWindow = window.open(previewUrl, "_blank");
    if (newWindow) newWindow.focus();
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
      case "html":
        return <FaFileCode className="text-orange-500 text-4xl" />;
      default:
        return <FaFileAlt className="text-gray-400 text-4xl" />;
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

    if (fileType === "pdf") {
      return <iframe src={fileUrl} className="w-full h-full border-0" title={document.name} />;
    } else if (fileType === "docx") {
      return (
        <div className="h-full overflow-auto p-6">
          <div className="max-w-4xl mx-auto prose prose-lg">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
              <div dangerouslySetInnerHTML={{ __html: fileContent }} />
            </div>
          </div>
        </div>
      );
    } else if (fileType === "html") {
      return (
        <div className="h-full overflow-auto p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-8 prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: fileContent }} />
          </div>
        </div>
      );
    } else {
      return (
        <div className="h-full overflow-auto p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <pre className="whitespace-pre-wrap font-mono text-gray-800 text-sm leading-relaxed bg-white p-6">
              {fileContent}
            </pre>
          </div>
        </div>
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-60"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      ref={viewerRef}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-white text-purple-600 shadow-sm border border-gray-200">
              <FaEye size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{document.name}</h2>
              <p className="text-sm text-gray-500">
                {formatFileSize(document.size)} • {new Date(document.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openPreviewInNewTab}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm"
            >
              <FaExternalLinkAlt size={14} />
              Open in New Tab
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white text-gray-500 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-300"
              aria-label="Close viewer"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className="h-[calc(90vh-120px)] bg-gray-100">{renderFileContent()}</div>
      </div>
    </div>
  );
}

/* ---------- Main Read-only Documents Popup (robust fetch) ---------- */
export default function ViewTopicDocuments({ topic, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef(null);

  // Normalize incoming `topic`:
  function getTopicIdFromProp(t) {
    if (!t) return null;
    if (typeof t === "object") {
      if (t.id) return t.id;
      if (t.topic && typeof t.topic === "object" && t.topic.id) return t.topic.id;
      if (t.topicId) return t.topicId;
    }
    return null;
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!topic) {
          setDocuments([]);
          setTotalPages(1);
          setCurrentPage(1);
          setLoading(false);
          return;
        }

        if (Array.isArray(topic.documents)) {
          const sorted = topic.documents.slice().sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
          setDocuments(sorted);
          setTotalPages(topic.totalPages || 1);
          setCurrentPage(topic.currentPage || 1);
          setLoading(false);
          return;
        }

        const topicId = getTopicIdFromProp(topic);
        if (!topicId) {
          console.warn("ViewTopicDocuments: unable to determine topic id from prop, aborting fetch");
          setDocuments([]);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        const data = await docApi.getTopicDocuments(topicId, { page: currentPage, limit: 50 });
        const docs = Array.isArray(data.documents) ? data.documents.slice().sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at)) : [];
        setDocuments(docs);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.currentPage || currentPage);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        toast.error(error.message || "Failed to fetch documents");
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, currentPage]);

  // When the popup is open (this component mounted) and the inner viewer is NOT open,
  // pressing Escape should close the entire popup. We only attach the listener when
  // viewingDocument === null to avoid interfering when the inner viewer is open.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        // Only close the outer popup if no inner document viewer is open
        if (!viewingDocument) {
          e.preventDefault();
          onClose();
        }
      }
    };

    // Attach listener only when the outer modal is displayed and no inner viewer.
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewingDocument, onClose]);

  const handleViewDocument = async (doc) => {
    try {
      const docData = await docApi.getDocument(doc.id);
      setViewingDocument(docData.document);
    } catch (error) {
      console.error("Failed to load document:", error);
      toast.error(error.message || "Failed to load document");
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FaFilePdf className="text-red-500 text-xl" />;
      case "docx":
        return <FaFileWord className="text-blue-500 text-xl" />;
      case "txt":
        return <FaFileAlt className="text-gray-500 text-xl" />;
      case "html":
        return <FaFileCode className="text-orange-500 text-xl" />;
      default:
        return <FaFileAlt className="text-gray-400 text-xl" />;
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const fileType = doc.name.split(".").pop()?.toLowerCase();
    const matchesType = filterType === "all" || fileType === filterType;
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.original_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <>
      <AnimatePresence>
        {viewingDocument && (
          <DocumentViewerReadOnly document={viewingDocument} onClose={() => setViewingDocument(null)} />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full mx-auto border border-gray-200"
          ref={containerRef}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-white text-purple-600 shadow-sm border border-gray-200">
                <FaFolder size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{(topic && topic.name) || (topic && topic.topic && topic.topic.name) || "Documents" } - Documents</h2>
                <p className="text-sm text-gray-500">{filteredDocs.length} document(s)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white text-gray-500 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-300">
                <FaTimes size={18} />
              </button>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 w-full sm:w-48">
              <div className="relative inline-block w-full text-sm">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500">
                  <option value="all">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="txt">TXT</option>
                  <option value="html">HTML</option>
                </select>
              </div>
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

          {/* Documents List */}
          <div className="h-[60vh] overflow-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12">
                <FaFolder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900">No documents found</h3>
                <p className="mt-1 text-sm text-gray-500">This topic has no documents to view.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-4 font-semibold text-gray-700">Name</th>
                      <th className="p-4 font-semibold text-gray-700">Type</th>
                      <th className="p-4 font-semibold text-gray-700">Size</th>
                      <th className="p-4 font-semibold text-gray-700">Uploaded</th>
                      <th className="p-4 font-semibold text-gray-700 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewDocument(doc)}>
                            <div className="flex-shrink-0">{getFileIcon(doc.name)}</div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</div>
                              <div className="text-xs text-gray-500">Click to view</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {doc.name.split(".").pop()?.toUpperCase() || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{formatFileSize(doc.size)}</td>
                        <td className="p-4 text-gray-600">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleViewDocument(doc)}
                              className="w-8 h-8 flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-transparent hover:border-purple-200"
                              title="View Document"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>
                            {/* No download/edit/delete allowed in read-only chat view */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer / pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-700">Page {currentPage} of {totalPages}</div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50">Previous</button>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}