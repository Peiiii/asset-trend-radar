import "./directory-table-columns.css";

type DirectoryTableColumnsProps = {
  returnColumnCount?: number;
};

export function DirectoryTableColumns({ returnColumnCount = 5 }: DirectoryTableColumnsProps): JSX.Element {
  return (
    <colgroup>
      <col className="directory-table-column directory-table-column--identity" />
      <col className="directory-table-column directory-table-column--type" />
      <col className="directory-table-column directory-table-column--status" />
      <col className="directory-table-column directory-table-column--latest" />
      {Array.from({ length: returnColumnCount }, (_, index) => (
        <col key={index} className="directory-table-column directory-table-column--return" />
      ))}
      <col className="directory-table-column directory-table-column--data" />
      <col className="directory-table-column directory-table-column--actions" />
    </colgroup>
  );
}
