/**
 * Utility functions for generating academic citations from paper metadata.
 */

/**
 * Cleans LaTeX escape characters and common ArXiv-specific artifacts.
 */
export const cleanLatex = (text) => {
    if (!text) return "";
    return text
        .replace(/\\['`^"~=b]./g, (match) => match.slice(-1)) // basic escapes like \'a -> a
        .replace(/\\\{|\\\}/g, "") // remove \{ \}
        .replace(/\$/g, "") // remove math mode dividers
        .replace(/\s+/g, " ")
        .trim();
};

/**
 * Extracts the first author's last name for BibTeX keys.
 */
export const getFirstAuthorLastName = (authors) => {
    if (!authors || authors.length === 0) return "Unknown";
    // Handle "Last, First" or "First Last" or "First Last et al."
    const firstAuthor = authors[0].split(',')[0].trim();
    const parts = firstAuthor.split(' ');
    return cleanLatex(parts[parts.length - 1]);
};

/**
 * Formats a list of authors for citations.
 */
export const formatAuthorList = (authors, limit = null, separator = ", ") => {
    if (!authors || authors.length === 0) return "Unknown Authors";
    const cleaned = authors.map(cleanLatex);
    if (limit && cleaned.length > limit) {
        return cleaned.slice(0, limit).join(separator) + " et al.";
    }
    return cleaned.join(separator);
};

export const generateBibTeX = (paper) => {
    const year = paper.datePublished ? new Date(paper.datePublished).getFullYear() : "nd";
    const firstAuthor = getFirstAuthorLastName(paper.authors);
    const cleanTitle = cleanLatex(paper.title);
    const authors = formatAuthorList(paper.authors, null, " and ");
    const arxivId = paper.paper_id;

    const key = `${firstAuthor.toLowerCase()}${year}${arxivId.replace(/\./g, "")}`;

    return `@article{${key},
  title={${cleanTitle}},
  author={${authors}},
  journal={arXiv preprint arXiv:${arxivId}},
  year={${year}},
  url={${paper.link}}
}`;
};

export const generateAPA = (paper) => {
    const year = paper.datePublished ? new Date(paper.datePublished).getFullYear() : "n.d.";
    const cleanTitle = cleanLatex(paper.title);
    const authors = formatAuthorList(paper.authors, 7); // APA usually lists up to 7, then ...
    const arxivId = paper.paper_id;

    return `${authors} (${year}). ${cleanTitle}. arXiv preprint arXiv:${arxivId}.`;
};

export const generateMLA = (paper) => {
    const year = paper.datePublished ? new Date(paper.datePublished).getFullYear() : "n.d.";
    const cleanTitle = cleanLatex(paper.title);
    const authors = formatAuthorList(paper.authors, 2); // MLA usually lists up to 2, then et al.

    return `${authors}. "${cleanTitle}." arXiv, ${year}.`;
};
