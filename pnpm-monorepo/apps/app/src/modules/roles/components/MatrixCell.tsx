interface Props {
  readonly name: string;
  readonly label: string;
  readonly defaultChecked: boolean;
}

/**
 * Deliberately minimal: each matrix renders more than ten thousand of these
 * cells, so every element and every attribute byte counts.
 */
export const MatrixCell = ({ name, label, defaultChecked }: Props) => {
  return (
    <td>
      <label className="matrix-cell" title={label}>
        <input
          type="checkbox"
          className="sr-only"
          name={name}
          defaultChecked={defaultChecked}
          aria-label={label}
        />
        <span />
      </label>
    </td>
  );
};
