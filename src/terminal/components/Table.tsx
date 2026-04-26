import type { Column } from '../core/types.js';

interface Props {
  columns: Column[];
  rows:    string[][];
}

export default function Table({ columns, rows }: Props) {
  return (
    <table className="terminal__table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} data-align={col.align ?? 'left'}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} data-align={columns[ci]?.align ?? 'left'}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
