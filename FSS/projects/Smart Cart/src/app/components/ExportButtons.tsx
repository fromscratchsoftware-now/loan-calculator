import { FileSpreadsheet, FileText, Printer, Download } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF, printData, ExportOptions } from "../utils/exportUtils";
import { toast } from "sonner";

interface ExportButtonsProps {
  exportOptions: ExportOptions;
  className?: string;
}

export function ExportButtons({ exportOptions, className = "" }: ExportButtonsProps) {
  const handleExport = async (type: 'excel' | 'csv' | 'pdf' | 'print') => {
    try {
      switch (type) {
        case 'excel':
          exportToExcel(exportOptions);
          toast.success('Excel file downloaded successfully');
          break;
        case 'csv':
          exportToCSV(exportOptions);
          toast.success('CSV file downloaded successfully');
          break;
        case 'pdf':
          exportToPDF(exportOptions);
          toast.success('PDF file downloaded successfully');
          break;
        case 'print':
          printData(exportOptions);
          break;
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
      toast.error(`Failed to export ${type.toUpperCase()}`);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => handleExport('excel')}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
        title="Export to Excel"
      >
        <FileSpreadsheet className="w-4 h-4 text-green-600" />
        Excel
      </button>
      <button
        onClick={() => handleExport('csv')}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
        title="Export to CSV"
      >
        <Download className="w-4 h-4 text-blue-600" />
        CSV
      </button>
      <button
        onClick={() => handleExport('pdf')}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
        title="Export to PDF"
      >
        <FileText className="w-4 h-4 text-red-600" />
        PDF
      </button>
      <button
        onClick={() => handleExport('print')}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
        title="Print"
      >
        <Printer className="w-4 h-4 text-gray-600" />
        Print
      </button>
    </div>
  );
}
