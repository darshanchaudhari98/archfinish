import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Room {
  name: string;
  room_type: string | null;
  area: number | null;
  area_unit: string | null;
  wall_finish: string | null;
  floor_finish: string | null;
  ceiling_finish: string | null;
  ceiling_height: number | null;
  skirting: string | null;
  dado: string | null;
  paint_color: string | null;
  notes: string | null;
}

const headers = [
  "Room Name",
  "Type",
  "Area",
  "Wall Finish",
  "Floor Finish",
  "Ceiling Finish",
  "Ceiling Height",
  "Skirting",
  "Dado",
  "Paint Color",
  "Notes",
];

function roomToRow(room: Room) {
  return [
    room.name,
    room.room_type ?? "",
    room.area ? `${room.area} ${room.area_unit ?? ""}` : "",
    room.wall_finish ?? "",
    room.floor_finish ?? "",
    room.ceiling_finish ?? "",
    room.ceiling_height ? `${room.ceiling_height} m` : "",
    room.skirting ?? "",
    room.dado ?? "",
    room.paint_color ?? "",
    room.notes ?? "",
  ];
}

export function exportToExcel(rooms: Room[], projectName: string) {
  const data = [headers, ...rooms.map(roomToRow)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Schedule of Finishes");

  // Style column widths
  ws["!cols"] = headers.map(() => ({ wch: 18 }));

  XLSX.writeFile(wb, `${projectName}_Schedule_of_Finishes.xlsx`);
}

export function exportToPDF(rooms: Room[], projectName: string) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text(`Schedule of Finishes`, 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(projectName, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: rooms.map(roomToRow),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [37, 99, 175],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${projectName}_Schedule_of_Finishes.pdf`);
}
