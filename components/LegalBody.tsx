import React from 'react';
import { parseRichText, parseBold } from '../lib/richText';

/**
 * Pinta el dialecto de texto del sitio: párrafos, viñetas y **negrita**.
 *
 * Lo usan las páginas legales, los bloques de texto de las páginas nuevas y
 * la vista de edición en vivo, para que exista una sola forma de escribir.
 *
 * El análisis vive en lib/richText.ts y tiene su propio check: el fallo que
 * trajo esto aquí era de análisis, no de pintado.
 */

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseBold(text).map((span, i) =>
        span.bold
          ? <strong key={i} className="text-fg/90 font-semibold">{span.text}</strong>
          : <React.Fragment key={i}>{span.text}</React.Fragment>,
      )}
    </>
  );
}

export default function LegalBody({ body }: { body: string }) {
  const nodes = parseRichText(body);

  return (
    <>
      {nodes.map((node, i) =>
        node.kind === 'ul' ? (
          <ul key={i} className="list-disc pl-5 space-y-1.5 text-fg/70 my-4 marker:text-primary/60">
            {node.items.map((item, j) => (
              <li key={j}><Inline text={item} /></li>
            ))}
          </ul>
        ) : (
          <p key={i} className={i > 0 ? 'mt-4' : ''}>
            {/* Un salto de línea suelto es un salto que ella escribió a
                propósito. Antes se colapsaba en un espacio y tres frases
                cortas salían como un párrafo corrido. */}
            {node.lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={line} />
              </React.Fragment>
            ))}
          </p>
        ),
      )}
    </>
  );
}
