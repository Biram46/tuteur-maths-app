/**
 * Schema de sanitisation rehype personnalisé pour ReactMarkdown.
 * Autorise les éléments nécessaires au rendu KaTeX tout en bloquant le XSS.
 *
 * Usage: import { katexSanitizeSchema } from '@/lib/rehype-sanitize-katex';
 *        <ReactMarkdown rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSanitizeSchema]]}>
 */
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import type rehypeSanitize from 'rehype-sanitize';
type Schema = Parameters<typeof rehypeSanitize>[0];

export const katexSanitizeSchema: Schema = {
    tagNames: [
        // Standard HTML inline/block
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'em', 'del', 'ins',
        'code', 'pre',
        'blockquote',
        'ul', 'ol', 'li',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'sub', 'sup',
        'abbr', 'mark', 'small',
        // KaTeX elements
        'math',
        'annotation',
        'mi', 'mo', 'mn', 'ms', 'mtext',
        'mfrac', 'msqrt', 'mroot',
        'msup', 'msub', 'msubsup',
        'mover', 'munder', 'munderover',
        'mrow', 'menclose', 'mpadded', 'mphantom',
        'mfenced', 'mtable', 'mtr', 'mtd',
        'mlabeledtr', 'maligngroup', 'malignmark',
        'maction', 'mstyle', 'merror',
        'mprescripts', 'none',
        'semantics',
        'svg', 'g', 'path', 'line', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
        'text', 'tspan', 'defs', 'use', 'clippath', 'lineargradient',
        // Custom components (useFigureRenderer)
        'mathtable', 'mathgraph', 'geometryfigure',
        'u',
    ],

    attributes: {
        '*': ['className', 'style', 'id'],
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'math': ['xmlns', 'display', 'mode'],
        'annotation': ['encoding'],
        'mi': ['mathvariant'],
        'mo': ['stretchy', 'lspace', 'rspace', 'minsize', 'maxsize', 'fence', 'separator', 'accent', 'movablelimits'],
        'mfrac': ['linethickness', 'bevelled'],
        'menclose': ['notation'],
        'mpadded': ['width', 'height', 'depth', 'lspace', 'voffset'],
        'mfenced': ['open', 'close', 'separators'],
        'mtable': ['rowspacing', 'columnspacing', 'columnalign'],
        'mtd': ['rowspan', 'columnspan'],
        'mover': ['accent'],
        'munder': ['accentunder'],
        'munderover': ['accent', 'accentunder'],
        'mstyle': ['displaystyle', 'scriptlevel'],
        'maction': ['actiontype', 'selection'],
        'code': ['language'],
        'pre': ['language'],
        'ol': ['start', 'type'],
        'td': ['align', 'colspan', 'rowspan'],
        'th': ['align', 'colspan', 'rowspan'],
        'svg': ['viewBox', 'xmlns', 'width', 'height', 'style', 'preserveAspectRatio'],
        'path': ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
        'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
        'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke'],
        'circle': ['cx', 'cy', 'r', 'fill', 'stroke'],
        'ellipse': ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke'],
        'polygon': ['points', 'fill', 'stroke'],
        'polyline': ['points', 'fill', 'stroke'],
        'text': ['x', 'y', 'dx', 'dy', 'text-anchor', 'font-size', 'font-weight', 'fill', 'font-family', 'font-style'],
        'tspan': ['x', 'y', 'dx', 'dy'],
        'g': ['transform', 'fill', 'stroke'],
        'use': ['href', 'xlinkHref'],
        'mathtable': ['data'],
        'mathgraph': ['data'],
        'geometryfigure': ['data'],
    },

};
