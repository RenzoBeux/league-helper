/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';
import unhandled from 'electron-unhandled';

import {
    authenticate,
    request,
    connect,
    LeagueClient,
    Credentials,
} from 'league-connect';
import Role from 'api/entities/Role';
import { FrontendMessage } from 'api/MessageTypes/FrontendMessage';
import { RawChampion } from 'api/entities/RawChampion';
import { Summoner } from 'api/entities/Summoner';
import Champion from 'api/entities/Champion';
import {
    ChampionsMessage,
    SummonerMessage,
} from 'api/MessageTypes/InitialMessage';
import {
    AUTOACCEPT_STATE,
    AUTOPICK_STATE,
    BANS,
    PICKS,
    RAWCHAPIONS,
    ROLE,
    SUMMONER,
} from '../common/constants';
import LoLApi from '../api/LolApi';
import { resolveHtmlPath } from './util';

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

let API: LoLApi;

export default class AppUpdater {
    constructor() {
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.checkForUpdatesAndNotify();
    }
}
const store = new Store();

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}

const isDebug =
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
    require('electron-debug')();
}

unhandled({
    logger: () => {
        console.error();
    },
    showDialog: true,
    reportButton: () => {
        console.log('Report Button Initialized');
    },
});

const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS'];

    return installer
        .default(
            extensions.map((name) => installer[name]),
            forceDownload
        )
        .catch(console.log);
};

async function getLolSummonerAsync(
    credentials: Credentials
): Promise<Summoner> {
    const summonerReq = await request(
        {
            method: 'GET',
            url: '/lol-summoner/v1/current-summoner',
        },
        credentials
    );
    // if request fails, retry after sleeping 5 seconds
    if (summonerReq.status !== 200) {
        await sleep(1000);
        const sum = await getLolSummonerAsync(credentials);
        return sum;
    }
    return (await summonerReq.json()) as Summoner;
}

async function getLolChampionsAsync(
    summoner: Summoner,
    credentials: Credentials
): Promise<RawChampion[]> {
    const championsReq = await request(
        {
            method: 'GET',
            url: `/lol-champions/v1/inventories/${summoner.summonerId}/champions`,
        },
        credentials
    );
    // if request fails, retry after sleeping 5 seconds
    if (championsReq.status !== 200) {
        await sleep(1000);
        const res = await getLolChampionsAsync(summoner, credentials);
        return res;
    }
    return (await championsReq.json()) as RawChampion[];
}

async function startLoLApi() {
    try {
        const credentials = await authenticate({ awaitConnection: true });
        console.log(credentials);
        await sleep(5000);
        const client = new LeagueClient(credentials);

        const summonerReq = await request(
            {
                method: 'GET',
                url: '/lol-summoner/v1/current-summoner',
            },
            credentials
        );
        let summoner: Summoner;
        if (summonerReq.status === 200) {
            summoner = await summonerReq.json();
        } else {
            await sleep(1000);
            summoner = await getLolSummonerAsync(credentials);
        }

        const championsReq = await request(
            {
                method: 'GET',
                url: `/lol-champions/v1/inventories/${summoner.summonerId}/champions`,
            },
            credentials
        );
        let champions: RawChampion[] = ((await store.get(RAWCHAPIONS)) ||
            []) as RawChampion[];
        if (championsReq.status === 200) {
            champions = await championsReq.json();
            store.set(RAWCHAPIONS, champions);
        } else {
            await sleep(10000);
            champions = await getLolChampionsAsync(summoner, credentials);
        }

        const bans: Champion[] = (await store.get(BANS)) as Champion[];
        const picks: Champion[] = (await store.get(PICKS)) as Champion[];
        const role: Role = (await store.get(ROLE)) as Role;

        const sendFunction = (eventName: string, message: FrontendMessage) => {
            mainWindow?.webContents.send(eventName, message);
        };

        API = new LoLApi(
            credentials,
            summoner,
            bans,
            picks,
            role,
            champions,
            sendFunction
        );

        const summonerSend: SummonerMessage = {
            success: true,
            summoner,
        };
        const championsSend: ChampionsMessage = {
            success: champions.length !== 0,
            champions,
        };

        // Basically we send connect because we found the LoLClient
        // Then we send Summoner and Champions separately
        mainWindow?.webContents.send('connect', {});
        mainWindow?.webContents.send(SUMMONER, summonerSend);
        mainWindow?.webContents.send(RAWCHAPIONS, championsSend);

        const ws = await connect(credentials);

        ws.on('message', (message) => {
            if (typeof message === 'string') {
                API.handleWebSocket(message);
            }
        });

        client.on('connect', () => {
            // newCredentials: Each time the Client is started, new credentials are made
            // this variable contains the new credentials.
            mainWindow?.webContents.send('connect', {});
            console.log('RECONECTADOOO');
        });

        client.on('disconnect', () => {
            mainWindow?.webContents.send('disconnect', {});
            console.log('disconnected');
        });

        client.start(); // Start listening for process updates
    } catch (error) {
        console.error(error);
        // re try startLoLApi after 5 seconds
        console.log('retying to start LoLApi');
        await sleep(5000);
        return startLoLApi();
    }
}

const createWindow = async () => {
    if (isDebug) {
        await installExtensions();
    }

    const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
        return path.join(RESOURCES_PATH, ...paths);
    };

    mainWindow = new BrowserWindow({
        show: false,
        width: 1280,
        height: 720,
        minHeight: 576,
        minWidth: 1024,
        icon: getAssetPath('icon.png'),
        webPreferences: {
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
        },
    });

    mainWindow.loadURL(resolveHtmlPath('index.html'));

    mainWindow.on('ready-to-show', async () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }

        // I want to show the windows before connection to league of legends is done
        // thats why the following code block is after this one
        if (process.env.START_MINIMIZED) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
        }
        await startLoLApi();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open urls in the user's browser
    mainWindow.webContents.setWindowOpenHandler((edata) => {
        shell.openExternal(edata.url);
        return { action: 'deny' };
    });

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.whenReady()
    .then(() => {
        createWindow();
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (mainWindow === null) createWindow();
        });
    })
    .catch(console.log);

ipcMain.on('electron-store-get', async (event, val) => {
    event.returnValue = store.get(val);
});
ipcMain.on('electron-store-set', async (_event, key, val) => {
    if (API) {
        switch (key) {
            case BANS:
                API.setBans(val);
                break;
            case PICKS:
                API.setPicks(val);
                break;
            case AUTOPICK_STATE:
                API.switchAutoPick(val);
                break;
            case AUTOACCEPT_STATE:
                API.switchAutoAccept(val);
                break;
            default:
                break;
        }
    }
    store.set(key, val);
});
ipcMain.on('electron-store-clear', async () => {
    store.clear();
    console.log('CLEARED');
});
