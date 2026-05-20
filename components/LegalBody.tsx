import React from 'react';

// Minimal renderer: paragraph splits on \n\n, "- " lines become a <ul>,
// **text** becomes <strong>. No external markdown lib.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Split on **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="text-[#f5f5f0]/80">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{p}</React.Fragment>;
  });
}

export default function LegalBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const allBullets = lines.length > 0 && lines.every(l => l.trim().startsWith('- '));
        if (allBullets) {
          return (
            <ul key={bi} className="list-disc list-inside space-y-1 text-[#f5f5f0]/60 mt-2">
              {lines.map((l, li) => (
                <li key={`${bi}-${li}`}>
                  {renderInline(l.replace(/^\s*-\s/, ''), `${bi}-${li}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className={bi > 0 ? 'mt-3' : ''}>
            {renderInline(block, `${bi}`)}
          </p>
        );
      })}
    </>
  );
}
