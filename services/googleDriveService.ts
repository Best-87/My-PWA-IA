
// Aislamiento de tipos para evitar colisión con el SDK de Google GenAI
interface GoogleDriveWindow extends Window {
    google: any;
    gapi: any;
}

declare const window: GoogleDriveWindow;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const FILE_NAME = 'conferente_pro_backup.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Initialize the Google Identity Services client
export const initGoogleDrive = (clientId: string, callback: (inited: boolean) => void) => {
    if (!clientId) {
        console.warn("No Client ID provided");
        return;
    }

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
        window.gapi.load('client', async () => {
            await window.gapi.client.init({
                apiKey: '', 
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            if (gisInited) callback(true);
        });
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: '', 
        });
        gisInited = true;
        if (gapiInited) callback(true);
    };
    document.body.appendChild(gisScript);
};

export const handleAuthClick = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject("Google Client not initialized");
            return;
        }

        tokenClient.callback = async (resp: any) => {
            if (resp.error) {
                reject(resp);
            }
            resolve();
        };

        const token = window.gapi.client.getToken();
        if (token === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

export const uploadBackupToDrive = async (content: string): Promise<void> => {
    try {
        await handleAuthClick();
        const q = `name = '${FILE_NAME}' and trashed = false`;
        const listResponse = await window.gapi.client.drive.files.list({
            q: q,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        const files = listResponse.result.files;
        const fileId = files && files.length > 0 ? files[0].id : null;
        const accessToken = window.gapi.client.getToken().access_token;

        if (fileId) {
            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: content
            });
            if (!response.ok) throw new Error("Update failed");
        } else {
            const metadata = { name: FILE_NAME, mimeType: 'application/json' };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([content], { type: 'application/json' }));

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form
            });
            if (!response.ok) throw new Error("Create failed");
        }
    } catch (err) {
        console.error("Drive Upload Error", err);
        throw err;
    }
};

export const restoreBackupFromDrive = async (): Promise<string | null> => {
    try {
        await handleAuthClick();
        const q = `name = '${FILE_NAME}' and trashed = false`;
        const listResponse = await window.gapi.client.drive.files.list({
            q: q,
            fields: 'files(id, name)',
        });
        const files = listResponse.result.files;
        if (!files || files.length === 0) return null;
        const fileId = files[0].id;
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return JSON.stringify(response.result);
    } catch (err) {
        console.error("Drive Restore Error", err);
        throw err;
    }
};
