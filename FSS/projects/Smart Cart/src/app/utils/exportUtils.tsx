import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => any);
  width?: number;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
}

// Export to CSV
export const exportToCSV = ({ filename, columns, data }: ExportOptions) => {
  try {
    // Create CSV headers
    const headers = columns.map(col => col.header).join(',');
    
    // Create CSV rows
    const rows = data.map(row => {
      return columns.map(col => {
        const value = typeof col.accessor === 'function' 
          ? col.accessor(row) 
          : row[col.accessor];
        // Escape commas and quotes
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export CSV');
  }
};

// Export to Excel
export const exportToExcel = ({ filename, columns, data, title }: ExportOptions) => {
  try {
    // Prepare data for Excel
    const excelData = data.map(row => {
      const rowData: any = {};
      columns.forEach(col => {
        const value = typeof col.accessor === 'function' 
          ? col.accessor(row) 
          : row[col.accessor];
        rowData[col.header] = value;
      });
      return rowData;
    });
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = columns.map(col => ({ 
      wch: col.width || 15 
    }));
    ws['!cols'] = colWidths;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title || 'Data');
    
    // Save file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export Excel');
  }
};

// Export to PDF
export const exportToPDF = ({ filename, columns, data, title }: ExportOptions) => {
  try {
    const doc = new jsPDF();
    
    // Add title if provided
    if (title) {
      doc.setFontSize(16);
      doc.text(title, 14, 15);
    }
    
    // Prepare table headers and body
    const headers = [columns.map(col => col.header)];
    const body = data.map(row => {
      return columns.map(col => {
        const value = typeof col.accessor === 'function' 
          ? col.accessor(row) 
          : row[col.accessor];
        return String(value || '');
      });
    });
    
    // Generate table
    autoTable(doc, {
      head: headers,
      body: body,
      startY: title ? 25 : 10,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 10 },
    });
    
    // Save PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
};

// Print function
export const printData = ({ columns, data, title }: ExportOptions) => {
  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window');
    }
    
    // Build HTML table
    const headers = columns.map(col => `<th style="border: 1px solid #ddd; padding: 8px; background-color: #4f46e5; color: white;">${col.header}</th>`).join('');
    const rows = data.map(row => {
      const cells = columns.map(col => {
        const value = typeof col.accessor === 'function' 
          ? col.accessor(row) 
          : row[col.accessor];
        return `<td style="border: 1px solid #ddd; padding: 8px;">${value || ''}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    
    // Create HTML document
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Print'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              text-align: left;
              border: 1px solid #ddd;
              padding: 8px;
            }
            th {
              background-color: #4f46e5;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${title ? `<h1>${title}</h1>` : ''}
          <table>
            <thead>
              <tr>${headers}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing:', error);
    throw new Error('Failed to print');
  }
};
