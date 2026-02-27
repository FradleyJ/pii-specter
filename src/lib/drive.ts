import { google } from "googleapis";

type AuthClient = InstanceType<typeof google.auth.OAuth2>;

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  ownerEmail?: string;
  ownerName?: string;
  sharedBy?: string[];
  lastModifiedBy?: string;
};

const DOC_MIME = "application/vnd.google-apps.document";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

export async function listRecentFiles(
  auth: AuthClient,
  maxResults = 15
): Promise<DriveFile[]> {
  const drive = google.drive({ version: "v3", auth });

  const { data } = await drive.files.list({
    q: `(mimeType='${DOC_MIME}' or mimeType='${SHEET_MIME}') and trashed=false`,
    orderBy: "modifiedTime desc",
    pageSize: maxResults,
    fields: "files(id,name,mimeType,modifiedTime,owners,sharingUser,lastModifyingUser)",
  });

  return (data.files || []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    modifiedTime: f.modifiedTime!,
    ownerEmail: f.owners?.[0]?.emailAddress || undefined,
    ownerName: f.owners?.[0]?.displayName || undefined,
    sharedBy: f.sharingUser?.emailAddress ? [f.sharingUser.emailAddress] : undefined,
    lastModifiedBy: f.lastModifyingUser?.emailAddress || undefined,
  }));
}

export async function getDocContent(
  auth: AuthClient,
  docId: string
): Promise<{ text: string; elements: DocElement[] }> {
  const docs = google.docs({ version: "v1", auth });
  const { data } = await docs.documents.get({ documentId: docId });

  const elements: DocElement[] = [];
  let fullText = "";

  if (data.body?.content) {
    for (const element of data.body.content) {
      if (element.paragraph?.elements) {
        for (const el of element.paragraph.elements) {
          if (el.textRun?.content) {
            fullText += el.textRun.content;
            elements.push({
              startIndex: el.startIndex || 0,
              endIndex: el.endIndex || 0,
              text: el.textRun.content,
            });
          }
        }
      }
    }
  }

  return { text: fullText, elements };
}

export type DocElement = {
  startIndex: number;
  endIndex: number;
  text: string;
};

export async function getSheetContent(
  auth: AuthClient,
  spreadsheetId: string
): Promise<{ text: string; cells: SheetCell[] }> {
  const sheets = google.sheets({ version: "v4", auth });

  // Get all sheet names first
  const { data: meta } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const sheetNames = meta.sheets?.map((s) => s.properties?.title || "Sheet1") || ["Sheet1"];
  const cells: SheetCell[] = [];
  let fullText = "";

  for (const sheetName of sheetNames) {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    if (data.values) {
      for (let row = 0; row < data.values.length; row++) {
        for (let col = 0; col < data.values[row].length; col++) {
          const value = String(data.values[row][col] || "");
          if (value.trim()) {
            const cellRef = `${String.fromCharCode(65 + col)}${row + 1}`;
            fullText += value + " ";
            cells.push({
              sheet: sheetName,
              cell: cellRef,
              row,
              col,
              value,
            });
          }
        }
      }
    }
  }

  return { text: fullText, cells };
}

export type SheetCell = {
  sheet: string;
  cell: string;
  row: number;
  col: number;
  value: string;
};
