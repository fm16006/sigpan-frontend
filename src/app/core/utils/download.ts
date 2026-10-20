/** Entrega un archivo ya descargado al navegador (enlace temporal con el nombre dado). */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // El clic ya inició la descarga; se libera el objeto después de que el navegador lo tome.
  setTimeout(() => URL.revokeObjectURL(url));
}
