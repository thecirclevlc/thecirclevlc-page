// ================================================================
// El dialecto de texto del sitio: párrafos, viñetas y **negrita**.
//
// Separado del componente para poder comprobarlo con `node`, porque el fallo
// que motivó esto era del análisis, no del pintado:
//
//   We're open to:
//   - Painters
//   - Visual artists
//
// La versión anterior sólo hacía una lista si TODAS las líneas del párrafo
// empezaban por guion. Una línea de entrada antes de la lista —que es como
// escribe cualquiera— hacía que se descartara la lista entera y saliera un
// párrafo plano: "We're open to: - Painters - Visual artists - …".
//
// La clienta lo había escrito bien. El renderizador estaba mal.
// ================================================================

export interface ParagraphNode {
  kind:  'p';
  /** Cada salto de línea suelto es una línea suya. Los respetamos. */
  lines: string[];
}

export interface ListNode {
  kind:  'ul';
  items: string[];
}

export type RichNode = ParagraphNode | ListNode;

/** Guion, asterisco o bolo al principio de la línea. */
const BULLET = /^\s*[-*•]\s+(.*)$/;

export function parseRichText(body: string): RichNode[] {
  const out: RichNode[] = [];
  let items: string[] = [];
  let lines: string[] = [];

  const flushList = () => {
    if (items.length) { out.push({ kind: 'ul', items }); items = []; }
  };
  const flushParagraph = () => {
    if (lines.length) { out.push({ kind: 'p', lines }); lines = []; }
  };

  for (const raw of String(body ?? '').split('\n')) {
    const bullet = raw.match(BULLET);

    if (bullet) {
      // Una viñeta cierra el párrafo que venía antes, no lo absorbe.
      flushParagraph();
      items.push(bullet[1].trim());
      continue;
    }

    if (raw.trim() === '') {
      // Una línea en blanco separa bloques, venga de donde venga.
      flushList();
      flushParagraph();
      continue;
    }

    // Texto normal: cierra cualquier lista abierta y sigue el párrafo.
    flushList();
    lines.push(raw.trim());
  }

  flushList();
  flushParagraph();
  return out;
}

export interface BoldSpan {
  text: string;
  bold: boolean;
}

/** Parte una línea en tramos normales y en **negrita**. */
export function parseBold(text: string): BoldSpan[] {
  return String(text ?? '')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(part => part !== '')
    .map(part =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}
