import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Room {
  name: string;
  floor_level: string | null;
  space_tag: string | null;
  room_type: string | null;
  floor_finish: string | null;
  flooring_size: string | null;
  flooring_finish: string | null;
  flooring_code: string | null;
  flooring_make: string | null;
  flooring_rate: string | null;
  skirting: string | null;
  skirting_code: string | null;
  skirting_make: string | null;
  skirting_rate: string | null;
  ceiling_finish: string | null;
  ceiling_material_2: string | null;
  ceiling_size: string | null;
  ceiling_code: string | null;
  ceiling_make: string | null;
  ceiling_rate: string | null;
  remark: string | null;
  area: number | null;
  area_unit: string | null;
  wall_finish: string | null;
  ceiling_height: number | null;
  paint_color: string | null;
  dado: string | null;
  notes: string | null;
}

const groupHeaders = [
  "", "", "", "",
  "FLOORING", "", "", "", "", "",
  "SKIRTING", "", "", "",
  "CEILING", "", "", "", "", "",
  "",
];

const subHeaders = [
  "Sr.No", "Floor", "Space Description", "Space/Room Tag",
  "Material", "Size", "Finish", "Code No", "Make", "Basic Rate",
  "Material", "Code No", "Make", "Basic Rate",
  "Material 1", "Material 2", "Size", "Code No", "Make", "Basic Rate",
  "Remark",
];

function roomToRow(room: Room, idx: number) {
  return [
    idx + 1,
    room.floor_level ?? "",
    room.name,
    room.space_tag ?? "",
    room.floor_finish ?? "",
    room.flooring_size ?? "",
    room.flooring_finish ?? "",
    room.flooring_code ?? "",
    room.flooring_make ?? "",
    room.flooring_rate ?? "",
    room.skirting ?? "",
    room.skirting_code ?? "",
    room.skirting_make ?? "",
    room.skirting_rate ?? "",
    room.ceiling_finish ?? "",
    room.ceiling_material_2 ?? "",
    room.ceiling_size ?? "",
    room.ceiling_code ?? "",
    room.ceiling_make ?? "",
    room.ceiling_rate ?? "",
    room.remark ?? "",
  ];
}

export function exportToExcel(rooms: Room[], projectName: string) {
  const data = [
    [projectName],
    ["SCHEDULE OF FINISHES"],
    groupHeaders,
    subHeaders,
    ...rooms.map((r, i) => roomToRow(r, i)),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merge group header cells
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } }, // Project name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 20 } }, // Schedule title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },  // Empty group
    { s: { r: 2, c: 4 }, e: { r: 2, c: 9 } },  // FLOORING
    { s: { r: 2, c: 10 }, e: { r: 2, c: 13 } }, // SKIRTING
    { s: { r: 2, c: 14 }, e: { r: 2, c: 19 } }, // CEILING
  ];

  ws["!cols"] = subHeaders.map((h) => ({
    wch: h === "Sr.No" ? 6 : h === "Space Description" ? 22 : 14,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Schedule of Finishes");
  XLSX.writeFile(wb, `${projectName}_Schedule_of_Finishes.xlsx`);
}

export function exportToPDF(rooms: Room[], projectName: string) {
  const doc = new jsPDF({ orientation: "landscape", format: "a3" });

  doc.setFontSize(16);
  doc.text(projectName, 14, 15);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("SCHEDULE OF FINISHES", 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [groupHeaders, subHeaders],
    body: rooms.map((r, i) => roomToRow(r, i)),
    styles: { fontSize: 6, cellPadding: 2 },
    headStyles: {
      fillColor: [37, 99, 175],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 30 },
    },
  });

  doc.save(`${projectName}_Schedule_of_Finishes.pdf`);
}

export interface FloorGroup {
  floorName: string;
  rooms: Room[];
}

export function exportProjectToExcel(groups: FloorGroup[], projectName: string) {
  const data: any[][] = [[projectName], ["SCHEDULE OF FINISHES — COMPLETE PROJECT"]];
  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 20 } },
  ];

  groups.forEach((group) => {
    data.push([]);
    data.push([group.floorName]);
    merges.push({ s: { r: data.length - 1, c: 0 }, e: { r: data.length - 1, c: 20 } });

    data.push(groupHeaders);
    const gr = data.length - 1;
    merges.push(
      { s: { r: gr, c: 0 }, e: { r: gr, c: 3 } },
      { s: { r: gr, c: 4 }, e: { r: gr, c: 9 } },
      { s: { r: gr, c: 10 }, e: { r: gr, c: 13 } },
      { s: { r: gr, c: 14 }, e: { r: gr, c: 19 } }
    );
    data.push(subHeaders);
    group.rooms.forEach((r, i) => data.push(roomToRow(r, i)));
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;
  ws["!cols"] = subHeaders.map((h) => ({
    wch: h === "Sr.No" ? 6 : h === "Space Description" ? 22 : 14,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Project Schedule");
  XLSX.writeFile(wb, `${projectName}_Project_Schedule_of_Finishes.xlsx`);
}

export function exportProjectToPDF(groups: FloorGroup[], projectName: string) {
  const doc = new jsPDF({ orientation: "landscape", format: "a3" });

  doc.setFontSize(16);
  doc.text(projectName, 14, 15);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("SCHEDULE OF FINISHES — COMPLETE PROJECT", 14, 22);

  let cursorY = 28;
  groups.forEach((group, idx) => {
    if (idx > 0) cursorY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text(group.floorName, 14, cursorY);

    autoTable(doc, {
      startY: cursorY + 4,
      head: [groupHeaders, subHeaders],
      body: group.rooms.map((r, i) => roomToRow(r, i)),
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: {
        fillColor: [37, 99, 175],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30 } },
    });
  });

  doc.save(`${projectName}_Project_Schedule_of_Finishes.pdf`);
}
