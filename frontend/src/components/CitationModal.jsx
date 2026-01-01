import React, { useState } from "react";
import { generateBibTeX, generateAPA, generateMLA } from "../utils/citationUtils";

export default function CitationModal({ paper, onClose }) {
    const [copiedFormat, setCopiedFormat] = useState(null);

    const citations = [
        { label: "BibTeX", value: generateBibTeX(paper) },
        { label: "APA", value: generateAPA(paper) },
        { label: "MLA", value: generateMLA(paper) },
    ];

    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopiedFormat(label);
        setTimeout(() => setCopiedFormat(null), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-[100]" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl border border-[#E5D0FA] max-w-2xl w-full p-8 relative flex flex-col gap-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-[#4F106E]">Cite this Paper</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors text-2xl">✕</button>
                </div>

                <p className="text-sm text-[#787391] italic border-b pb-4">
                    Generating citations for: <span className="font-semibold">{paper.title}</span>
                </p>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {citations.map((cite) => (
                        <div key={cite.label} className="relative group">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-[#AB43BD] uppercase tracking-wider">{cite.label}</span>
                                <button
                                    onClick={() => handleCopy(cite.value, cite.label)}
                                    className={`text-xs px-3 py-1 rounded-full transition-all duration-200 ${copiedFormat === cite.label
                                            ? "bg-green-500 text-white"
                                            : "bg-[#F3ECFF] text-[#4F106E] hover:bg-[#E5D0FA]"
                                        }`}
                                >
                                    {copiedFormat === cite.label ? "✓ Copied!" : "📋 Copy"}
                                </button>
                            </div>
                            <pre className="bg-[#F9F7FF] p-4 rounded-lg text-sm text-[#4F106E] whitespace-pre-wrap font-mono border border-[#E5D0FA] break-all">
                                {cite.value}
                            </pre>
                        </div>
                    ))}
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[#4F106E] text-white rounded-lg hover:bg-[#3B0C52] transition-colors font-medium"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
