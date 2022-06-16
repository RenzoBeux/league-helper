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

import { authenticate, request, connect, LeagueClient } from 'league-connect';
import Champion from 'api/entities/Champion';
import Role from 'api/entities/Role';
import { FrontendMessage } from 'api/MessageTypes/FrontendMessage';
import { RawChampion } from 'api/entities/RawChampion';
import { Summoner } from 'api/entities/Summoner';
import {
    AUTOACCEPT_STATE,
    AUTOPICK_STATE,
    BANS,
    PICKS,
    ROLE,
} from '../common/constants';
import LoLApi from '../api/LolApi';
import { resolveHtmlPath } from './util';
import MenuBuilder from './menu';

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
    reportButton: (error) => {
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

        const credentials = await authenticate({ awaitConnection: true });
        console.log(credentials);
        await sleep(10000);
        const client = new LeagueClient(credentials);
        const ws = await connect(credentials);

        const summoner: Summoner = await (
            await request(
                {
                    method: 'GET',
                    url: '/lol-summoner/v1/current-summoner',
                },
                credentials
            )
        ).json();

        const championsReq = await request(
            {
                method: 'GET',
                url: `/lol-champions/v1/inventories/${summoner.summonerId}/champions`,
            },
            credentials
        );
        let champions: RawChampion[] = [];
        if (championsReq.status === 200) {
            champions = await championsReq.json();
        } else {
            setTimeout(async () => {
                const res = await (
                    await request(
                        {
                            method: 'GET',
                            url: `/lol-champions/v1/inventories/${summoner.summonerId}/champions`,
                        },
                        credentials
                    )
                ).json();
                champions = res;
            }, 10000);
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

        const dataSend = {
            sucess: true,
            message: {
                summoner,
                champions,
            },
        };
        mainWindow.webContents.send('connect', dataSend);

        ws.on('message', (message) => {
            if (typeof message === 'string') {
                API.handleWebSocket(message);
            }
        });

        client.on('connect', (newCredentials) => {
            // newCredentials: Each time the Client is started, new credentials are made
            // this variable contains the new credentials.
            console.log('RECONECTADOOO');
        });

        client.on('disconnect', () => {
            console.log('disconnected');
        });

        client.start(); // Start listening for process updates
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMenu();

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
ipcMain.on('electron-store-set', async (event, key, val) => {
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
ipcMain.on('electron-store-clear', async (event) => {
    store.clear();
    console.log('CLEARED');
});
